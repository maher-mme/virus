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

// Passer hors ligne quand on ferme la page
window.addEventListener('beforeunload', function() {
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ online: false }).catch(function() {});
  }
});

