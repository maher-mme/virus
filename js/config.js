// ============================
// FIREBASE - Configuration
// ============================
var firebaseConfig = {
  apiKey: "AIzaSyBLx-vbu9YSKpdXYpqvR4CFXeI2pUkGobo",
  authDomain: "virus-game-12537.firebaseapp.com",
  projectId: "virus-game-12537",
  storageBucket: "virus-game-12537.firebasestorage.app",
  messagingSenderId: "267361291431",
  appId: "1:267361291431:web:09d09337f9986b133a1f82",
  measurementId: "G-1G9DRCF860"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// Identite persistante du joueur (UUID local)
var monPlayerId = localStorage.getItem('virus_player_id');
if (!monPlayerId) {
  monPlayerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('virus_player_id', monPlayerId);
}

var mesAmis = [];
var demandesEnAttente = [];
var panelAmisOuvert = false;
var tabAmiActif = 'en-ligne';
var amisStatuts = {};
var ancienNbDemandes = 0;
var invitationsAffichees = {};

// Listeners Firestore actifs
var firebaseUnsubscribers = [];
var gameUnsubscribers = [];
var remotePlayers = {};
var lastPositionSend = 0;
var lastSaPositionSend = 0;
var myPartyPlayerDocId = null;

// Heartbeat toutes les 30 secondes
setInterval(function() {
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).set({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true
    }, { merge: true }).catch(function() {});
  }
}, 30000);

// Heartbeat partyPlayer : mise a jour lastActive toutes les 10s
setInterval(function() {
  if (myPartyPlayerDocId && partieActuelleId) {
    db.collection('partyPlayers').doc(myPartyPlayerDocId).update({
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function() {});
  }
}, 10000);

// Host : verifier les joueurs deconnectes toutes les 15s
setInterval(function() {
  if (!estHost || !partieActuelleId) return;
  var seuil = new Date(Date.now() - 35000); // 35 secondes sans signal
  db.collection('partyPlayers').where('partyId', '==', partieActuelleId).get().then(function(snap) {
    snap.forEach(function(doc) {
      var data = doc.data();
      if (data.playerId === monPlayerId) return;
      var lastActive = data.lastActive ? data.lastActive.toDate() : null;
      if (lastActive && lastActive < seuil) {
        // Joueur deconnecte : le retirer
        var pseudo = data.pseudo;
        doc.ref.delete().catch(function() {});
        db.collection('parties').doc(partieActuelleId).update({
          joueurs: firebase.firestore.FieldValue.increment(-1),
          listeJoueurs: firebase.firestore.FieldValue.arrayRemove(pseudo)
        }).catch(function() {});
        // Si en jeu et vivant, creer un cadavre
        if (data.alive && lastGamePhase === 'playing') {
          db.collection('cadavres').add({
            partyId: partieActuelleId,
            victimPlayerId: data.playerId,
            victimPseudo: pseudo,
            victimSkin: data.skin || '',
            x: data.x || 0,
            y: data.y || 0,
            reported: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(function() {});
        }
      }
    });
  }).catch(function() {});
}, 15000);

// Quitter la partie silencieusement (fermeture page/app)
function quitterPartieSilencieux() {
  if (!partieActuelleId || !monPlayerId) return;
  var pseudo = getPseudo();
  if (myPartyPlayerDocId) {
    db.collection('partyPlayers').doc(myPartyPlayerDocId).delete().catch(function() {});
  }
  db.collection('parties').doc(partieActuelleId).update({
    joueurs: firebase.firestore.FieldValue.increment(-1),
    listeJoueurs: firebase.firestore.FieldValue.arrayRemove(pseudo)
  }).catch(function() {});
}

// Passer hors ligne et quitter quand on ferme la page
window.addEventListener('beforeunload', function() {
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ online: false }).catch(function() {});
  }
  quitterPartieSilencieux();
});

// Mobile : detecter quand l'app est fermee ou en arriere-plan
var visibilityTimeout = null;
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    if (monPlayerId) {
      db.collection('players').doc(monPlayerId).update({ online: false }).catch(function() {});
    }
    // Attendre 20s avant de quitter (laisser le temps de revenir)
    visibilityTimeout = setTimeout(function() {
      quitterPartieSilencieux();
    }, 20000);
  } else if (document.visibilityState === 'visible') {
    // Annuler le quit si le joueur revient
    if (visibilityTimeout) {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = null;
    }
    if (monPlayerId) {
      db.collection('players').doc(monPlayerId).update({
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function() {});
    }
    // Relancer le heartbeat
    if (myPartyPlayerDocId && partieActuelleId) {
      db.collection('partyPlayers').doc(myPartyPlayerDocId).update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function() {});
    }
  }
});

