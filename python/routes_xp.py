import random
from flask import Blueprint, request, jsonify
from firebase_admin import firestore as fs
from firebase_init import db
from auth import require_auth
from rate_limiter import rate_limit
from validators import (
    XP_VICTOIRE_MIN, XP_VICTOIRE_MAX,
    XP_DEFAITE_MIN, XP_DEFAITE_MAX,
    XP_PAR_KILL, GOLD_PAR_NIVEAU, calculer_niveau
)

xp_bp = Blueprint('xp', __name__)

# Parties deja comptees (evite de donner l XP 2 fois)
counted_games = {}


@xp_bp.route('/api/xp/end-game', methods=['POST'])
@require_auth
@rate_limit
def end_game_xp():
    """Donne l'XP de fin de partie. Le serveur decide du montant aleatoire."""
    data = request.get_json() or {}
    party_id = data.get('partyId', '')
    won = data.get('won', False)
    player_id = request.player_id

    if not party_id:
        return jsonify({'error': 'partyId requis'}), 400

    # Eviter le double comptage
    game_key = player_id + '_' + party_id
    if game_key in counted_games:
        return jsonify({'error': 'XP deja donne pour cette partie'}), 400
    counted_games[game_key] = True

    # Calculer l XP aleatoire (cote serveur = pas de triche)
    if won:
        xp_gagne = random.randint(XP_VICTOIRE_MIN, XP_VICTOIRE_MAX)
    else:
        xp_gagne = random.randint(XP_DEFAITE_MIN, XP_DEFAITE_MAX)

    # Lire l XP actuel
    player_doc = db.collection('players').document(player_id).get()
    if not player_doc.exists:
        return jsonify({'error': 'Joueur introuvable'}), 404

    player_data = player_doc.to_dict()
    ancien_xp = player_data.get('xp', 0)
    ancien_niveau = calculer_niveau(ancien_xp)['niveau']

    nouveau_xp = ancien_xp + xp_gagne
    nouveau_niveau = calculer_niveau(nouveau_xp)['niveau']
    niveaux_gagnes = nouveau_niveau - ancien_niveau

    # Mettre a jour Firestore
    update_data = {'xp': nouveau_xp}
    gold_bonus = 0

    if niveaux_gagnes > 0:
        update_data['level'] = nouveau_niveau
        gold_bonus = niveaux_gagnes * GOLD_PAR_NIVEAU
        update_data['gold'] = fs.firestore.Increment(gold_bonus)

    db.collection('players').document(player_id).update(update_data)

    return jsonify({
        'xpGagne': xp_gagne,
        'xpTotal': nouveau_xp,
        'niveau': nouveau_niveau,
        'niveauxGagnes': niveaux_gagnes,
        'goldBonus': gold_bonus
    })


@xp_bp.route('/api/xp/kill', methods=['POST'])
@require_auth
@rate_limit
def kill_xp():
    """Donne 5 XP pour un kill."""
    data = request.get_json() or {}
    party_id = data.get('partyId', '')
    player_id = request.player_id

    if not party_id:
        return jsonify({'error': 'partyId requis'}), 400

    # Lire l XP actuel
    player_doc = db.collection('players').document(player_id).get()
    if not player_doc.exists:
        return jsonify({'error': 'Joueur introuvable'}), 404

    player_data = player_doc.to_dict()
    ancien_xp = player_data.get('xp', 0)
    ancien_niveau = calculer_niveau(ancien_xp)['niveau']

    nouveau_xp = ancien_xp + XP_PAR_KILL
    nouveau_niveau = calculer_niveau(nouveau_xp)['niveau']
    niveaux_gagnes = nouveau_niveau - ancien_niveau

    update_data = {'xp': nouveau_xp}
    gold_bonus = 0

    if niveaux_gagnes > 0:
        update_data['level'] = nouveau_niveau
        gold_bonus = niveaux_gagnes * GOLD_PAR_NIVEAU
        update_data['gold'] = fs.firestore.Increment(gold_bonus)

    db.collection('players').document(player_id).update(update_data)

    return jsonify({
        'xpGagne': XP_PAR_KILL,
        'xpTotal': nouveau_xp,
        'niveau': nouveau_niveau,
        'goldBonus': gold_bonus
    })
