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

  // Niveau (depuis localStorage virusLevel ou Firebase)
  var niveauEl = document.getElementById('salon-niveau');
  if (niveauEl) {
    var level = parseInt(localStorage.getItem('virusLevel')) || 1;
    niveauEl.textContent = 'Niv. ' + level;
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

// === SWITCH ENTRE LES ONGLETS ===
function salonSwitchTab(tab) {
  _salonTabActive = tab;
  // MAJ visuel des boutons d'onglets
  document.querySelectorAll('.salon-tab').forEach(function(btn) {
    if (btn.dataset.tab === tab) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  // Comportement selon l'onglet
  if (tab === 'jouer') {
    // Reste sur le salon, juste rafraichir
    salonRafraichir();
    return;
  }
  // Pour les autres onglets : ouvrir les popups/screens existants
  switch (tab) {
    case 'casier':    if (typeof ouvrirCabine === 'function') ouvrirCabine(); break;
    case 'boutique':  showScreen('boutique-skins'); break;
    case 'passe':     if (typeof ouvrirPasse === 'function') ouvrirPasse(); break;
    case 'quetes':    if (typeof ouvrirQuetes === 'function') ouvrirQuetes(); break;
    case 'classement':if (typeof ouvrirClassement === 'function') ouvrirClassement(); break;
    case 'params':    if (typeof ouvrirParams === 'function') ouvrirParams(); break;
  }
  // Apres avoir ouvert la popup, revenir visuellement sur l'onglet JOUER
  // (sinon l'onglet reste "actif" alors que la popup est par-dessus)
  setTimeout(function() {
    document.querySelectorAll('.salon-tab').forEach(function(btn) {
      if (btn.dataset.tab === 'jouer') btn.classList.add('active');
      else btn.classList.remove('active');
    });
    _salonTabActive = 'jouer';
  }, 100);
}

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
