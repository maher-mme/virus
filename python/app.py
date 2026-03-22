# ============================
# VIRUS - API MATCHMAKING (Python/Flask)
# ============================
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import uuid
import threading

app = Flask(__name__)
CORS(app)

# ============================
# FILE D'ATTENTE DE MATCHMAKING
# ============================
# Chaque joueur dans la file : { playerId, pseudo, level, skin, timestamp }
matchmaking_queue = []
# Parties creees par le matchmaking : { matchId: { joueurs, createdAt, status } }
matches = {}
# Verrou pour eviter les problemes de concurrence
lock = threading.Lock()

# Configuration
MATCH_MIN_JOUEURS = 4
MATCH_MAX_JOUEURS = 10
MATCH_TIMEOUT = 60  # secondes avant d'expirer de la file
MATCH_LEVEL_RANGE = 10  # ecart de niveau max pour matcher ensemble


def nettoyer_file():
    """Retirer les joueurs expires de la file d'attente."""
    now = time.time()
    with lock:
        expired = []
        for i, joueur in enumerate(matchmaking_queue):
            if now - joueur['timestamp'] > MATCH_TIMEOUT:
                expired.append(i)
        for i in reversed(expired):
            matchmaking_queue.pop(i)


def trouver_match():
    """Essayer de former un match avec les joueurs dans la file."""
    nettoyer_file()
    with lock:
        if len(matchmaking_queue) < MATCH_MIN_JOUEURS:
            return None

        # Trier par niveau pour matcher des joueurs proches
        file_triee = sorted(matchmaking_queue, key=lambda j: j.get('level', 1))

        # Chercher un groupe de joueurs avec des niveaux proches
        meilleur_groupe = []
        for i in range(len(file_triee)):
            groupe = [file_triee[i]]
            for j in range(i + 1, len(file_triee)):
                ecart = abs(file_triee[j].get('level', 1) - file_triee[i].get('level', 1))
                if ecart <= MATCH_LEVEL_RANGE:
                    groupe.append(file_triee[j])
                if len(groupe) >= MATCH_MAX_JOUEURS:
                    break
            if len(groupe) >= MATCH_MIN_JOUEURS and len(groupe) > len(meilleur_groupe):
                meilleur_groupe = groupe

        if len(meilleur_groupe) < MATCH_MIN_JOUEURS:
            return None

        # Limiter a MATCH_MAX_JOUEURS
        joueurs_match = meilleur_groupe[:MATCH_MAX_JOUEURS]

        # Retirer ces joueurs de la file
        ids_match = {j['playerId'] for j in joueurs_match}
        matchmaking_queue[:] = [j for j in matchmaking_queue if j['playerId'] not in ids_match]

        # Creer le match
        match_id = str(uuid.uuid4())[:8]
        match_data = {
            'matchId': match_id,
            'joueurs': [
                {
                    'playerId': j['playerId'],
                    'pseudo': j['pseudo'],
                    'level': j.get('level', 1),
                    'skin': j.get('skin', '')
                }
                for j in joueurs_match
            ],
            'createdAt': time.time(),
            'status': 'ready',
            'nbJoueurs': len(joueurs_match)
        }
        matches[match_id] = match_data
        return match_data


# ============================
# ROUTES API
# ============================

@app.route('/')
def accueil():
    """Page d'accueil de l'API."""
    return jsonify({
        'nom': 'VIRUS Matchmaking API',
        'version': '1.0',
        'routes': {
            '/matchmaking/rejoindre': 'POST - Rejoindre la file de matchmaking',
            '/matchmaking/statut': 'GET - Verifier le statut dans la file',
            '/matchmaking/quitter': 'POST - Quitter la file',
            '/matchmaking/info': 'GET - Infos sur la file d\'attente',
            '/match/<matchId>': 'GET - Details d\'un match'
        }
    })


@app.route('/matchmaking/rejoindre', methods=['POST'])
def rejoindre_file():
    """Ajouter un joueur a la file de matchmaking."""
    data = request.get_json()
    if not data:
        return jsonify({'erreur': 'Donnees manquantes'}), 400

    player_id = data.get('playerId', '')
    pseudo = data.get('pseudo', '')
    level = data.get('level', 1)
    skin = data.get('skin', '')

    if not player_id or not pseudo:
        return jsonify({'erreur': 'playerId et pseudo requis'}), 400

    if len(pseudo) > 20:
        return jsonify({'erreur': 'Pseudo trop long'}), 400

    with lock:
        # Verifier si le joueur est deja dans la file
        for joueur in matchmaking_queue:
            if joueur['playerId'] == player_id:
                joueur['timestamp'] = time.time()
                return jsonify({
                    'statut': 'deja_en_file',
                    'position': matchmaking_queue.index(joueur) + 1,
                    'enFile': len(matchmaking_queue)
                })

        # Ajouter a la file
        matchmaking_queue.append({
            'playerId': player_id,
            'pseudo': pseudo,
            'level': level,
            'skin': skin,
            'timestamp': time.time()
        })

    # Essayer de trouver un match
    match_data = trouver_match()
    if match_data:
        return jsonify({
            'statut': 'match_trouve',
            'match': match_data
        })

    with lock:
        position = next(
            (i + 1 for i, j in enumerate(matchmaking_queue) if j['playerId'] == player_id),
            0
        )

    return jsonify({
        'statut': 'en_attente',
        'position': position,
        'enFile': len(matchmaking_queue),
        'minimum': MATCH_MIN_JOUEURS
    })


@app.route('/matchmaking/statut', methods=['GET'])
def statut_file():
    """Verifier le statut d'un joueur dans la file."""
    player_id = request.args.get('playerId', '')
    if not player_id:
        return jsonify({'erreur': 'playerId requis'}), 400

    nettoyer_file()

    # Verifier si le joueur a un match
    for match_id, match_data in matches.items():
        for joueur in match_data['joueurs']:
            if joueur['playerId'] == player_id:
                return jsonify({
                    'statut': 'match_trouve',
                    'match': match_data
                })

    # Verifier si le joueur est dans la file
    with lock:
        for i, joueur in enumerate(matchmaking_queue):
            if joueur['playerId'] == player_id:
                # Essayer de trouver un match
                match_data = trouver_match()
                if match_data:
                    return jsonify({
                        'statut': 'match_trouve',
                        'match': match_data
                    })
                return jsonify({
                    'statut': 'en_attente',
                    'position': i + 1,
                    'enFile': len(matchmaking_queue),
                    'minimum': MATCH_MIN_JOUEURS
                })

    return jsonify({'statut': 'pas_en_file'})


@app.route('/matchmaking/quitter', methods=['POST'])
def quitter_file():
    """Retirer un joueur de la file de matchmaking."""
    data = request.get_json()
    if not data:
        return jsonify({'erreur': 'Donnees manquantes'}), 400

    player_id = data.get('playerId', '')
    if not player_id:
        return jsonify({'erreur': 'playerId requis'}), 400

    with lock:
        matchmaking_queue[:] = [
            j for j in matchmaking_queue if j['playerId'] != player_id
        ]

    return jsonify({'statut': 'quitte'})


@app.route('/matchmaking/info', methods=['GET'])
def info_file():
    """Informations sur la file d'attente."""
    nettoyer_file()
    return jsonify({
        'enFile': len(matchmaking_queue),
        'minimum': MATCH_MIN_JOUEURS,
        'maximum': MATCH_MAX_JOUEURS,
        'matchsActifs': len(matches),
        'timeout': MATCH_TIMEOUT
    })


@app.route('/match/<match_id>', methods=['GET'])
def details_match(match_id):
    """Details d'un match."""
    if match_id not in matches:
        return jsonify({'erreur': 'Match introuvable'}), 404
    return jsonify(matches[match_id])


# ============================
# NETTOYAGE AUTOMATIQUE
# ============================
def nettoyage_periodique():
    """Nettoyer les vieux matchs toutes les 5 minutes."""
    while True:
        time.sleep(300)
        now = time.time()
        with lock:
            vieux = [mid for mid, m in matches.items() if now - m['createdAt'] > 600]
            for mid in vieux:
                del matches[mid]


# Lancer le nettoyage en arriere-plan
thread_nettoyage = threading.Thread(target=nettoyage_periodique, daemon=True)
thread_nettoyage.start()


# ============================
# DEMARRAGE
# ============================
if __name__ == '__main__':
    print('=== VIRUS Matchmaking API ===')
    print('Serveur demarre sur http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
