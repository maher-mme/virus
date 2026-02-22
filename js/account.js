// ============================
// GESTION DU COMPTE
// ============================
function isAdmin() {
  var pseudo = (getPseudo() || '').toLowerCase();
  return pseudo === 'obstinate' || pseudo === 'obstinate2.0';
}

function getPseudo() {
  return localStorage.getItem('virus_pseudo') || '';
}

function setPseudo(pseudo) {
  localStorage.setItem('virus_pseudo', pseudo);
  // Mettre a jour l'affichage partout
  var display = document.getElementById('pseudo-display');
  if (display) {
    display.textContent = pseudo;
    if (isAdmin()) {
      display.classList.add('pseudo-admin-text');
    } else {
      display.classList.remove('pseudo-admin-text');
    }
  }
}

function pseudoDejaUtilise(pseudo) {
  var parties = getParties();
  for (var i = 0; i < parties.length; i++) {
    if (parties[i].host && parties[i].host.toLowerCase() === pseudo.toLowerCase()) {
      return true;
    }
    if (parties[i].listeJoueurs) {
      for (var j = 0; j < parties[i].listeJoueurs.length; j++) {
        if (parties[i].listeJoueurs[j].toLowerCase() === pseudo.toLowerCase()) {
          return true;
        }
      }
    }
  }
  return false;
}

function setLangueCompte(lang) {
  setLanguage(lang);
}

function creerCompte() {
  var pseudo = document.getElementById('input-pseudo-compte').value.trim();
  if (!pseudo) { alert(t('vChoosePseudo')); return; }
  if (pseudo.length < 2) { alert(t('vPseudoTooShort')); return; }
  // Verifier dans Firebase si le pseudo existe deja
  db.collection('players').where('pseudo', '==', pseudo).limit(1).get().then(function(snap) {
    if (!snap.empty) {
      showNotif(t('pseudoTaken'), 'warn');
      return;
    }
    setPseudo(pseudo);
    // Skin aleatoire entre garcon et fille
    var skinAleatoire = Math.random() < 0.5 ? 'garcon' : 'fille';
    setSkin(skinAleatoire);
    // Enregistrer sur Firebase
    db.collection('players').doc(monPlayerId).set({
      playerId: monPlayerId,
      pseudo: pseudo,
      skin: getSkinFichier(skinAleatoire),
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
      initAmisListeners();
      var btnAmis = document.getElementById('btn-amis');
      if (btnAmis) btnAmis.style.display = 'flex';
    }).catch(function() {});
    showScreen('menu-principal');
  }).catch(function() {
    showNotif(t('connectionError'), 'error');
  });
}

function ouvrirParams() {
  document.getElementById('popup-params').classList.add('visible');
  var display = document.getElementById('input-edit-pseudo-display');
  if (display) display.textContent = getPseudo();
}

function fermerParams() {
  document.getElementById('popup-params').classList.remove('visible');
}

function supprimerCompte() {
  if (confirm(t('vDeleteAccount'))) {
    // Passer hors ligne sur Firebase
    db.collection('players').doc(monPlayerId).update({ online: false }).catch(function() {});
    localStorage.removeItem('virus_pseudo');
    localStorage.removeItem('virus_skin');
    localStorage.removeItem('virus_admin');
    localStorage.removeItem('virusGold');
    localStorage.removeItem('virusSkinsAchetes');
    localStorage.removeItem('virus_player_id');
    mesAmis = [];
    demandesEnAttente = [];
    amisStatuts = {};
    // Generer un nouveau player ID
    monPlayerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('virus_player_id', monPlayerId);
    showScreen('ecran-compte');
  }
}

// ============================
// FIREBASE - Initialisation joueur
// ============================
function initFirebaseAuth() {
  var pseudo = getPseudo();
  if (pseudo) {
    db.collection('players').doc(monPlayerId).set({
      playerId: monPlayerId,
      pseudo: pseudo,
      skin: getSkinFichier(getSkin()),
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
      initAmisListeners();
      var btnAmis = document.getElementById('btn-amis');
      if (btnAmis) btnAmis.style.display = 'flex';
    }).catch(function() {});
  }
}

// initCompteEtFirebase() est appelee depuis le script init en bas de index.html
function initCompteEtFirebase() {
  var pseudo = getPseudo();
  if (pseudo) {
    var display = document.getElementById('pseudo-display');
    display.textContent = pseudo;
    if (isAdmin()) {
      display.classList.add('pseudo-admin-text');
    }
    appliquerSkinPartout();
    showScreen('menu-principal');
  } else {
    document.getElementById('ecran-compte').classList.add('active');
  }
  setTimeout(initFirebaseAuth, 500);
}

