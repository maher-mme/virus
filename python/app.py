"""
API Anti-triche VIRUS
=====================
Ce serveur Flask valide les actions des joueurs (gold, XP, stats)
pour empecher la triche via la console du navigateur.

Pour lancer :
  1. pip install -r requirements.txt
  2. Place ton fichier firebase-credentials.json dans ce dossier
  3. python app.py

Le serveur demarre sur http://localhost:5000
"""

from flask import Flask
from flask_cors import CORS
from auth import auth_bp
from routes_gold import gold_bp
from routes_xp import xp_bp
from routes_stats import stats_bp

app = Flask(__name__)

# Autoriser les requetes depuis ton site GitHub Pages
# Remplace par ton URL exacte quand tu deploieras
CORS(app, origins=[
    'http://localhost:*',
    'http://127.0.0.1:*',
    'https://maher-mme.github.io'
])

# Enregistrer les routes
app.register_blueprint(auth_bp)
app.register_blueprint(gold_bp)
app.register_blueprint(xp_bp)
app.register_blueprint(stats_bp)


@app.route('/')
def index():
    return {'message': 'API Anti-triche VIRUS est en ligne !'}


if __name__ == '__main__':
    print('=== API Anti-triche VIRUS ===')
    print('Endpoints :')
    print('  POST /api/login          - Connexion (playerId + pin)')
    print('  POST /api/gold/win-reward - Recompense victoire (50 gold)')
    print('  POST /api/gold/spend      - Acheter un item')
    print('  POST /api/xp/end-game     - XP fin de partie')
    print('  POST /api/xp/kill         - XP pour un kill')
    print('  POST /api/stats/end-game  - Stats fin de partie')
    print('============================')
    app.run(debug=True, port=5000)
