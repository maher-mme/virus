// ============================
// GESTION DU COMPTE
// ============================
function isAdmin(pseudoParam) {
  var pseudo = (pseudoParam || getPseudo() || '').trim().toLowerCase();
  return pseudo === 'obstinate' || pseudo === 'obstinate2.0' || pseudo === 'chrikidd77';
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

function soumettreFormCompte(e) {
  e.preventDefault();
  if (modeCompteLogin) {
    connecterCompte();
  } else {
    creerCompte();
  }
  return false;
}

function creerCompte() {
  var pseudo = document.getElementById('input-pseudo-compte').value.trim();
  var pin = document.getElementById('input-pin-compte').value.trim();
  if (!pseudo) { alert(t('vChoosePseudo')); return; }
  if (pseudo.length < 2) { alert(t('vPseudoTooShort')); return; }
  // Verifier si le pseudo contient un mot interdit (meme avec des * ou caracteres speciaux)
  if (typeof MOTS_INTERDITS !== 'undefined') {
    var pseudoClean = pseudo.toLowerCase().replace(/[^a-z]/g, '');
    for (var mi = 0; mi < MOTS_INTERDITS.length; mi++) {
      var motClean = MOTS_INTERDITS[mi].replace(/[^a-z]/g, '');
      if (pseudoClean.indexOf(motClean) >= 0) {
        showNotif(t('pseudoInappropriate') || 'Ce pseudo contient un mot inapproprie.', 'warn');
        return;
      }
    }
  }
  if (!pin) { showNotif(t('vPinRequired'), 'warn'); return; }
  if (pin.length < 5 || pin.length > 10) { showNotif(t('vPinInvalid'), 'warn'); return; }
  // Verifier dans Firebase si le pseudo existe deja (insensible a la casse)
  var pseudoLower = pseudo.toLowerCase();
  db.collection('players').where('pseudoLower', '==', pseudoLower).limit(1).get().then(function(snap) {
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
      pseudoLower: pseudoLower,
      pin: pin,
      skin: getSkinFichier(skinAleatoire),
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
      initAmisListeners();
      var btnAmis = document.getElementById('btn-amis');
      if (btnAmis) btnAmis.style.display = 'flex';
      // Ouvrir le tutoriel pour les nouveaux joueurs
      if (typeof ouvrirTuto === 'function') {
        setTimeout(function() { ouvrirTuto(); }, 500);
      }
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
  db.collection('players').where('pseudoLower', '==', pseudo.toLowerCase()).limit(1).get().then(function(snap) {
    if (snap.empty) { showNotif(t('accountNotFound'), 'error'); return; }
    var doc = snap.docs[0];
    var data = doc.data();
    if (String(data.pin) !== String(pin)) { showNotif(t('wrongCredentials'), 'error'); return; }
    // Verifier si le joueur est banni
    if (data.banned && data.banExpire) {
      var banExpire = new Date(data.banExpire).getTime();
      if (Date.now() < banExpire) {
        afficherEcranBan(banExpire, data.banRaison || '', doc.ref);
        return;
      } else {
        doc.ref.update({ banned: false, banExpire: '', banRaison: '' });
      }
    }
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
    // Reset SKINS a la base (eviter pollution d'un compte admin precedent)
    if (typeof SKINS !== 'undefined') {
      for (var ks = SKINS.length - 1; ks >= 0; ks--) {
        if (SKINS[ks].id !== 'garcon' && SKINS[ks].id !== 'fille') SKINS.splice(ks, 1);
      }
    }
    // Charger emotes achetes du passe
    if (data.emotesAchetes) {
      try { localStorage.setItem('virusEmotesAchetes', JSON.stringify(data.emotesAchetes)); } catch(e) {}
    }
    if (data.skinsAchetes) {
      localStorage.setItem('virusSkinsAchetes', JSON.stringify(data.skinsAchetes));
      // Recharger les skins achetes dans le tableau SKINS
      data.skinsAchetes.forEach(function(skinId) {
        if (!SKINS.find(function(s) { return s.id === skinId; })) {
          var sb = SKINS_BOUTIQUE.find(function(s) { return s.id === skinId; });
          if (sb) SKINS.push({ id: sb.id, nom: sb.nom, fichier: sb.fichier, rarete: sb.rarete });
        }
      });
    } else {
      localStorage.setItem('virusSkinsAchetes', '[]');
    }
    // Reset MUSIQUES aussi
    if (typeof MUSIQUES !== 'undefined' && typeof MUSIQUES_BOUTIQUE !== 'undefined') {
      for (var km = MUSIQUES.length - 1; km >= 0; km--) {
        if (MUSIQUES_BOUTIQUE.find(function(mb) { return mb.id === MUSIQUES[km].id; })) MUSIQUES.splice(km, 1);
      }
    }
    if (data.musiquesAchetees) {
      localStorage.setItem('virusMusiquesAchetees', JSON.stringify(data.musiquesAchetees));
      // Recharger les musiques achetees dans le tableau MUSIQUES
      data.musiquesAchetees.forEach(function(mId) {
        if (!MUSIQUES.find(function(m) { return m.id === mId; })) {
          var mb = MUSIQUES_BOUTIQUE.find(function(m) { return m.id === mId; });
          if (mb) MUSIQUES.push({ id: mb.id, nom: mb.nom, artiste: mb.artiste, fichier: mb.fichier, image: mb.image });
        }
      });
    }
    // Restaurer les pets achetes
    if (data.petsAchetes) {
      localStorage.setItem('virusPetsAchetes', JSON.stringify(data.petsAchetes));
    }
    // Restaurer le pet equipe
    if (data.pet) {
      localStorage.setItem('virusPet', data.pet);
    }
    // Restaurer la photo de profil
    if (data.pfp) {
      localStorage.setItem('virusPfp', data.pfp);
      afficherPfpPartout();
    }
    // Restaurer le cadre pfp
    if (data.pfpCadre) {
      localStorage.setItem('virusPfpCadre', data.pfpCadre);
      if (typeof appliquerCadrePartout === 'function') appliquerCadrePartout();
    }
    // Mettre en ligne + sync skinsCount
    var skinsLogin = data.skinsAchetes || [];
    db.collection('players').doc(monPlayerId).update({
      online: true,
      skinsCount: skinsLogin.length,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function() {});
    initAmisListeners();
    if (typeof initEchangeListener === 'function') initEchangeListener();
    if (typeof initEchangeAccepteListener === 'function') initEchangeAccepteListener();
    var btnAmis = document.getElementById('btn-amis');
    if (btnAmis) btnAmis.style.display = 'flex';
    appliquerSkinPartout();
    if (typeof debloquerToutAdmin === 'function') debloquerToutAdmin();
    // Connexion a l'API anti-triche
    if (typeof apiLogin === 'function') {
      apiLogin(monPlayerId, pin).catch(function() {});
    }
    // Lancer la sync temps reel du profil (cross-device)
    initPlayerSync();
    showScreen('menu-principal');
    showNotif(t('loggedIn'), 'success');
  }).catch(function(err) {
    console.error('Erreur connexion:', err);
    showNotif(t('connectionError'), 'error');
  });
}

// ============================
// SYNC TEMPS REEL DU PROFIL (cross-device)
// ============================
// Listener Firestore qui detecte les changements sur le doc joueur
// → quand l'utilisateur change sa pfp/cadre/skin sur un autre appareil,
//   les valeurs locales sont synchronisees automatiquement.
var _playerSyncUnsub = null;

function initPlayerSync() {
  if (typeof db === 'undefined' || !monPlayerId) return;
  if (_playerSyncUnsub) { try { _playerSyncUnsub(); } catch(e) {} _playerSyncUnsub = null; }
  _playerSyncUnsub = db.collection('players').doc(monPlayerId).onSnapshot(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    var changed = false;

    // PFP
    var localPfp = localStorage.getItem('virusPfp') || '';
    var remotePfp = data.pfp || '';
    if (remotePfp !== localPfp) {
      if (remotePfp) localStorage.setItem('virusPfp', remotePfp);
      else localStorage.removeItem('virusPfp');
      changed = true;
    }

    // Cadre PFP
    var localCadre = localStorage.getItem('virusPfpCadre') || '';
    var remoteCadre = data.pfpCadre || '';
    if (remoteCadre && remoteCadre !== localCadre) {
      localStorage.setItem('virusPfpCadre', remoteCadre);
      changed = true;
    }

    // Gold
    if (typeof data.gold === 'number') {
      var localGold = parseInt(localStorage.getItem('virusGold')) || 0;
      if (data.gold !== localGold) {
        localStorage.setItem('virusGold', data.gold);
        if (typeof playerGold !== 'undefined') playerGold = data.gold;
        var goldEl = document.getElementById('gold-display');
        if (goldEl) goldEl.textContent = data.gold;
      }
    }

    if (changed) {
      if (typeof afficherPfpPartout === 'function') afficherPfpPartout();
      if (typeof appliquerCadrePartout === 'function') appliquerCadrePartout();
    }
  }, function() { /* erreur silencieuse */ });
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
  // Stopper le listener de sync profil
  if (_playerSyncUnsub) { try { _playerSyncUnsub(); } catch(e) {} _playerSyncUnsub = null; }
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
    skinsCount: skinsActuels.length,
    musiquesAchetees: musiquesActuelles
  }).catch(function() {});
  // Nettoyer localStorage
  localStorage.removeItem('virus_pseudo');
  localStorage.removeItem('virus_skin');
  localStorage.removeItem('virus_admin');
  localStorage.removeItem('virusGold');
  localStorage.removeItem('virusSkinsAchetes');
  localStorage.removeItem('virusMusiquesAchetees');
  localStorage.removeItem('virusPfp');
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
  // Afficher le formulaire de connexion par defaut
  modeCompteLogin = true;
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
  var pinInput = document.getElementById('input-pin-compte');
  if (modeCompteLogin) {
    if (titre) { titre.setAttribute('data-i18n', 'loginTitle'); titre.textContent = t('loginTitle'); }
    if (sousTitre) { sousTitre.setAttribute('data-i18n', 'enterCredentials'); sousTitre.textContent = t('enterCredentials'); }
    if (btnCreer) btnCreer.style.display = 'none';
    if (btnConnecter) btnConnecter.style.display = '';
    if (toggleLogin) toggleLogin.style.display = 'none';
    if (toggleCreate) toggleCreate.style.display = '';
    if (pinInput) pinInput.autocomplete = 'current-password';
  } else {
    if (titre) { titre.setAttribute('data-i18n', 'createAccount'); titre.textContent = t('createAccount'); }
    if (sousTitre) { sousTitre.setAttribute('data-i18n', 'chooseNickname'); sousTitre.textContent = t('chooseNickname'); }
    if (btnCreer) btnCreer.style.display = '';
    if (btnConnecter) btnConnecter.style.display = 'none';
    if (toggleLogin) toggleLogin.style.display = '';
    if (toggleCreate) toggleCreate.style.display = 'none';
    if (pinInput) pinInput.autocomplete = 'new-password';
  }
}

// ============================
// COMPTEUR CARACTERES PIN
// ============================
function majCompteurPin(inputId, counterId) {
  var input = document.getElementById(inputId);
  var counter = document.getElementById(counterId);
  if (!input || !counter) return;
  var len = input.value.length;
  counter.textContent = len + ' / 10';
  if (len < 5) {
    counter.style.color = '#e74c3c';
  } else {
    counter.style.color = '#2ecc71';
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
  // Refleter l'etat du toggle dyslexie
  if (typeof majToggleDyslexie === 'function') majToggleDyslexie();
  if (typeof majToggleControleMobile === 'function') majToggleControleMobile();
  chargerJoinMode();
  // Verifier si le joueur a un PIN, sinon afficher la section set-pin
  var sectionPin = document.getElementById('section-set-pin');
  if (sectionPin) {
    db.collection('players').doc(monPlayerId).get().then(function(doc) {
      var p = doc.exists ? doc.data().pin : null;
      if (doc.exists && (p === undefined || p === null || p === '')) {
        sectionPin.style.display = '';
      } else {
        sectionPin.style.display = 'none';
      }
    }).catch(function() {});
  }
}

function fermerParams() {
  document.getElementById('popup-params').classList.remove('visible');
  // Fermer aussi le formulaire de changement mdp
  var sec = document.getElementById('section-changer-mdp');
  if (sec) sec.style.display = 'none';
}

// Ecran de ban avec compteur a rebours
var _banInterval = null;
function afficherEcranBan(banExpire, raison, docRef) {
  var popup = document.getElementById('popup-ban');
  if (!popup) { showNotif(t('reportBannedLogin', Math.ceil((banExpire - Date.now()) / 60000), raison), 'error'); return; }
  popup.style.display = 'flex';
  var raisonEl = document.getElementById('ban-raison');
  if (raisonEl) raisonEl.textContent = raison ? 'Raison : ' + raison : '';
  var countdownEl = document.getElementById('ban-countdown');
  if (_banInterval) clearInterval(_banInterval);
  function majBanCountdown() {
    var diff = banExpire - Date.now();
    if (diff <= 0) {
      clearInterval(_banInterval);
      _banInterval = null;
      popup.style.display = 'none';
      if (docRef) docRef.update({ banned: false, banExpire: '', banRaison: '' });
      showNotif('Ban termine ! Tu peux te reconnecter.', 'success');
      return;
    }
    var min = Math.floor(diff / 60000);
    var sec = Math.floor((diff % 60000) / 1000);
    if (countdownEl) countdownEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
  }
  majBanCountdown();
  _banInterval = setInterval(majBanCountdown, 1000);
}

// Toggle mode de join (avec demande / sans demande)
function toggleJoinMode() {
  if (!monPlayerId) return;
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    var current = data.joinMode || 'demande';
    var nouveau = (current === 'demande') ? 'libre' : 'demande';
    db.collection('players').doc(monPlayerId).update({ joinMode: nouveau }).then(function() {
      majJoinModeUI(nouveau);
    });
  });
}

function majJoinModeUI(mode) {
  var btn = document.getElementById('btn-join-mode');
  var desc = document.getElementById('join-mode-desc');
  if (btn) {
    if (mode === 'libre') {
      btn.textContent = t('joinModeFree');
      btn.style.background = 'linear-gradient(180deg,#27ae60,#229954)';
      btn.style.borderColor = '#27ae60';
      btn.setAttribute('data-i18n', 'joinModeFree');
    } else {
      btn.textContent = t('joinModeRequest');
      btn.style.background = 'linear-gradient(180deg,#3498db,#2980b9)';
      btn.style.borderColor = '#3498db';
      btn.setAttribute('data-i18n', 'joinModeRequest');
    }
  }
  if (desc) {
    desc.textContent = (mode === 'libre') ? t('joinModeFreeDesc') : t('joinModeRequestDesc');
    desc.setAttribute('data-i18n', mode === 'libre' ? 'joinModeFreeDesc' : 'joinModeRequestDesc');
  }
}

function chargerJoinMode() {
  if (!monPlayerId) return;
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    majJoinModeUI(doc.data().joinMode || 'demande');
  });
}

function toggleVoirMdp(inputId, btn) {
  var input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.style.color = '#f39c12';
  } else {
    input.type = 'password';
    btn.style.color = '#7f8c8d';
  }
}

function ouvrirChangerMotDePasse() {
  var sec = document.getElementById('section-changer-mdp');
  if (!sec) return;
  sec.style.display = '';
  document.getElementById('input-ancien-mdp').value = '';
  document.getElementById('input-nouveau-mdp').value = '';
  document.getElementById('input-confirm-mdp').value = '';
  document.getElementById('input-ancien-mdp').focus();
}

function annulerChangerMotDePasse() {
  var sec = document.getElementById('section-changer-mdp');
  if (sec) sec.style.display = 'none';
}

function changerMotDePasse() {
  var ancien = document.getElementById('input-ancien-mdp').value.trim();
  var nouveau = document.getElementById('input-nouveau-mdp').value.trim();
  var confirm = document.getElementById('input-confirm-mdp').value.trim();
  if (!ancien || !nouveau || !confirm) {
    showNotif(t('mdpFillFields'), 'warn');
    return;
  }
  if (nouveau.length < 5 || nouveau.length > 10) {
    showNotif(t('mdpLength5to10'), 'warn');
    return;
  }
  if (nouveau !== confirm) {
    showNotif(t('mdpDontMatch'), 'warn');
    return;
  }
  if (!monPlayerId) {
    showNotif(t('mdpNoAccount'), 'warn');
    return;
  }
  // Verifier l'ancien mot de passe puis update Firebase
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) {
      showNotif(t('mdpAccountNotFound'), 'warn');
      return;
    }
    var data = doc.data();
    if (String(data.pin) !== String(ancien)) {
      showNotif(t('mdpOldWrong'), 'warn');
      return;
    }
    if (nouveau === ancien) {
      showNotif(t('mdpSameAsOld'), 'warn');
      return;
    }
    db.collection('players').doc(monPlayerId).update({ pin: nouveau }).then(function() {
      showNotif(t('mdpChanged'), 'success');
      annulerChangerMotDePasse();
    }).catch(function(err) {
      showNotif(t('mdpSaveError') + ' : ' + (err && err.message ? err.message : 'inconnue'), 'warn');
    });
  }).catch(function(err) {
    showNotif(t('mdpConnError') + ' : ' + (err && err.message ? err.message : 'inconnue'), 'warn');
  });
}

function supprimerCompte() {
  if (confirm(t('vDeleteAccount'))) {
    // Supprimer le document joueur de Firebase (attendre la suppression)
    var _deletePlayerId = monPlayerId;
    db.collection('players').doc(_deletePlayerId).delete().then(function() {
      console.log('Compte supprime avec succes');
    }).catch(function(err) {
      console.error('Erreur suppression compte:', err);
    });
    // Supprimer les amis (les deux cotes)
    db.collection('friends').where('playerId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    db.collection('friends').where('friendPlayerId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    // Supprimer les demandes d'amis
    db.collection('friendRequests').where('fromPlayerId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    db.collection('friendRequests').where('toPlayerId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    // Supprimer les commentaires du joueur
    db.collection('comments').where('playerId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    // Supprimer les votes du joueur
    db.collection('votes').where('voterId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    // Supprimer les invitations de partie
    db.collection('gameInvites').where('fromPlayerId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    db.collection('gameInvites').where('toPlayerId', '==', monPlayerId).get().then(function(snap) {
      snap.forEach(function(d) { d.ref.delete(); });
    }).catch(function() {});
    // Nettoyer tout le localStorage
    localStorage.removeItem('virus_pseudo');
    localStorage.removeItem('virus_skin');
    localStorage.removeItem('virus_admin');
    localStorage.removeItem('virusGold');
    localStorage.removeItem('virusSkinsAchetes');
    localStorage.removeItem('virusMusiquesAchetees');
    localStorage.removeItem('virusPfp');
    localStorage.removeItem('virusPetsAchetes');
    localStorage.removeItem('virusPet');
    localStorage.removeItem('virusVersion');
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
      pseudoLower: pseudo.toLowerCase(),
      skin: getSkinFichier(getSkin()),
      online: true,
      gold: goldActuel,
      skinsAchetes: skinsActuels,
      musiquesAchetees: musiquesActuelles,
      pfp: localStorage.getItem('virusPfp') || '',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
      // Ajouter createdAt pour les anciens comptes qui ne l'ont pas
      db.collection('players').doc(monPlayerId).get().then(function(doc) {
        if (doc.exists && !doc.data().createdAt) {
          db.collection('players').doc(monPlayerId).update({
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(function() {});
        }
      }).catch(function() {});
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
    if (display) {
      display.textContent = pseudo;
      if (isAdmin()) {
        display.classList.add('pseudo-admin-text');
      }
    }
    appliquerSkinPartout();
    afficherPfpPartout();
    if (typeof debloquerToutAdmin === 'function') debloquerToutAdmin();
    if (typeof initEchangeListener === 'function') initEchangeListener();
    if (typeof initEchangeAccepteListener === 'function') initEchangeAccepteListener();
    // Lancer la sync temps reel du profil (pour cross-device)
    initPlayerSync();
    showScreen('menu-principal');
    // Verifier ban + PIN
    setTimeout(function() {
      db.collection('players').doc(monPlayerId).get().then(function(doc) {
        if (!doc.exists) return;
        var data = doc.data();
        // Verifier ban
        if (data.banned && data.banExpire) {
          var banExpire = new Date(data.banExpire).getTime();
          if (Date.now() < banExpire) {
            afficherEcranBan(banExpire, data.banRaison || '', doc.ref);
            return;
          } else {
            doc.ref.update({ banned: false, banExpire: '', banRaison: '' });
          }
        }
        // Verifier PIN
        var pin = data.pin;
        if (pin === undefined || pin === null || pin === '') {
          showNotif(t('setPinNotif'), 'warn');
        }
      }).catch(function() {});
    }, 2000);
  } else {
    document.getElementById('ecran-compte').classList.add('active');
  }
  setTimeout(initFirebaseAuth, 500);
}

