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

  // Hub de jeux (card CREER grisee si feature flag inactif)
  salonRefreshHub();

  // Bouton JOUER / PRET selon le contexte (seul vs en groupe)
  salonRafraichirBtnJouer();

  // Charger la galerie des mondes publies (une fois, listener persistent)
  salonChargerMondes();

  // Moderation (admin dev uniquement) : ecoute les nouveaux niveaux en attente
  salonStartModListener();
}

// === SYSTEME D'ADMINS (Firestore) ===
// admins/{playerId} = { pseudo, grantedBy, grantedAt }
// Owner Obstinate reste hardcode (jamais dans cette liste, mais toujours admin).
var _admins = {};             // playerId → { pseudo, grantedBy, grantedAt }
var _adminsPseudos = {};      // pseudo lowercase → true (utilise par isAdmin() dans account.js)
var _adminsUnsub = null;
var _adminsIsFirstLoad = true;
function initAdmins() {
  if (typeof db === 'undefined') return;
  if (_adminsUnsub) return;
  _adminsUnsub = db.collection('admins').onSnapshot(function(snap) {
    _admins = {};
    _adminsPseudos = {};
    snap.forEach(function(doc) {
      var d = doc.data() || {};
      _admins[doc.id] = d;
      if (d.pseudo) _adminsPseudos[String(d.pseudo).trim().toLowerCase()] = true;
    });
    // Detecter si MOI je viens d'etre promu → notification bienvenue
    if (!_adminsIsFirstLoad && typeof monPlayerId !== 'undefined' && _admins[monPlayerId]) {
      var deja = localStorage.getItem('virus_admin_notified');
      if (deja !== '1') {
        localStorage.setItem('virus_admin_notified', '1');
        if (typeof showNotif === 'function') {
          showNotif('Tu es maintenant admin ! Editeur et moderation debloques.', 'success');
        }
      }
    } else if (!_admins[typeof monPlayerId !== 'undefined' ? monPlayerId : '']) {
      // Si je ne suis plus admin, reset le flag notif
      localStorage.removeItem('virus_admin_notified');
    }
    _adminsIsFirstLoad = false;
    if (typeof salonRefreshHub === 'function') salonRefreshHub();
    if (typeof majAdminsListUI === 'function') majAdminsListUI();
  }, function() {});
}

function estAdminFirestore() {
  if (typeof monPlayerId === 'undefined' || !monPlayerId) return false;
  return !!_admins[monPlayerId];
}

// Le joueur a-t-il le droit d'ouvrir l'editeur ?
// = owner (Obstinate) OU admin Firestore (le flag creerNiveau reste un kill switch global)
function peutCreerNiveaux() {
  var flagActif = (typeof isFeatureActive === 'function') && isFeatureActive('creerNiveau');
  if (!flagActif) return false;
  var estOwner = (typeof peutOuvrirConsole === 'function') && peutOuvrirConsole();
  return estOwner || estAdminFirestore();
}

// === HUB DE JEUX : la card CREER est CACHEE pour les non-admins (non affichee) ===
function salonRefreshHub() {
  var card = document.getElementById('salon-hub-card-creer');
  if (!card) return;
  var actif = peutCreerNiveaux();
  card.style.display = actif ? '' : 'none';
}

// === OUVRIR L'EDITEUR DE NIVEAUX ===
function salonOuvrirCreer() {
  if (!peutCreerNiveaux()) {
    if (typeof showNotif === 'function') showNotif('Reserve aux admins', 'info');
    return;
  }
  if (typeof ED === 'undefined' || typeof ED.open !== 'function') {
    if (typeof showNotif === 'function') showNotif('Editeur indisponible', 'error');
    return;
  }
  ED.open();
}

// === GESTION DES ADMINS (UI dev owner) ===
function ajouterAdmin() {
  if (typeof peutOuvrirConsole !== 'function' || !peutOuvrirConsole()) return;
  var input = document.getElementById('input-admin-pseudo');
  var pseudo = (input && input.value || '').trim();
  if (!pseudo) { showNotif('Entre un pseudo', 'warn'); return; }
  if (typeof db === 'undefined') return;
  db.collection('players').where('pseudo', '==', pseudo).limit(1).get()
    .then(function(snap) {
      if (snap.empty) { showNotif('Joueur introuvable', 'error'); return; }
      var doc = snap.docs[0];
      var pid = doc.id;
      var monPseudo = (typeof getPseudo === 'function') ? getPseudo() : 'owner';
      return db.collection('admins').doc(pid).set({
        pseudo: pseudo,
        grantedBy: monPseudo,
        grantedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function() {
        showNotif(pseudo + ' est maintenant admin', 'success');
        if (input) input.value = '';
      });
    }).catch(function() { showNotif('Erreur', 'error'); });
}

function retirerAdmin(playerId) {
  if (typeof peutOuvrirConsole !== 'function' || !peutOuvrirConsole()) return;
  var pseudo = _admins[playerId] && _admins[playerId].pseudo;
  if (!window.confirm('Retirer ' + (pseudo || 'ce joueur') + ' des admins ?')) return;
  db.collection('admins').doc(playerId).delete().then(function() {
    showNotif('Retire', 'success');
  }).catch(function() { showNotif('Erreur', 'error'); });
}

function majAdminsListUI() {
  var container = document.getElementById('admins-list');
  if (!container) return;
  container.innerHTML = '';
  var ids = Object.keys(_admins);
  if (ids.length === 0) {
    container.innerHTML = '<div style="color:#95a5a6;font-size:11px;padding:8px;">Aucun admin pour l\'instant.</div>';
    return;
  }
  ids.forEach(function(pid) {
    var d = _admins[pid];
    var row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML =
      '<span class="admin-pseudo">' + (d.pseudo || '?') + '</span>' +
      '<button class="admin-remove" title="Retirer">&times;</button>';
    row.querySelector('.admin-remove').onclick = function() { retirerAdmin(pid); };
    container.appendChild(row);
  });
}

// Auto-init
setTimeout(initAdmins, 2000);

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

// === SELECTION DU JEU DANS LE HUB (clic sur une card) ===
// Met juste a jour le titre + la card active (pas de lancement direct).
// Le lancement se fait via salonJouer() (bouton JOUER).
var _salonGameSelected = 'virus';
var _salonSelectedMonde = null;   // niveau custom actuellement selectionne (Phase 3)

function salonSelectGame(gameId) {
  // Card CREER : verifier feature flag (sinon notif et on ne change rien)
  if (gameId === 'creer') {
    var actif = (typeof isFeatureActive === 'function') && isFeatureActive('creerNiveau');
    if (!actif) {
      if (typeof showNotif === 'function') showNotif('Bientot disponible !', 'info');
      return;
    }
  }
  _salonGameSelected = gameId;
  _salonSelectedMonde = null;
  // MAJ titre au-dessus du selecteur ONLINE
  var titreEl = document.getElementById('salon-jeu-titre');
  if (titreEl) titreEl.textContent = gameId === 'creer' ? 'CREER' : 'VIRUS';
  // Cacher le selecteur MODE si ce n'est pas VIRUS (pas d'online/offline pour CREER ou MONDE)
  var modeWrap = document.getElementById('salon-mode-wrap');
  if (modeWrap) modeWrap.style.display = (gameId === 'virus') ? '' : 'none';
  // Marquer la card active + deselect mondes
  ['virus', 'creer'].forEach(function(id) {
    var card = document.getElementById('salon-hub-card-' + id);
    if (card) card.classList.toggle('salon-hub-card-selected', id === gameId);
  });
  document.querySelectorAll('.salon-monde-card').forEach(function(c) {
    c.classList.remove('salon-monde-selected');
  });
}

// === SELECTION D'UN MONDE CUSTOM (Phase 3) ===
function salonSelectMonde(levelData, cardEl) {
  _salonGameSelected = 'monde';
  _salonSelectedMonde = levelData;
  var titreEl = document.getElementById('salon-jeu-titre');
  if (titreEl) titreEl.textContent = (levelData.titre || 'MONDE').toUpperCase();
  // Un monde custom = solo local, pas de mode online/offline
  var modeWrap = document.getElementById('salon-mode-wrap');
  if (modeWrap) modeWrap.style.display = 'none';
  // Deselect autres cards
  ['virus', 'creer'].forEach(function(id) {
    var card = document.getElementById('salon-hub-card-' + id);
    if (card) card.classList.remove('salon-hub-card-selected');
  });
  document.querySelectorAll('.salon-monde-card').forEach(function(c) {
    c.classList.remove('salon-monde-selected');
  });
  if (cardEl) cardEl.classList.add('salon-monde-selected');
}

// === CHARGEMENT DES MONDES PUBLIES (Firestore) ===
// Filtre : status == 'approved' OU c'est mon niveau (createur voit ses siens meme si refuses)
var _salonMondesUnsub = null;
function salonChargerMondes() {
  if (typeof db === 'undefined') return;
  if (_salonMondesUnsub) return;
  _salonMondesUnsub = db.collection('customLevels')
    .orderBy('createdAt', 'desc')
    .limit(60)
    .onSnapshot(function(snap) {
      var container = document.getElementById('salon-mondes-list');
      if (!container) return;
      container.innerHTML = '';
      var mesId = (typeof monPlayerId !== 'undefined') ? monPlayerId : '';
      var items = [];
      snap.forEach(function(doc) {
        var lvl = doc.data();
        lvl._id = doc.id;
        var status = lvl.status || 'approved';   // Anciens niveaux sans status = valides
        var estAMoi = mesId && lvl.creatorId === mesId;
        if (status === 'approved' || estAMoi) items.push(lvl);
      });
      if (items.length === 0) {
        var msg = (typeof t === 'function' ? t('salonMondesEmpty') : null) || 'Aucun monde publie pour l\'instant. Sois le premier !';
        container.innerHTML = '<div class="salon-mondes-empty">' + msg + '</div>';
        return;
      }
      items.forEach(function(lvl) {
        container.appendChild(salonCreerCardMonde(lvl));
      });
    }, function(err) {
      console.error('Erreur mondes', err);
    });
}

function salonCreerCardMonde(lvl) {
  var div = document.createElement('div');
  div.className = 'salon-monde-card';
  var titre = (lvl.titre || 'Sans titre').replace(/[<>]/g, '');
  var auteur = (lvl.creatorPseudo || '?').replace(/[<>]/g, '');
  var by = (typeof t === 'function' ? t('salonMondesBy') : null) || 'Par';
  var status = lvl.status || 'approved';
  var badge = '';
  if (status === 'pending')      badge = ' <span class="salon-monde-badge badge-pending">EN VERIF.</span>';
  else if (status === 'refused') badge = ' <span class="salon-monde-badge badge-refused">REFUSE</span>';
  // Bouton supprimer : uniquement pour le createur du niveau (et les admins)
  var mesId = (typeof monPlayerId !== 'undefined') ? monPlayerId : '';
  var estAMoi = mesId && lvl.creatorId === mesId;
  var estAdmin = (typeof peutOuvrirConsole === 'function') && peutOuvrirConsole();
  var canDelete = estAMoi || estAdmin;
  var deleteBtn = canDelete ? '<button class="salon-monde-delete" title="Supprimer">&#128465;</button>' : '';
  div.innerHTML =
    '<div class="salon-monde-thumb">&#127918;</div>' +
    '<div class="salon-monde-info">' +
      '<div class="salon-monde-title">' + titre + badge + '</div>' +
      '<div class="salon-monde-author">' + by + ' ' + auteur + '</div>' +
      '<div class="salon-monde-stats">&#9658; ' + (lvl.plays || 0) + '  &#10084; ' + (lvl.likes || 0) + '</div>' +
    '</div>' +
    deleteBtn;
  div.onclick = function() { salonSelectMonde(lvl, div); };
  if (canDelete) {
    var btn = div.querySelector('.salon-monde-delete');
    btn.onclick = function(e) {
      e.stopPropagation();
      salonSupprimerMonde(lvl);
    };
  }
  return div;
}

// === Supprimer un monde publie (createur ou admin uniquement) ===
function salonSupprimerMonde(lvl) {
  if (!lvl || !lvl._id) return;
  if (typeof db === 'undefined') return;
  var msg = 'Supprimer definitivement "' + (lvl.titre || 'Sans titre') + '" ?';
  if (!window.confirm(msg)) return;
  db.collection('customLevels').doc(lvl._id).delete().then(function() {
    if (typeof showNotif === 'function') showNotif('Monde supprime', 'success');
  }).catch(function(err) {
    console.error('Delete monde error', err);
    if (typeof showNotif === 'function') showNotif('Erreur suppression', 'error');
  });
}

// === MODERATION DES MONDES (admin dev uniquement) ===
var _salonModUnsub = null;
var _salonModVus = {};
function salonStartModListener() {
  if (typeof db === 'undefined') return;
  if (typeof peutOuvrirConsole !== 'function' || !peutOuvrirConsole()) return;
  if (_salonModUnsub) return;
  var first = true;
  _salonModUnsub = db.collection('customLevels')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .onSnapshot(function(snap) {
      var count = snap.size;
      var btn = document.getElementById('salon-btn-moderation');
      if (btn) {
        btn.style.display = count > 0 ? '' : 'none';
        var badge = btn.querySelector('.salon-mod-count');
        if (badge) badge.textContent = count;
      }
      if (!first) {
        snap.docChanges().forEach(function(ch) {
          if (ch.type === 'added' && !_salonModVus[ch.doc.id]) {
            _salonModVus[ch.doc.id] = true;
            var d = ch.doc.data();
            if (typeof showNotif === 'function') {
              showNotif('Nouveau monde a moderer : ' + (d.titre || 'Sans titre'), 'info');
            }
          }
        });
      } else {
        snap.forEach(function(doc) { _salonModVus[doc.id] = true; });
      }
      first = false;
    }, function(err) { console.error('Erreur mod listener', err); });
}

function salonOuvrirModeration() {
  var pop = document.getElementById('popup-moderation-mondes');
  if (!pop) return;
  pop.classList.add('visible');
  var container = document.getElementById('moderation-list');
  if (!container) return;
  container.innerHTML = '<div style="color:#95a5a6;text-align:center;padding:20px;">Chargement...</div>';
  db.collection('customLevels').where('status', '==', 'pending').orderBy('createdAt', 'desc').get()
    .then(function(snap) {
      container.innerHTML = '';
      if (snap.empty) {
        container.innerHTML = '<div style="color:#95a5a6;text-align:center;padding:20px;">Aucun monde en attente.</div>';
        return;
      }
      snap.forEach(function(doc) {
        var lvl = doc.data();
        lvl._id = doc.id;
        var card = document.createElement('div');
        card.className = 'moderation-card';
        card.innerHTML =
          '<div class="moderation-info">' +
            '<div class="moderation-titre">' + (lvl.titre || 'Sans titre').replace(/[<>]/g, '') + '</div>' +
            '<div class="moderation-auteur">Par ' + (lvl.creatorPseudo || '?').replace(/[<>]/g, '') + ' &nbsp;•&nbsp; ' + (lvl.platforms || []).length + ' blocs</div>' +
          '</div>' +
          '<div class="moderation-actions">' +
            '<button class="btn-mod btn-mod-test">&#9658; TESTER</button>' +
            '<button class="btn-mod btn-mod-ok">&#10004; ACCEPTER</button>' +
            '<button class="btn-mod btn-mod-ko">&#10006; REFUSER</button>' +
          '</div>';
        card.querySelector('.btn-mod-test').onclick = function() {
          salonFermerModeration();
          salonLancerMonde(lvl);
        };
        card.querySelector('.btn-mod-ok').onclick = function() { salonModererMonde(lvl._id, 'approved', card); };
        card.querySelector('.btn-mod-ko').onclick = function() { salonModererMonde(lvl._id, 'refused', card); };
        container.appendChild(card);
      });
    }).catch(function() {
      container.innerHTML = '<div style="color:#e74c3c;text-align:center;">Erreur de chargement.</div>';
    });
}

function salonFermerModeration() {
  var pop = document.getElementById('popup-moderation-mondes');
  if (pop) pop.classList.remove('visible');
}

function salonModererMonde(levelId, status, card) {
  if (typeof db === 'undefined' || !levelId) return;
  db.collection('customLevels').doc(levelId).update({
    status: status,
    moderatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    if (typeof showNotif === 'function') {
      showNotif(status === 'approved' ? 'Monde approuve' : 'Monde refuse', 'success');
    }
    if (card && card.parentNode) card.parentNode.removeChild(card);
  }).catch(function() {
    if (typeof showNotif === 'function') showNotif('Erreur moderation', 'error');
  });
}

// === LANCEMENT D'UN MONDE CUSTOM ===
function salonLancerMonde(lvl) {
  if (!lvl || !lvl.spawn || !lvl.endZone || !lvl.platforms) {
    if (typeof showNotif === 'function') showNotif('Niveau invalide', 'error');
    return;
  }
  if (typeof SE === 'undefined') {
    if (typeof showNotif === 'function') showNotif('Moteur indisponible', 'error');
    return;
  }
  // Incrementer le compteur de plays (silencieux)
  if (typeof db !== 'undefined' && lvl._id && typeof firebase !== 'undefined') {
    db.collection('customLevels').doc(lvl._id).update({
      plays: firebase.firestore.FieldValue.increment(1)
    }).catch(function() {});
  }
  // Phase 5 : chercher ou creer une session multi pour ce niveau
  salonTrouverOuCreerSession(lvl._id, function(sessionId) {
    if (typeof showScreen === 'function') showScreen('se-test');
    setTimeout(function() {
      SE.init('se-canvas', {
        width: lvl.width,
        height: lvl.height,
        spawn: lvl.spawn,
        endZone: lvl.endZone,
        platforms: lvl.platforms
      });
      SE.start();
      // Attacher la session multi APRES l'init (SE.player doit exister)
      if (sessionId) SE.attachSession(sessionId);
    }, 50);
  });
}

// === PHASE 5 : trouver une session active pour ce monde, sinon en creer une ===
// Une session = un doc dans mondeSessions/{sessionId} + subcollection players/.
// Reutilisee tant qu'elle est "recente" (< 5 min) et pas pleine (< 8 joueurs).
function salonTrouverOuCreerSession(levelId, callback) {
  if (typeof db === 'undefined' || !levelId) { callback(null); return; }
  var recent = Date.now() - 5 * 60 * 1000;
  db.collection('mondeSessions')
    .where('levelId', '==', levelId)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get()
    .then(function(snap) {
      var candidate = null;
      snap.forEach(function(doc) {
        if (candidate) return;
        var d = doc.data();
        if (!d || !d.createdAt) return;
        if (d.createdAt.toMillis() < recent) return;   // trop vieille
        if ((d.playerCount || 0) >= 8) return;         // pleine
        candidate = doc.id;
      });
      if (candidate) { callback(candidate); return; }
      // Aucune session active : en creer une
      db.collection('mondeSessions').add({
        levelId: levelId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        playerCount: 1
      }).then(function(ref) { callback(ref.id); })
        .catch(function() { callback(null); });
    })
    .catch(function() { callback(null); });
}

// === EST-CE QUE JE SUIS DANS UN GROUPE AVEC AU MOINS 1 AUTRE MEMBRE ? ===
function salonEstEnGroupeMulti() {
  return typeof _monGroupeData !== 'undefined' && _monGroupeData &&
         _monGroupeData.members && _monGroupeData.members.length > 1;
}

// === MAJ DU BOUTON JOUER / PRET selon contexte ===
function salonRafraichirBtnJouer() {
  var btn = document.getElementById('salon-btn-jouer');
  if (!btn) return;
  if (salonEstEnGroupeMulti()) {
    // En groupe : afficher PRET (toggle) avec couleur differente si deja pret
    var moi = _monGroupeData.members.find(function(m) { return m.playerId === monPlayerId; });
    var jeSuisPret = moi && moi.ready;
    btn.textContent = jeSuisPret ? '✓ PRET' : '▶ PRET ?';
    btn.classList.toggle('salon-btn-ready', !!jeSuisPret);
  } else {
    btn.textContent = '▶ JOUER';
    btn.classList.remove('salon-btn-ready');
  }
}

// === LANCER UNE PARTIE DEPUIS LE SALON ===
function salonJouer() {
  // 1) En groupe avec d'autres membres : le bouton fait toggle "pret" au lieu de lancer
  if (salonEstEnGroupeMulti()) {
    if (typeof toggleMaPrete === 'function') toggleMaPrete();
    return;
  }
  // 2) Routing selon le jeu actuellement selectionne dans le hub
  if (_salonGameSelected === 'creer') {
    if (typeof salonOuvrirCreer === 'function') salonOuvrirCreer();
    return;
  }
  if (_salonGameSelected === 'monde') {
    salonLancerMonde(_salonSelectedMonde);
    return;
  }
  // 3) VIRUS : flow normal (quick play)
  var modeOnline = document.getElementById('salon-sel-online').value;
  var modeJeu = 'virus';

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
      // Aucune partie dispo → ouvrir l'ecran de creation (host = toi)
      if (typeof showNotif === 'function') showNotif('Aucune partie dispo — cree la tienne', 'info');
      currentOnlineMode = modeJeu;
      showScreen('creer-partie');
    }
  }).catch(function() {
    if (typeof showNotif === 'function') showNotif('Erreur recherche — cree une partie', 'warn');
    currentOnlineMode = modeJeu;
    showScreen('creer-partie');
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
  var maxJoueurs = 8;
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
