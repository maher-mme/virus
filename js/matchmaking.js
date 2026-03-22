// ============================
// MATCHMAKING CLIENT
// ============================
var MATCHMAKING_API = 'https://virus-matchmaking.onrender.com';
// Pour tester en local : var MATCHMAKING_API = 'http://localhost:5000';
var matchmakingInterval = null;
var matchmakingActif = false;

function rejoindreMatchmaking() {
  var pseudo = getPseudo();
  if (!pseudo || !monPlayerId) {
    showNotif(t('mustLogin'), 'warn');
    return;
  }

  matchmakingActif = true;
  document.getElementById('popup-matchmaking').classList.add('visible');
  document.getElementById('matchmaking-statut').textContent = t('searchingPlayers');
  document.getElementById('matchmaking-info').textContent = '';

  // Recuperer le niveau du joueur
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    var level = 1;
    var skin = getSkinFichier(getSkin());
    if (doc.exists) {
      level = doc.data().level || 1;
    }

    // Envoyer la requete au serveur Python
    fetch(MATCHMAKING_API + '/matchmaking/rejoindre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: monPlayerId,
        pseudo: pseudo,
        level: level,
        skin: skin
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.statut === 'match_trouve') {
        matchTrouve(data.match);
      } else {
        majStatutMatchmaking(data);
        // Verifier toutes les 3 secondes
        matchmakingInterval = setInterval(verifierMatchmaking, 3000);
      }
    })
    .catch(function() {
      document.getElementById('matchmaking-statut').textContent = t('connectionError');
    });
  });
}

function verifierMatchmaking() {
  if (!matchmakingActif) return;

  fetch(MATCHMAKING_API + '/matchmaking/statut?playerId=' + monPlayerId)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.statut === 'match_trouve') {
        matchTrouve(data.match);
      } else if (data.statut === 'pas_en_file') {
        // On a ete retire de la file (timeout)
        quitterMatchmaking();
        showNotif(t('matchmakingTimeout'), 'warn');
      } else {
        majStatutMatchmaking(data);
      }
    })
    .catch(function() {});
}

function majStatutMatchmaking(data) {
  var statut = document.getElementById('matchmaking-statut');
  var info = document.getElementById('matchmaking-info');
  if (statut) statut.textContent = t('searchingPlayers');
  if (info) {
    info.textContent = t('matchmakingQueue', data.enFile || 0, data.minimum || 4);
  }
}

function matchTrouve(match) {
  if (matchmakingInterval) clearInterval(matchmakingInterval);
  matchmakingInterval = null;
  matchmakingActif = false;
  document.getElementById('popup-matchmaking').classList.remove('visible');
  showNotif(t('matchFound', match.nbJoueurs), 'success');

  // Creer une partie Firebase avec les joueurs du match
  creerPartieMatchmaking(match);
}

function creerPartieMatchmaking(match) {
  var pseudo = getPseudo();
  var skin = getSkinFichier(getSkin());
  var pet = typeof getPetEquipe === 'function' ? getPetEquipe() : '';

  // Le premier joueur de la liste est l'hote
  var estHote = (match.joueurs[0].playerId === monPlayerId);

  if (estHote) {
    // Creer la partie sur Firebase
    db.collection('players').doc(monPlayerId).set({
      playerId: monPlayerId, pseudo: pseudo, skin: skin,
      online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
      return db.collection('parties').add({
        nom: 'Match #' + match.matchId,
        hostPlayerId: monPlayerId,
        hostPseudo: pseudo,
        maxJoueurs: match.nbJoueurs,
        mechants: match.nbJoueurs >= 7 ? 2 : 1,
        journaliste: match.nbJoueurs >= 7 ? 1 : 0,
        fanatique: 0,
        espion: 0,
        langue: getLang(),
        couleur: COULEURS_PARTIES[Math.floor(Math.random() * COULEURS_PARTIES.length)],
        phase: 'lobby',
        joueurs: 1,
        listeJoueurs: [pseudo],
        matchmakingId: match.matchId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(function(docRef) {
      var partyId = docRef.id;
      return db.collection('partyPlayers').add({
        partyId: partyId, playerId: monPlayerId, pseudo: pseudo, skin: skin, pet: pet,
        isHost: true, role: '', alive: true, x: 0, y: 0, direction: 1, saX: 50, saY: 70, saDirection: 1,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function(ppDoc) {
        myPartyPlayerDocId = ppDoc.id;
        modeHorsLigne = false;
        estHost = true;
        partieActuelleId = partyId;
        showScreen('salle-attente');
        subscribeToParty(partyId);
      });
    }).catch(function(err) {
      showNotif(t('connectionError'), 'error');
    });
  } else {
    // Les autres joueurs cherchent la partie creee par l'hote
    // Attendre que l'hote cree la partie puis la rejoindre
    var tentatives = 0;
    var recherchePartie = setInterval(function() {
      tentatives++;
      if (tentatives > 20) {
        clearInterval(recherchePartie);
        showNotif(t('connectionError'), 'error');
        return;
      }
      db.collection('parties')
        .where('matchmakingId', '==', match.matchId)
        .limit(1)
        .get()
        .then(function(snap) {
          if (!snap.empty) {
            clearInterval(recherchePartie);
            var partieDoc = snap.docs[0];
            rejoindrePartie(partieDoc.id);
          }
        });
    }, 1000);
  }
}

function quitterMatchmaking() {
  matchmakingActif = false;
  if (matchmakingInterval) {
    clearInterval(matchmakingInterval);
    matchmakingInterval = null;
  }
  document.getElementById('popup-matchmaking').classList.remove('visible');

  if (monPlayerId) {
    fetch(MATCHMAKING_API + '/matchmaking/quitter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: monPlayerId })
    }).catch(function() {});
  }
}
