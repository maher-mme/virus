from flask import Blueprint, request, jsonify
from firebase_admin import firestore as fs
from firebase_init import db
from auth import require_auth
from rate_limiter import rate_limit
from validators import GOLD_VICTOIRE, GOLD_PAR_NIVEAU, calculer_niveau

gold_bp = Blueprint('gold', __name__)

# Parties deja recompensees (evite de donner le gold 2 fois)
rewarded_parties = {}


@gold_bp.route('/api/gold/win-reward', methods=['POST'])
@require_auth
@rate_limit
def win_reward():
    """Donne 50 gold pour une victoire. Verifie que la partie existe."""
    data = request.get_json() or {}
    party_id = data.get('partyId', '')
    player_id = request.player_id

    if not party_id:
        return jsonify({'error': 'partyId requis'}), 400

    # Verifier que la partie existe
    party_doc = db.collection('parties').document(party_id).get()
    if not party_doc.exists:
        return jsonify({'error': 'Partie introuvable'}), 404

    # Verifier que le joueur n a pas deja recu la recompense pour cette partie
    reward_key = player_id + '_' + party_id
    if reward_key in rewarded_parties:
        return jsonify({'error': 'Recompense deja recue pour cette partie'}), 400
    rewarded_parties[reward_key] = True

    # Ajouter le gold dans Firestore
    db.collection('players').document(player_id).update({
        'gold': fs.firestore.Increment(GOLD_VICTOIRE)
    })

    # Lire le nouveau solde
    player_doc = db.collection('players').document(player_id).get()
    new_gold = player_doc.to_dict().get('gold', 0)

    return jsonify({
        'gold': new_gold,
        'gain': GOLD_VICTOIRE
    })


@gold_bp.route('/api/gold/spend', methods=['POST'])
@require_auth
@rate_limit
def spend_gold():
    """Acheter un item (skin, musique, pet). Verifie le solde."""
    data = request.get_json() or {}
    item_id = data.get('itemId', '')
    item_type = data.get('itemType', '')  # 'skin', 'musique', 'pet'
    prix = data.get('prix', 0)

    if not item_id or not item_type or prix <= 0:
        return jsonify({'error': 'Donnees invalides'}), 400

    player_id = request.player_id

    # Lire le gold actuel
    player_doc = db.collection('players').document(player_id).get()
    if not player_doc.exists:
        return jsonify({'error': 'Joueur introuvable'}), 404

    player_data = player_doc.to_dict()
    current_gold = player_data.get('gold', 0)

    if current_gold < prix:
        return jsonify({'error': 'Pas assez de gold'}), 400

    # Verifier que l item n est pas deja achete
    achetes_key = item_type + 'sAchetes'  # skinsAchetes, musiquesAchetees, petsAchetes
    items_achetes = player_data.get(achetes_key, [])
    if item_id in items_achetes:
        return jsonify({'error': 'Item deja achete'}), 400

    # Deduire le gold et ajouter l item
    db.collection('players').document(player_id).update({
        'gold': fs.firestore.Increment(-prix),
        achetes_key: fs.firestore.ArrayUnion([item_id])
    })

    return jsonify({
        'gold': current_gold - prix,
        'item': item_id
    })
