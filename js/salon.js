// ============================
// SALON (nouveau menu principal style hub)
// ============================
// Visible quand feature flag "salonLobby" est active (DEV ou LIVE).
// 7 onglets en haut : JOUER, CASIER, BOUTIQUE, PASSE, QUETES, CLASSEMENT, PARAMETRE.
// L'onglet JOUER affiche l'avatar du joueur + selecteurs (mode + jeu) + bouton JOUER.
// Les autres onglets ouvrent les popups/screens existants.

var _salonTabActive = 'jouer';

// === DETECTION : doit-on afficher le salon ou l'ancien menu ===
function salonEstActif() {
  return (typeof isFeatureActive === 'function') && isFeatureActive('salonLobby');
}

// === ROUTE D'OUVERTURE DU MENU PRINCIPAL ===
// Hooke showScreen('menu-principal') → redirige vers menu-salon si flag actif
function ouvrirMenuPrincipalSelonFlag() {
  if (salonEstActif()) {
    showScreen('menu-salon');
    salonRafraichir();
  } else {
    showScreen('menu-principal');
  }
}

// === MAJ DES INFOS UTILISATEUR DANS LE SALON ===
function salonRafraichir() {
  // Pseudo
  var pseudoEl = document.getElementById('salon-pseudo');
  var pseudoEl2 = document.getElementById('salon-avatar-pseudo');
  var pseudo = (typeof getPseudo === 'function') ? getPseudo() : '';
  if (pseudoEl) pseudoEl.textContent = pseudo || '---';
  if (pseudoEl2) pseudoEl2.textContent = pseudo || '---';
  // Si admin, ajouter classe spéciale
  if (typeof isAdmin === 'function' && isAdmin()) {
    if (pseudoEl) pseudoEl.classList.add('pseudo-admin-text');
    if (pseudoEl2) pseudoEl2.classList.add('pseudo-admin-text');
  }

  // Gold
  var goldEl = document.getElementById('salon-gold-val');
  if (goldEl && typeof playerGold !== 'undefined') goldEl.textContent = playerGold;

  // PFP
  var pfpEl = document.getElementById('salon-pfp');
  if (pfpEl) {
    var pfp = (typeof getPfp === 'function') ? getPfp() : '';
    pfpEl.src = pfp || 'assets/pfp_de_base.png';
  }

  // Niveau (calcule depuis l'XP, comme dans le profil) — retry si pas pret
  salonMajNiveau();

  // Avatar(s) : moi seul ou groupe d'amis
  salonRenderAvatars();

  // Option CACHE-CACHE dans le selecteur de jeu : visible uniquement si flag en LIVE
  var ccOpt = document.getElementById('salon-sel-cachecache-opt');
  if (ccOpt) {
    var ccLive = (typeof FEATURE_FLAGS !== 'undefined') && FEATURE_FLAGS.cachecache === 'live';
    ccOpt.style.display = ccLive ? '' : 'none';
  }
}

// === MISE A JOUR DU NIVEAU (avec retry) ===
var _salonNiveauRetryCount = 0;
var _salonNiveauListenerUnsub = null;
function salonMajNiveau() {
  var niveauEl = document.getElementById('salon-niveau');
  if (!niveauEl) return;
  if (typeof db === 'undefined' || typeof monPlayerId === 'undefined' || !monPlayerId) {
    // Retry jusqu'a 10 fois (5 sec total)
    if (_salonNiveauRetryCount < 10) {
      _salonNiveauRetryCount++;
      setTimeout(salonMajNiveau, 500);
    }
    return;
  }
  _salonNiveauRetryCount = 0;
  // Listener temps reel : MAJ du niveau quand le doc joueur change
  if (_salonNiveauListenerUnsub) { try { _salonNiveauListenerUnsub(); } catch(e) {} }
  _salonNiveauListenerUnsub = db.collection('players').doc(monPlayerId).onSnapshot(function(doc) {
    if (!doc.exists) { niveauEl.textContent = 'Niv. 1'; return; }
    var data = doc.data();
    var level = 1;
    if (typeof calculerNiveau === 'function') {
      var xp = data.xp || 0;
      var info = calculerNiveau(xp);
      if (info && info.niveau) level = info.niveau;
    }
    if (data.level && data.level > level) level = data.level;
    niveauEl.textContent = 'Niv. ' + level;
  }, function() {});
}

// === RENDU AVATARS (moi seul ou groupe d'amis) ===
function salonRenderAvatars() {
  var wrap = document.getElementById('salon-avatars-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  var monPseudoLocal = (typeof getPseudo === 'function') ? getPseudo() : '';
  var monSkin = (typeof getSkinFichier === 'function' && typeof getSkin === 'function')
    ? getSkinFichier(getSkin()) : '';

  // Si je suis dans un groupe (variable _monGroupeData de salonGroup.js)
  if (typeof _monGroupeData !== 'undefined' && _monGroupeData && _monGroupeData.members && _monGroupeData.members.length > 0) {
    // Badge groupe en haut
    var info = document.createElement('div');
    info.className = 'salon-group-info';
    info.textContent = 'GROUPE ' + _monGroupeData.members.length + '/' + (_monGroupeData.maxSize || 6);
    wrap.appendChild(info);

    // Afficher chaque membre (cache automatiquement sur mobile via CSS sauf moi)
    var idx = 0;
    _monGroupeData.members.forEach(function(m) {
      var isMe = m.playerId === monPlayerId;
      var skin = isMe ? monSkin : (m.skin || 'skin/gratuit/skin-de-base-garcon.svg');
      var pseudoAff = isMe ? monPseudoLocal : (m.pseudo || '');
      var isHost = (_monGroupeData.hostId === m.playerId);
      wrap.appendChild(creerAvatarMembre(skin, pseudoAff, isMe, isHost, idx, !!m.ready));
      idx++;
    });

    // Liste textuelle des membres pour mobile (visible uniquement sur mobile via CSS)
    var autresMembres = _monGroupeData.members
      .filter(function(m) { return m.playerId !== monPlayerId; })
      .map(function(m) { return m.pseudo + (_monGroupeData.hostId === m.playerId ? ' ★' : ''); });
    if (autresMembres.length > 0) {
      var liste = document.createElement('div');
      liste.className = 'salon-group-list-mobile';
      liste.innerHTML = '<strong>Membres du groupe :</strong> ' + autresMembres.map(function(p) { return escapeHtml(p); }).join(', ');
      wrap.appendChild(liste);
    }

    // Bouton rouge QUITTER LE GROUPE (sur mon avatar)
    var myAvatarEl = wrap.querySelector('.salon-avatar-me');
    if (myAvatarEl) {
      var btn = document.createElement('button');
      btn.className = 'salon-btn-quitter-groupe';
      btn.textContent = '✕ QUITTER LE GROUPE';
      btn.onclick = function() {
        if (confirm('Quitter le groupe ?')) {
          if (typeof quitterSalonGroup === 'function') quitterSalonGroup();
        }
      };
      myAvatarEl.appendChild(btn);
    }
  } else {
    // Pas dans un groupe : afficher juste mon avatar
    wrap.appendChild(creerAvatarMembre(monSkin, monPseudoLocal, true, false, 0));
  }
}

function creerAvatarMembre(skin, pseudo, isMe, isHost, idx, ready) {
  var area = document.createElement('div');
  area.className = 'salon-avatar-area ' + (isMe ? 'salon-avatar-me' : 'salon-avatar-mate-' + Math.min(idx, 5));
  if (isHost) {
    var badge = document.createElement('div');
    badge.className = 'salon-avatar-host-badge';
    badge.textContent = '★ HOST';
    area.appendChild(badge);
  }
  var img = document.createElement('img');
  img.className = 'salon-avatar-skin';
  img.src = skin || 'skin/gratuit/skin-de-base-garcon.svg';
  img.alt = pseudo;
  area.appendChild(img);
  var label = document.createElement('div');
  label.className = 'salon-avatar-pseudo';
  label.textContent = pseudo || '---';
  area.appendChild(label);
  // Indicateur "pret" : vert si pret, rouge sinon (afficher uniquement en groupe)
  if (typeof _monGroupeData !== 'undefined' && _monGroupeData) {
    var indic = document.createElement('div');
    indic.className = 'salon-pret-indic ' + (ready ? 'pret-oui' : 'pret-non');
    indic.innerHTML = ready ? '✓ PRET' : '✕ PAS PRET';
    if (isMe) {
      indic.style.cursor = 'pointer';
      indic.title = 'Cliquer pour changer';
      indic.onclick = function() {
        if (typeof toggleMaPrete === 'function') toggleMaPrete();
      };
    }
    area.appendChild(indic);
  }
  return area;
}

// === BURGER MENU MOBILE ===
function toggleSalonBurger() {
  var tabs = document.querySelector('.salon-tabs');
  if (tabs) tabs.classList.toggle('burger-open');
}
function fermerSalonBurger() {
  var tabs = document.querySelector('.salon-tabs');
  if (tabs) tabs.classList.remove('burger-open');
}

// === SWITCH ENTRE LES ONGLETS ===
function salonSwitchTab(tab) {
  _salonTabActive = tab;
  // Fermer le burger menu sur mobile a chaque clic d'onglet
  fermerSalonBurger();
  // MAJ visuel des boutons d'onglets
  salonSetVisualActiveTab(tab);
  // Si on clique sur JOUER : fermer toutes les popups + revenir au salon si on etait sur boutique
  if (tab === 'jouer') {
    salonFermerToutesPopups();
    var boutiqueEl = document.getElementById('boutique-skins');
    if (boutiqueEl && boutiqueEl.classList.contains('active')) {
      showScreen('menu-salon');
    }
    salonRafraichir();
    return;
  }
  // Fermer les autres popups avant d'ouvrir la nouvelle
  salonFermerToutesPopups();
  // Si on n'est pas sur boutique mais qu'on a un autre ecran actif (boutique-skins),
  // revenir au salon avant d'ouvrir la popup
  if (tab !== 'boutique') {
    var boutiqueEl = document.getElementById('boutique-skins');
    if (boutiqueEl && boutiqueEl.classList.contains('active')) {
      showScreen('menu-salon');
    }
  }
  // Pour les autres onglets : ouvrir les popups/screens existants
  switch (tab) {
    case 'casier':    if (typeof ouvrirCabine === 'function') ouvrirCabine(); break;
    case 'boutique':  showScreen('boutique-skins'); break;
    case 'passe':     if (typeof ouvrirPasse === 'function') ouvrirPasse(); break;
    case 'quetes':    if (typeof ouvrirQuetes === 'function') ouvrirQuetes(); break;
    case 'classement':if (typeof ouvrirClassement === 'function') ouvrirClassement(); break;
    case 'profil':    if (typeof ouvrirProfil === 'function') ouvrirProfil(); break;
    case 'params':    if (typeof ouvrirParams === 'function') ouvrirParams(); break;
  }
}

// MAJ visuelle de l'onglet actif (sans changer le comportement)
function salonSetVisualActiveTab(tab) {
  document.querySelectorAll('.salon-tab').forEach(function(btn) {
    if (btn.dataset.tab === tab) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

// Ferme toutes les popups associees aux onglets du salon
function salonFermerToutesPopups() {
  // Popups standards
  var popups = ['popup-passe-dedie', 'popup-quetes', 'popup-classement', 'popup-profil', 'popup-params'];
  popups.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
  // Casier : utilise des classes specifiques (cabine-popup + cabine-overlay)
  var cabinePop = document.getElementById('cabine-popup');
  var cabineOver = document.getElementById('cabine-overlay');
  if (cabinePop) cabinePop.classList.remove('visible');
  if (cabineOver) cabineOver.classList.remove('visible');
  // Nettoyer l'URL ?profil=... pour eviter le re-open au reload
  if (window.location.search.indexOf('profil=') >= 0) {
    try { window.history.replaceState({}, '', window.location.pathname); } catch(e) {}
  }
}

// Detecte automatiquement quelle popup est ouverte et MAJ l'onglet actif
// (utile quand l'utilisateur ferme une popup via son X et qu'on doit retomber sur JOUER)
function salonAutoUpdateActiveTab() {
  if (!salonEstActif()) return;
  var menuSalon = document.getElementById('menu-salon');
  if (!menuSalon || !menuSalon.classList.contains('active')) return;
  var tabsByPopup = {
    'cabine-popup': 'casier',
    'popup-passe-dedie': 'passe',
    'popup-quetes': 'quetes',
    'popup-classement': 'classement',
    'popup-profil': 'profil',
    'popup-params': 'params'
  };
  var openTab = 'jouer';
  for (var popupId in tabsByPopup) {
    var el = document.getElementById(popupId);
    if (el && el.classList.contains('visible')) { openTab = tabsByPopup[popupId]; break; }
  }
  // Boutique : ecran actif
  var boutique = document.getElementById('boutique-skins');
  if (boutique && boutique.classList.contains('active')) openTab = 'boutique';
  if (openTab !== _salonTabActive) {
    _salonTabActive = openTab;
    salonSetVisualActiveTab(openTab);
  }
}

// Poller pour suivre les fermetures de popups
setInterval(salonAutoUpdateActiveTab, 250);

// === LANCER UNE PARTIE DEPUIS LE SALON ===
function salonJouer() {
  var modeOnline = document.getElementById('salon-sel-online').value;
  var modeJeu = document.getElementById('salon-sel-jeu').value;

  if (modeOnline === 'hors-ligne') {
    // Hors ligne : aller a l'ecran config
    showScreen('config-horsline');
    return;
  }

  // Online : QUICK PLAY → cherche une partie dispo, sinon en cree une
  if (typeof currentOnlineMode !== 'undefined') {
    currentOnlineMode = modeJeu;
  }
  if (typeof showNotif === 'function') showNotif('Recherche d\'une partie...', 'info');
  salonQuickPlay(modeJeu);
}

// === QUICK PLAY : auto-join ou auto-create ===
function salonQuickPlay(modeJeu) {
  if (typeof db === 'undefined') {
    if (typeof showNotif === 'function') showNotif('Pas de connexion', 'error');
    return;
  }
  // Chercher les parties disponibles du bon mode (en lobby, pas pleines, publiques)
  db.collection('parties').where('phase', '==', 'lobby').get().then(function(snap) {
    var partiesDispo = [];
    snap.forEach(function(doc) {
      var p = doc.data();
      var pMode = p.gameMode || 'virus';
      if (pMode !== modeJeu) return;
      if (p.private) return; // pas de partie privee en quick play
      if (p.isTestDev) return; // pas de partie test dev
      if (p.joueurs >= p.maxJoueurs) return; // pleine
      partiesDispo.push({ id: doc.id, data: p });
    });
    if (partiesDispo.length > 0) {
      // Choisir la partie la plus remplie (mais pas pleine) → plus rapide a demarrer
      partiesDispo.sort(function(a, b) { return b.data.joueurs - a.data.joueurs; });
      var partie = partiesDispo[0];
      if (typeof showNotif === 'function') showNotif('Partie trouvee, on te connecte...', 'info');
      if (typeof rejoindrePartie === 'function') rejoindrePartie(partie.id);
    } else {
      // Aucune partie dispo → en creer une automatiquement (toi = host)
      if (typeof showNotif === 'function') showNotif('Aucune partie, creation en cours...', 'info');
      salonAutoCreerPartie(modeJeu);
    }
  }).catch(function() {
    if (typeof showNotif === 'function') showNotif('Erreur recherche, creation en cours...', 'warn');
    salonAutoCreerPartie(modeJeu);
  });
}

// === Auto-creer une partie avec defaults ===
function salonAutoCreerPartie(modeJeu) {
  var pseudo = (typeof getPseudo === 'function') ? getPseudo() : '';
  if (!pseudo) {
    if (typeof showNotif === 'function') showNotif('Tu dois etre connecte', 'error');
    return;
  }
  var skin = (typeof getSkinFichier === 'function' && typeof getSkin === 'function')
    ? getSkinFichier(getSkin()) : 'skin/gratuit/skin-de-base-garcon.svg';
  var maxJoueurs = (modeJeu === 'cachecache') ? 10 : 8;
  var nomPartie = 'Partie de ' + pseudo;

  db.collection('players').doc(monPlayerId).set({
    playerId: monPlayerId, pseudo: pseudo, skin: skin,
    online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(function() {
    return db.collection('parties').add({
      nom: nomPartie,
      hostPlayerId: monPlayerId,
      hostPseudo: pseudo,
      maxJoueurs: maxJoueurs,
      mechants: 1,
      journaliste: false, fanatique: false, espion: false, cherif: false,
      langue: (typeof currentLang !== 'undefined' ? currentLang : 'fr'),
      couleur: '#e74c3c',
      phase: 'lobby',
      joueurs: 1,
      listeJoueurs: [pseudo],
      private: false,
      isTestDev: false,
      gameMode: modeJeu,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(function(docRef) {
    var partyId = docRef.id;
    var monPet = (typeof getPetEquipe === 'function') ? getPetEquipe() : '';
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
      if (typeof showNotif === 'function') showNotif('Partie creee, attends d\'autres joueurs !', 'success');
      showScreen('salle-attente');
      if (typeof subscribeToParty === 'function') subscribeToParty(partyId);
      if (typeof updateSalleAttente === 'function') updateSalleAttente();
    });
  }).catch(function(err) {
    console.error('Erreur creation auto-partie', err);
    if (typeof showNotif === 'function') showNotif('Erreur creation partie', 'error');
  });
}
