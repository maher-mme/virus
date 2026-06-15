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

  // Niveau (calcule depuis l'XP, comme dans le profil)
  var niveauEl = document.getElementById('salon-niveau');
  if (niveauEl && typeof db !== 'undefined' && typeof monPlayerId !== 'undefined' && monPlayerId) {
    db.collection('players').doc(monPlayerId).get().then(function(doc) {
      if (!doc.exists) { niveauEl.textContent = 'Niv. 1'; return; }
      var data = doc.data();
      var level = 1;
      if (typeof calculerNiveau === 'function') {
        var xp = data.xp || 0;
        var info = calculerNiveau(xp);
        if (info && info.niveau) level = info.niveau;
      }
      // data.level prend la priorite seulement s'il est superieur (cas reset XP)
      if (data.level && data.level > level) level = data.level;
      niveauEl.textContent = 'Niv. ' + level;
    }).catch(function() {
      niveauEl.textContent = 'Niv. 1';
    });
  }

  // Avatar (skin equipe)
  var avatarSkin = document.getElementById('salon-avatar-skin');
  if (avatarSkin && typeof getSkinFichier === 'function' && typeof getSkin === 'function') {
    avatarSkin.src = getSkinFichier(getSkin());
  }

  // Option CACHE-CACHE dans le selecteur de jeu (visible si feature flag active)
  var ccOpt = document.getElementById('salon-sel-cachecache-opt');
  if (ccOpt) {
    var ccActive = (typeof isFeatureActive === 'function') && isFeatureActive('cachecache');
    ccOpt.style.display = ccActive ? '' : 'none';
  }
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

  // Online : definir le mode et aller au sous-menu (creer/trouver)
  if (typeof currentOnlineMode !== 'undefined') {
    currentOnlineMode = modeJeu; // 'virus' ou 'cachecache'
  }
  // Adapter le titre du sous-menu
  var titreEl = document.getElementById('moa-titre');
  if (titreEl) {
    if (modeJeu === 'cachecache') {
      titreEl.textContent = 'CACHE-CACHE';
      titreEl.style.color = '#3498db';
    } else {
      titreEl.textContent = 'VIRUS';
      titreEl.style.color = '';
    }
  }
  showScreen('menu-online-actions');
}
