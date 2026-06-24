// ============================
// MODE TEST DEV (admin dev uniquement)
// ============================
// Permet de lancer une partie online avec :
// - Role force pour le host
// - Bots automatiques pour remplir la partie

var _testDevForceRole = null;

var TESTDEV_ROLES_VIRUS = ['virus', 'innocent', 'journaliste', 'fanatique', 'espion', 'cherif'];

// === OUVRIR / FERMER ===
function ouvrirTestDev() {
  if (typeof peutOuvrirConsole !== 'function' || !peutOuvrirConsole()) {
    if (typeof showNotif === 'function') showNotif('Reserve aux admins dev', 'warn');
    return;
  }
  var pop = document.getElementById('popup-test-dev');
  if (pop) pop.classList.add('visible');
  testDevInitRoles();
}
function fermerTestDev() {
  var pop = document.getElementById('popup-test-dev');
  if (pop) pop.classList.remove('visible');
}

function testDevInitRoles() {
  var sel = document.getElementById('testdev-role');
  if (!sel) return;
  sel.innerHTML = '';
  TESTDEV_ROLES_VIRUS.forEach(function(r) {
    var opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r.toUpperCase();
    sel.appendChild(opt);
  });
  var inpBots = document.getElementById('testdev-bots');
  if (inpBots) {
    inpBots.value = 6;
    inpBots.min = 3;
  }
}

// === LANCER LA PARTIE DE TEST ===
function lancerTestDev() {
  var role = document.getElementById('testdev-role').value;
  var nbBots = parseInt(document.getElementById('testdev-bots').value);
  if (isNaN(nbBots) || nbBots < 3) { showNotif('Min 3 bots', 'warn'); return; }
  if (nbBots > 29) nbBots = 29;

  _testDevForceRole = role;

  fermerTestDev();

  // Creer la partie online avec les params en dur
  var pseudo = getPseudo();
  if (!pseudo) { showNotif(t('connectionError'), 'error'); return; }

  var nomPartie = '[TEST] ' + pseudo;
  var maxJoueurs = nbBots + 1;

  showNotif('Creation de la partie test...', 'info');

  var skin = getSkinFichier(getSkin());
  db.collection('players').doc(monPlayerId).set({
    playerId: monPlayerId, pseudo: pseudo, skin: skin,
    online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(function() {
    return db.collection('parties').add({
      nom: nomPartie, hostPlayerId: monPlayerId, hostPseudo: pseudo,
      maxJoueurs: maxJoueurs, mechants: 1,
      journaliste: false, fanatique: false, espion: false, cherif: false,
      langue: 'fr', couleur: '#8e44ad',
      phase: 'lobby', joueurs: 1, listeJoueurs: [pseudo],
      private: true,
      gameMode: 'virus',
      isTestDev: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(function(docRef) {
    var partyId = docRef.id;
    var monPet = typeof getPetEquipe === 'function' ? getPetEquipe() : '';
    return db.collection('partyPlayers').add({
      partyId: partyId, playerId: monPlayerId, pseudo: pseudo, skin: skin, pet: monPet,
      isHost: true, role: '', alive: true, x: 0, y: 0, direction: 1, saX: 50, saY: 70, saDirection: 1,
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(ppDoc) {
      myPartyPlayerDocId = ppDoc.id;
      modeHorsLigne = false;
      estHost = true;
      partieActuelleId = partyId;
      db.collection('players').doc(monPlayerId).update({ currentPartyId: partyId }).catch(function() {});
      // Ajouter les bots avec positions etalees en salle d'attente
      var batch = db.batch();
      for (var i = 0; i < nbBots; i++) {
        var botRef = db.collection('partyPlayers').doc();
        // Repartir les bots en cercle autour du centre (50%, 70%)
        var angle = (i / nbBots) * Math.PI * 2;
        var saX = 50 + Math.cos(angle) * 25;
        var saY = 60 + Math.sin(angle) * 15;
        batch.set(botRef, {
          partyId: partyId,
          playerId: 'bot_' + i + '_' + Date.now(),
          pseudo: 'Bot' + (i + 1),
          skin: 'skin/gratuit/skin-de-base-garcon.svg',
          pet: '',
          isHost: false, isBot: true, role: '', alive: true,
          x: 0, y: 0, direction: 1, saX: saX, saY: saY, saDirection: 1,
          lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      return batch.commit().then(function() {
        showNotif('Partie test creee — ' + (nbBots + 1) + ' joueurs', 'success');
        showScreen('salle-attente');
        subscribeToParty(partyId);
        updateSalleAttente();
      });
    });
  }).catch(function(err) {
    console.error('Erreur lancement test dev', err);
    showNotif('Erreur creation partie test', 'error');
    _testDevForceRole = null;
  });
}

// === AFFICHER/CACHER LE BOUTON TEST DEV ===
function majBoutonTestDev() {
  var btn = document.getElementById('btn-test-dev');
  if (!btn) return;
  var estDev = (typeof peutOuvrirConsole === 'function') && peutOuvrirConsole();
  btn.style.display = estDev ? '' : 'none';
}

// Appel periodique pour synchroniser
setTimeout(majBoutonTestDev, 2000);
