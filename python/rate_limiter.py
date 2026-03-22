from flask import request, jsonify
from functools import wraps
import time

# Historique des requetes : { playerId: [timestamp1, timestamp2, ...] }
request_history = {}

# Limite : 30 requetes par minute par joueur
MAX_REQUESTS = 30
WINDOW = 60  # secondes


def rate_limit(f):
    """Decorateur : limite le nombre de requetes par joueur."""
    @wraps(f)
    def decorated(*args, **kwargs):
        player_id = getattr(request, 'player_id', None)
        if not player_id:
            return f(*args, **kwargs)

        now = time.time()

        if player_id not in request_history:
            request_history[player_id] = []

        # Garder seulement les requetes recentes
        request_history[player_id] = [
            t for t in request_history[player_id] if now - t < WINDOW
        ]

        if len(request_history[player_id]) >= MAX_REQUESTS:
            return jsonify({'error': 'Trop de requetes, attends un peu'}), 429

        request_history[player_id].append(now)
        return f(*args, **kwargs)
    return decorated
