import firebase_admin
from firebase_admin import credentials, firestore
import os

# Charger les credentials Firebase (fichier JSON du service account)
# Tu peux le telecharger depuis : Firebase Console > Parametres > Comptes de service > Generer une cle
cred_path = os.environ.get('FIREBASE_CREDENTIALS', 'firebase-credentials.json')
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

# Reference Firestore
db = firestore.client()
