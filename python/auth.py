from flask import Blueprint, request, jsonify
from functools import wraps
import secrets
import time
from firebase_init import db

auth_bp = Blueprint('auth', __name__)

# Tokens en memoire : { token: { playerId, expires } }
active_tokens = {}

# Duree de vie d'un token : 24 heures
TOKEN_DURATION = 24 * 60 * 60


def generate_token(player_id):
    """Genere un token de session pour un joueur."""
    token = secrets.token_hex(32)
    active_tokens[token] = {
        'playerId': player_id,
        'expires': time.time() + TOKEN_DURATION
    }
    return token


def verify_token(token):
    """Verifie un token et retourne le playerId, ou None si invalide."""
    if not token or token not in active_tokens:
        return None
    data = active_tokens[token]
    if time.time() > data['expires']:
        del active_tokens[token]
        return None
    return data['playerId']


def require_auth(f):
    """Decorateur : verifie que la requete a un token valide."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token manquant'}), 401
        token = auth_header[7:]
        player_id = verify_token(token)
        if not player_id:
            return jsonify({'error': 'Token invalide ou expire'}), 401
        request.player_id = player_id
        return f(*args, **kwargs)
    return decorated


# Nettoyage des tokens expires (appele periodiquement)
def cleanup_tokens():
    """Supprime les tokens expires."""
    now = time.time()
    expired = [t for t, d in active_tokens.items() if now > d['expires']]
    for t in expired:
        del active_tokens[t]


@auth_bp.route('/api/login', methods=['POST'])
def login():
    """Connexion : verifie le playerId + pin, retourne un token."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Donnees manquantes'}), 400

    player_id = data.get('playerId', '')
    pin = data.get('pin', '')

    if not player_id or not pin:
        return jsonify({'error': 'playerId et pin requis'}), 400

    # Verifier dans Firestore
    doc = db.collection('players').document(player_id).get()
    if not doc.exists:
        return jsonify({'error': 'Joueur introuvable'}), 404

    player_data = doc.to_dict()
    stored_pin = player_data.get('pin', '')

    if str(pin) != str(stored_pin):
        return jsonify({'error': 'PIN incorrect'}), 403

    # Generer le token
    token = generate_token(player_id)

    # Nettoyer les vieux tokens
    cleanup_tokens()

    return jsonify({
        'token': token,
        'playerId': player_id,
        'pseudo': player_data.get('pseudo', '')
    })
