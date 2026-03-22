from flask import Blueprint, request, jsonify
from firebase_admin import firestore as fs
from firebase_init import db
from auth import require_auth
from rate_limiter import rate_limit

stats_bp = Blueprint('stats', __name__)

# Parties deja comptees pour les stats
counted_stats = {}


@stats_bp.route('/api/stats/end-game', methods=['POST'])
@require_auth
@rate_limit
def end_game_stats():
    """Met a jour les stats de fin de partie (cote serveur)."""
    data = request.get_json() or {}
    party_id = data.get('partyId', '')
    won = data.get('won', False)
    died = data.get('died', False)
    kills = data.get('kills', 0)
    player_id = request.player_id

    if not party_id:
        return jsonify({'error': 'partyId requis'}), 400

    # Eviter le double comptage
    stat_key = player_id + '_' + party_id
    if stat_key in counted_stats:
        return jsonify({'error': 'Stats deja enregistrees pour cette partie'}), 400
    counted_stats[stat_key] = True

    # Valider les kills (max raisonnable)
    if kills < 0 or kills > 15:
        kills = 0

    # Mettre a jour Firestore
    update_data = {
        'gamesPlayed': fs.firestore.Increment(1)
    }

    if won:
        update_data['wins'] = fs.firestore.Increment(1)

    if died:
        update_data['deaths'] = fs.firestore.Increment(1)

    if kills > 0:
        update_data['kills'] = fs.firestore.Increment(kills)

    db.collection('players').document(player_id).update(update_data)

    return jsonify({'ok': True})
