// ============================
// GESTION DU COMPTE
// ============================
function isAdmin(pseudoParam) {
  var pseudo = (pseudoParam || getPseudo() || '').toLowerCase();
  return pseudo === 'obstinate' || pseudo === 'obstinate2.0' || pseudo === 'chrikidd';
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
  var pin = document.getElementById('input-pin-compte').value.trim();
  if (!pseudo) { alert(t('vChoosePseudo')); return; }
  if (pseudo.length < 2) { alert(t('vPseudoTooShort')); return; }
  if (!pin) { showNotif(t('vPinRequired'), 'warn'); return; }
  if (pin.length < 5 || pin.length > 10) { showNotif(t('vPinInvalid'), 'warn'); return; }
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
    // Enregistrer sur Firebase avec PIN
    db.collection('players').doc(monPlayerId).set({
      playerId: monPlayerId,
      pseudo: pseudo,
      pin: pin,
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

// ============================
// CONNEXION AVEC PSEUDO + PIN
// ============================
function connecterCompte() {
  var pseudo = document.getElementById('input-pseudo-compte').value.trim();
  var pin = document.getElementById('input-pin-compte').value.trim();
  if (!pseudo) { showNotif(t('vChoosePseudo'), 'warn'); return; }
  if (!pin) { showNotif(t('vPinRequired'), 'warn'); return; }
  db.collection('players').where('pseudo', '==', pseudo).limit(1).get().then(function(snap) {
    if (snap.empty) { showNotif(t('accountNotFound'), 'error'); return; }
    var doc = snap.docs[0];
    var data = doc.data();
    if (data.pin !== pin) { showNotif(t('wrongCredentials'), 'error'); return; }
    // Restaurer la session
    monPlayerId = data.playerId;
    localStorage.setItem('virus_player_id', monPlayerId);
    setPseudo(data.pseudo);
    // Restaurer le skin (convertir fichier -> id)
    var skinId = getSkinIdFromFichier(data.skin);
    setSkin(skinId);
    // Restaurer gold et achats depuis Firebase si stockes
    if (data.gold !== undefined) {
      localStorage.setItem('virusGold', data.gold);
      playerGold = data.gold;
      var goldEl = document.getElementById('gold-display');
      if (goldEl) goldEl.textContent = playerGold;
    }
    if (data.skinsAchetes) {
      localStorage.setItem('virusSkinsAchetes', JSON.stringify(data.skinsAchetes));
    }
    if (data.musiquesAchetees) {
      localStorage.setItem('virusMusiquesAchetees', JSON.stringify(data.musiquesAchetees));
    }
    // Mettre en ligne
    db.collection('players').doc(monPlayerId).update({
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function() {});
    initAmisListeners();
    var btnAmis = document.getElementById('btn-amis');
    if (btnAmis) btnAmis.style.display = 'flex';
    appliquerSkinPartout();
    showScreen('menu-principal');
    showNotif(t('loggedIn'), 'success');
  }).catch(function(err) {
    console.error('Erreur connexion:', err);
    showNotif(t('connectionError'), 'error');
  });
}

// Convertir fichier skin -> id skin
function getSkinIdFromFichier(fichier) {
  if (!fichier) return 'garcon';
  // Chercher dans SKINS de base
  var allSkins = (typeof SKINS !== 'undefined' ? SKINS : []).concat(typeof SKINS_BOUTIQUE !== 'undefined' ? SKINS_BOUTIQUE : []);
  for (var i = 0; i < allSkins.length; i++) {
    if (allSkins[i].fichier === fichier) return allSkins[i].id;
  }
  return 'garcon';
}

// ============================
// DECONNEXION
// ============================
function deconnecterCompte() {
  if (!confirm(t('confirmLogout'))) return;
  // Sauvegarder gold et achats sur Firebase avant deconnexion
  var goldActuel = parseInt(localStorage.getItem('virusGold')) || 0;
  var skinsActuels = [];
  var musiquesActuelles = [];
  try { skinsActuels = JSON.parse(localStorage.getItem('virusSkinsAchetes')) || []; } catch(e) {}
  try { musiquesActuelles = JSON.parse(localStorage.getItem('virusMusiquesAchetees')) || []; } catch(e) {}
  db.collection('players').doc(monPlayerId).update({
    online: false,
    gold: goldActuel,
    skinsAchetes: skinsActuels,
    musiquesAchetees: musiquesActuelles
  }).catch(function() {});
  // Nettoyer localStorage
  localStorage.removeItem('virus_pseudo');
  localStorage.removeItem('virus_skin');
  localStorage.removeItem('virus_admin');
  localStorage.removeItem('virusGold');
  localStorage.removeItem('virusSkinsAchetes');
  localStorage.removeItem('virusMusiquesAchetees');
  localStorage.removeItem('virus_player_id');
  // Nettoyer les donnees en memoire
  mesAmis = [];
  demandesEnAttente = [];
  amisStatuts = {};
  if (typeof playerGold !== 'undefined') playerGold = 0;
  // Nettoyer les listeners amis
  if (typeof amisUnsubscribers !== 'undefined') {
    amisUnsubscribers.forEach(function(u) { if (u) u(); });
    amisUnsubscribers = [];
  }
  if (window._amisStatutUnsubs) {
    window._amisStatutUnsubs.forEach(function(u) { if (u) u(); });
    window._amisStatutUnsubs = [];
  }
  // Generer un nouveau player ID temporaire
  monPlayerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('virus_player_id', monPlayerId);
  // Fermer le popup params si ouvert
  fermerParams();
  // Remettre en mode creation
  modeCompteLogin = false;
  majModeCompte();
  showScreen('ecran-compte');
  showNotif(t('loggedOut'), 'info');
}

// ============================
// TOGGLE MODE CREATION / CONNEXION
// ============================
var modeCompteLogin = false;

function toggleModeCompte() {
  modeCompteLogin = !modeCompteLogin;
  majModeCompte();
}

function majModeCompte() {
  var titre = document.getElementById('compte-titre');
  var sousTitre = document.getElementById('compte-sous-titre');
  var btnCreer = document.getElementById('btn-creer-compte');
  var btnConnecter = document.getElementById('btn-connecter');
  var toggleLogin = document.getElementById('toggle-login');
  var toggleCreate = document.getElementById('toggle-create');
  if (modeCompteLogin) {
    if (titre) { titre.setAttribute('data-i18n', 'loginTitle'); titre.textContent = t('loginTitle'); }
    if (sousTitre) { sousTitre.setAttribute('data-i18n', 'enterCredentials'); sousTitre.textContent = t('enterCredentials'); }
    if (btnCreer) btnCreer.style.display = 'none';
    if (btnConnecter) btnConnecter.style.display = '';
    if (toggleLogin) toggleLogin.style.display = 'none';
    if (toggleCreate) toggleCreate.style.display = '';
  } else {
    if (titre) { titre.setAttribute('data-i18n', 'createAccount'); titre.textContent = t('createAccount'); }
    if (sousTitre) { sousTitre.setAttribute('data-i18n', 'chooseNickname'); sousTitre.textContent = t('chooseNickname'); }
    if (btnCreer) btnCreer.style.display = '';
    if (btnConnecter) btnConnecter.style.display = 'none';
    if (toggleLogin) toggleLogin.style.display = '';
    if (toggleCreate) toggleCreate.style.display = 'none';
  }
}

// ============================
// SAUVEGARDER PIN (parametres)
// ============================
function sauvegarderPin() {
  var input = document.getElementById('input-set-pin');
  var pin = input ? input.value.trim() : '';
  if (pin.length < 5 || pin.length > 10) { showNotif(t('vPinInvalid'), 'warn'); return; }
  db.collection('players').doc(monPlayerId).update({ pin: pin }).then(function() {
    showNotif(t('pinSaved'), 'success');
    // Cacher la section set-pin
    var section = document.getElementById('section-set-pin');
    if (section) section.style.display = 'none';
  }).catch(function() {
    showNotif(t('connectionError'), 'error');
  });
}

function ouvrirParams() {
  document.getElementById('popup-params').classList.add('visible');
  var display = document.getElementById('input-edit-pseudo-display');
  if (display) display.textContent = getPseudo();
  // Verifier si le joueur a un PIN, sinon afficher la section set-pin
  var sectionPin = document.getElementById('section-set-pin');
  if (sectionPin) {
    db.collection('players').doc(monPlayerId).get().then(function(doc) {
      if (doc.exists && !doc.data().pin) {
        sectionPin.style.display = '';
      } else {
        sectionPin.style.display = 'none';
      }
    }).catch(function() {});
  }
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
    localStorage.removeItem('virusMusiquesAchetees');
    localStorage.removeItem('virus_player_id');
    mesAmis = [];
    demandesEnAttente = [];
    amisStatuts = {};
    if (typeof playerGold !== 'undefined') playerGold = 0;
    // Nettoyer les listeners amis
    if (typeof amisUnsubscribers !== 'undefined') {
      amisUnsubscribers.forEach(function(u) { if (u) u(); });
      amisUnsubscribers = [];
    }
    if (window._amisStatutUnsubs) {
      window._amisStatutUnsubs.forEach(function(u) { if (u) u(); });
      window._amisStatutUnsubs = [];
    }
    // Generer un nouveau player ID
    monPlayerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('virus_player_id', monPlayerId);
    fermerParams();
    modeCompteLogin = false;
    majModeCompte();
    showScreen('ecran-compte');
  }
}

// ============================
// FIREBASE - Initialisation joueur
// ============================
function initFirebaseAuth() {
  var pseudo = getPseudo();
  if (pseudo) {
    var goldActuel = parseInt(localStorage.getItem('virusGold')) || 0;
    var skinsActuels = [];
    var musiquesActuelles = [];
    try { skinsActuels = JSON.parse(localStorage.getItem('virusSkinsAchetes')) || []; } catch(e) {}
    try { musiquesActuelles = JSON.parse(localStorage.getItem('virusMusiquesAchetees')) || []; } catch(e) {}
    db.collection('players').doc(monPlayerId).set({
      playerId: monPlayerId,
      pseudo: pseudo,
      skin: getSkinFichier(getSkin()),
      online: true,
      gold: goldActuel,
      skinsAchetes: skinsActuels,
      musiquesAchetees: musiquesActuelles,
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
    // Verifier si le joueur a un PIN, sinon notifier
    setTimeout(function() {
      db.collection('players').doc(monPlayerId).get().then(function(doc) {
        if (doc.exists && !doc.data().pin) {
          showNotif(t('setPinNotif'), 'warn');
        }
      }).catch(function() {});
    }, 2000);
  } else {
    document.getElementById('ecran-compte').classList.add('active');
  }
  setTimeout(initFirebaseAuth, 500);
}

