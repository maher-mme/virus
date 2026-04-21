// Navigation entre ecrans

// === DETECTION DE MISE A JOUR ===
var CURRENT_VERSION = '2.8.9';
var _updateDismissed = false;
var _updateForceTimer = null;

function initVersionCheck() {
  if (typeof db === 'undefined') {
    setTimeout(initVersionCheck, 1000);
    return;
  }
  db.collection('version').doc('version').onSnapshot(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    var serverVersion = data.version;
    if (serverVersion && serverVersion !== CURRENT_VERSION) {
      // Ne pas afficher si deja vu pour cette version
      var dismissed = localStorage.getItem('updateDismissed');
      if (dismissed === serverVersion) return;
      afficherPopupMiseAJour(serverVersion);
    }
  }, function(err) {
    console.error('Erreur version check:', err);
  });
}
setTimeout(initVersionCheck, 2000);

function afficherPopupMiseAJour(newVersion) {
  if (_updateDismissed) return;
  // Si une partie est en cours OU dans la salle d'attente OU en reunion, attendre
  var enPartie = (typeof jeuActif !== 'undefined' && jeuActif);
  var enReunion = (typeof reunionEnCours !== 'undefined' && reunionEnCours);
  var enSalleAttente = !!document.querySelector('#salle-attente.active');
  var enJeu = !!document.querySelector('#jeu.active');
  if (enPartie || enReunion || enSalleAttente || enJeu) {
    setTimeout(function() { afficherPopupMiseAJour(newVersion); }, 5000);
    return;
  }
  _updateDismissed = true;
  // Verifier si le popup existe deja
  if (document.getElementById('popup-update')) return;

  var totalSeconds = 10 * 60; // 10 minutes
  var countdown = totalSeconds;

  var overlay = document.createElement('div');
  overlay.id = 'popup-update';
  overlay.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';

  var box = document.createElement('div');
  box.style.cssText = 'background:linear-gradient(180deg,#1a1a2e,#16213e);border:2px solid #f39c12;border-radius:12px;padding:15px 20px;max-width:350px;color:#ecf0f1;font-family:Arial,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);';

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  box.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
    '<span style="font-size:24px;">🔄</span>' +
    '<span style="color:#f39c12;font-weight:bold;font-size:14px;">Mise a jour v' + newVersion + '</span></div>' +
    '<p style="color:#ccc;margin:0 0 8px;font-size:12px;">Rechargement automatique dans</p>' +
    '<div style="display:flex;align-items:center;gap:10px;">' +
    '<div id="update-countdown" style="font-size:20px;font-weight:bold;color:#f39c12;">' + formatTime(countdown) + '</div>' +
    '<button id="btn-update-now" style="padding:6px 14px;background:linear-gradient(180deg,#27ae60,#219a52);border:2px solid #1e8449;border-radius:6px;color:white;font-weight:bold;cursor:pointer;font-size:12px;">Recharger</button></div>' +
    '<div style="margin-top:8px;background:#34495e;border-radius:6px;height:4px;overflow:hidden;">' +
    '<div id="update-progress" style="background:linear-gradient(90deg,#f39c12,#e67e22);height:100%;width:0%;transition:width 1s linear;border-radius:6px;"></div></div>';

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('btn-update-now').onclick = function() {
    localStorage.setItem('updateDismissed', newVersion);
    forceHardReload();
  };

  var countdownEl = document.getElementById('update-countdown');
  var progressEl = document.getElementById('update-progress');

  var interval = setInterval(function() {
    countdown--;
    if (countdownEl) countdownEl.textContent = formatTime(countdown);
    if (progressEl) progressEl.style.width = (((totalSeconds - countdown) / totalSeconds) * 100) + '%';
    if (countdown <= 0) {
      clearInterval(interval);
      forceHardReload();
    }
  }, 1000);
}

function forceHardReload() {
  // Vider le cache du Service Worker si present
  if ('caches' in window) {
    caches.keys().then(function(names) {
      names.forEach(function(name) { caches.delete(name); });
    });
  }
  // Forcer un rechargement complet sans cache
  window.location.href = window.location.pathname + '?nocache=' + Date.now();
}

// Detecteur d'ancienne version (au chargement)
(function() {
  var storedVersion = localStorage.getItem('virusVersion');
  if (storedVersion && storedVersion !== CURRENT_VERSION) {
    // L'utilisateur vient de mettre a jour
    localStorage.setItem('virusVersion', CURRENT_VERSION);
  } else if (!storedVersion) {
    localStorage.setItem('virusVersion', CURRENT_VERSION);
  }
})();

// === ROUTING (URLs propres) ===
var ROUTES = {
  '/': 'menu-principal',
  '/online/': 'menu-online',
  '/offline/': 'config-horsline',
  '/shop/': 'boutique-skins',
  '/settings/': 'ecran-compte',
  '/online/create/': 'creer-partie',
  '/online/join/': 'liste-parties',
  '/comments/': '_comments',
  '/game/': 'jeu',
  '/lobby/': 'salle-attente'
};

// Inverse : screen ID -> URL
var SCREEN_TO_ROUTE = {};
(function() {
  for (var route in ROUTES) {
    SCREEN_TO_ROUTE[ROUTES[route]] = route;
  }
})();

// Trouver le basePath (pour GitHub Pages sous /virus/ par ex.)
var _basePath = '';
(function() {
  var path = window.location.pathname;
  // Detecter si on est sous un sous-dossier (ex: /virus/)
  // On cherche le premier segment qui correspond a un repo name
  for (var route in ROUTES) {
    var idx = path.indexOf(route);
    if (idx > 0 && route !== '/') {
      _basePath = path.substring(0, idx);
      return;
    }
  }
  // Sinon verifier si le path finit par /index.html ou contient un segment de base
  var segments = path.split('/').filter(function(s) { return s.length > 0; });
  if (segments.length > 0) {
    // Verifier si le dernier segment est une route connue
    var lastPart = '/' + segments[segments.length - 1] + '/';
    if (!ROUTES[lastPart]) {
      // C'est probablement le base path
      _basePath = '/' + segments[0];
    }
  }
})();

function getRoutePath() {
  var path = window.location.pathname;
  if (_basePath && path.indexOf(_basePath) === 0) {
    path = path.substring(_basePath.length);
  }
  if (path === '' || path === '/index.html') path = '/';
  // S'assurer que ca finit par /
  if (path !== '/' && path.charAt(path.length - 1) !== '/') path += '/';
  return path;
}

function navigateTo(route, replace) {
  var fullPath = _basePath + route;
  if (replace) {
    history.replaceState({ route: route }, '', fullPath);
  } else {
    history.pushState({ route: route }, '', fullPath);
  }
}

// Gerer le bouton retour du navigateur
window.addEventListener('popstate', function(e) {
  var path = getRoutePath();
  var screenId = ROUTES[path];
  if (screenId === '_comments') {
    if (typeof ouvrirCommentaires === 'function') ouvrirCommentaires();
    return;
  }
  if (screenId) {
    showScreen(screenId, true); // true = ne pas push l'URL (on vient du popstate)
  } else {
    showScreen('menu-principal', true);
  }
});

// Au chargement, afficher le bon ecran selon l'URL
window.addEventListener('DOMContentLoaded', function() {
  // Verifier si on vient d'un redirect 404.html
  var redirectPath = sessionStorage.getItem('spa_redirect');
  if (redirectPath) {
    sessionStorage.removeItem('spa_redirect');
    navigateTo(redirectPath, true);
  }

  var path = getRoutePath();
  var screenId = ROUTES[path];
  if (screenId === '_comments') {
    setTimeout(function() {
      if (typeof ouvrirCommentaires === 'function') ouvrirCommentaires();
    }, 500);
    return;
  }
  if (screenId && screenId !== 'menu-principal' && screenId !== 'ecran-compte') {
    // Ecrans qui necessitent d'etre en partie — rediriger vers le menu
    if (screenId === 'jeu' || screenId === 'salle-attente') {
      navigateTo('/', true);
      return;
    }
    setTimeout(function() {
      if (typeof monPlayerId !== 'undefined' && monPlayerId) {
        showScreen(screenId, true);
      }
    }, 800);
  }
});

var musiqueMuted = false;
function toggleMusique() {
  var audio = document.getElementById('musique-menu');
  var btn = document.getElementById('btn-musique');
  if (!audio) return;
  if (musiqueMuted) {
    audio.play();
    if (_lobbyAudio && document.getElementById('salle-attente') && document.getElementById('salle-attente').classList.contains('active')) {
      playLobbyMusic();
    }
    btn.classList.remove('muted');
    btn.innerHTML = '&#9835;';
    musiqueMuted = false;
  } else {
    audio.pause();
    stopLobbyMusic();
    btn.classList.add('muted');
    btn.innerHTML = '&#9835;';
    musiqueMuted = true;
  }
}

var _lobbyAudio = null;

function gererMusiqueMenu(ecranId) {
  var audio = document.getElementById('musique-menu');
  if (!audio) return;
  if (ecranId === 'jeu' || ecranId === 'salle-attente') {
    audio.pause();
    audio.currentTime = 0;
  } else {
    // Arreter la musique du lobby quand on quitte le lobby
    stopLobbyMusic();
    if (!musiqueMuted && audio.paused) {
      audio.play().catch(function() {});
    }
  }

  // Musique du lobby (Minecraft)
  if (ecranId === 'salle-attente') {
    if (!musiqueMuted) playLobbyMusic();
  } else {
    stopLobbyMusic();
  }
}

function playLobbyMusic() {
  if (!_lobbyAudio) {
    _lobbyAudio = new Audio('musique/mincraft/minecraft-game-relax.wav');
    _lobbyAudio.loop = true;
    _lobbyAudio.volume = 0.3;
  }
  _lobbyAudio.play().catch(function() {});
}

function stopLobbyMusic() {
  if (_lobbyAudio) {
    _lobbyAudio.pause();
    _lobbyAudio.currentTime = 0;
  }
}

function showNotif(message, type) {
  type = type || 'error';
  var container = document.getElementById('notif-container');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'notif-toast' + (type === 'info' ? ' info' : type === 'warn' ? ' warn' : type === 'success' ? ' success' : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('fade-out');
    setTimeout(function() { toast.remove(); }, 400);
  }, 3000);
}

function choisirCampEspion(camp) {
  espionCamp = camp;
  var overlay = document.getElementById('espion-choix-overlay');
  if (overlay) overlay.style.display = 'none';

  // Sync le choix du camp en mode en ligne
  if (!modeHorsLigne && typeof myPartyPlayerDocId !== 'undefined' && myPartyPlayerDocId && typeof db !== 'undefined') {
    db.collection('partyPlayers').doc(myPartyPlayerDocId).update({ espionCamp: camp }).catch(function() {});
  }

  if (camp === 'virus') {
    showNotif(t('joinedVirus'), 'warn');
    // Colorer les pseudos des virus en rouge (comme si on etait virus)
    for (var bv = 0; bv < bots.length; bv++) {
      if (bots[bv].role === 'virus') {
        var pseudoEl = bots[bv].element.querySelector('.joueur-pseudo');
        if (pseudoEl) pseudoEl.style.color = '#e74c3c';
      }
    }
    // Les virus voient l'espion en violet - pour les bots virus, on colore le pseudo du joueur
    // (pas applicable en mode local car le joueur ne se voit pas comme les bots le voient)
  } else {
    showNotif(t('joinedInnocent'), 'info');
  }
}

function showScreen(id, fromPopstate) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  screen.classList.add('active', 'fade-in');
  setTimeout(() => screen.classList.remove('fade-in'), 300);

  // Mettre a jour l'URL
  if (!fromPopstate && SCREEN_TO_ROUTE[id]) {
    navigateTo(SCREEN_TO_ROUTE[id]);
  }

  // Gerer la musique du menu
  gererMusiqueMenu(id);

  // Zoom automatique pour petits ecrans
  autoScale();

  // Auto-lancer la visite guidee la 1ere fois sur le menu principal
  if (id === 'menu-principal' && typeof lancerVisiteGuidee === 'function' && localStorage.getItem('virusVisiteGuideeVue') !== '1') {
    setTimeout(function() { lancerVisiteGuidee(false); }, 800);
  }

  // Rafraichir la liste quand on arrive sur l'ecran
  if (id === 'liste-parties') {
    rafraichirListeParties();
    // Bouton purge admin
    var btnPurge = document.getElementById('btn-purge-parties');
    if (btnPurge) btnPurge.style.display = isAdmin() ? 'flex' : 'none';
  }

  // Generer la boutique quand on l'ouvre
  if (id === 'boutique-skins') {
    genererBoutique();
  }

  // Mettre a jour l'avatar dans la salle d'attente
  if (id === 'salle-attente') {
    updateSalleAvatar();
    salleActif = true;
    saJoueurX = 50;
    saJoueurY = 70;
    updateSallePosition();
    if (salleAnimFrame) { cancelAnimationFrame(salleAnimFrame); salleAnimFrame = null; }
    salleLoop();
  } else {
    salleActif = false;
    // Reset la camera de la salle d'attente
    var saContent = document.querySelector('#salle-attente .sa-content');
    if (saContent) {
      saContent.style.transform = '';
      saContent.style.transformOrigin = '';
      saContent.style.left = '';
      saContent.style.top = '';
    }
  }

  // Afficher/cacher le bouton amis
  var btnAmis = document.getElementById('btn-amis');
  if (btnAmis) {
    btnAmis.style.display = (id === 'ecran-compte' || id === 'jeu' || modeHorsLigne) ? 'none' : 'flex';
  }
  // Fermer le panel amis si on change d'ecran
  if (panelAmisOuvert) {
    panelAmisOuvert = false;
    var panel = document.getElementById('panel-amis');
    if (panel) {
      panel.classList.remove('panel-amis-ouvert');
      panel.classList.add('panel-amis-ferme');
    }
  }
}

function updateSalleAvatar() {
  var pseudo = getPseudo() || t('player');
  var pseudoEl = document.getElementById('sa-avatar-pseudo');
  if (pseudoEl) {
    pseudoEl.textContent = pseudo;
    if (isAdmin()) {
      pseudoEl.classList.add('pseudo-admin-text');
    } else {
      pseudoEl.classList.remove('pseudo-admin-text');
    }
  }
  appliquerSkinPartout();
}

// Toggle chat mobile (salle d'attente / reunion) - plein ecran
function toggleChat(context) {
  var chat, btn;
  if (context === 'sa') {
    chat = document.querySelector('#salle-attente .sa-chat');
    btn = document.getElementById('sa-chat-toggle');
  } else {
    chat = document.getElementById('reunion-chat');
    btn = document.getElementById('reunion-chat-toggle');
  }
  if (!chat || !btn) return;
  // Cacher le badge point rouge quand on ouvre le chat
  var badgeId = context === 'sa' ? 'sa-chat-badge' : 'reunion-chat-badge';
  var badge = document.getElementById(badgeId);
  if (badge) badge.style.display = 'none';
  var isVisible = chat.classList.contains('chat-mobile-open');
  // Rendre le parent visible (sa-droite-chat-col est display:none sur mobile)
  var chatCol = chat.closest('.sa-droite-chat-col');
  if (isVisible) {
    // Fermer le chat
    chat.classList.remove('chat-mobile-open');
    chat.style.cssText = '';
    btn.style.cssText = '';
    // Remettre le chat dans #jeu si deplace vers body
    if (context !== 'sa') {
      var jeu = document.getElementById('jeu');
      if (jeu && chat.parentNode === document.body) {
        jeu.appendChild(chat);
      }
    }
    if (chatCol) chatCol.style.display = '';
  } else {
    if (chatCol) chatCol.style.display = 'block';
    // Pour la reunion : deplacer le chat vers body (hors stacking context de #jeu)
    if (context !== 'sa' && chat.parentNode !== document.body) {
      document.body.appendChild(chat);
    }
    chat.classList.add('chat-mobile-open');
    chat.style.setProperty('display', 'flex', 'important');
    chat.style.position = 'fixed';
    chat.style.top = '50px';
    chat.style.bottom = '0';
    chat.style.left = '0';
    chat.style.right = '0';
    chat.style.width = '100%';
    chat.style.zIndex = '9999';
    chat.style.maxHeight = 'none';
    chat.style.height = 'auto';
    chat.style.borderRadius = '12px 12px 0 0';
    chat.style.boxShadow = '0 -4px 30px rgba(0,0,0,0.8)';
    chat.style.background = 'rgba(26,26,46,0.98)';
    // Bouton en haut a GAUCHE pour fermer
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.left = '10px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    btn.style.zIndex = '10000';
  }
  btn.classList.toggle('active');
}

// Deplacer le bouton toggle reunion vers body sur mobile
function ouvrirReunionChatMobile() {
  var btn = document.getElementById('reunion-chat-toggle');
  if (btn && btn.parentNode !== document.body) {
    document.body.appendChild(btn);
  }
}

// Remettre le bouton toggle et chat dans #jeu apres reunion
function fermerReunionChatMobile() {
  var jeu = document.getElementById('jeu');
  if (!jeu) return;
  var btn = document.getElementById('reunion-chat-toggle');
  var chat = document.getElementById('reunion-chat');
  if (btn && btn.parentNode === document.body) {
    btn.style.cssText = '';
    btn.classList.remove('visible', 'active');
    jeu.appendChild(btn);
  }
  if (chat && chat.parentNode === document.body) {
    chat.classList.remove('chat-mobile-open');
    chat.style.cssText = '';
    jeu.appendChild(chat);
  }
}

// ============================
// ZOOM AUTOMATIQUE (petits ecrans)
// ============================
var DESIGN_WIDTH = 1024;

function autoScale() {
  var activeScreen = document.querySelector('.screen.active');
  // Ne pas scaler l'ecran de jeu ni la salle d'attente (layouts custom)
  if (activeScreen && (activeScreen.id === 'jeu' || activeScreen.id === 'salle-attente')) {
    document.body.style.transform = '';
    document.body.style.width = '';
    document.body.style.height = '';
    return;
  }
  var vw = window.innerWidth;
  // Zoom uniquement pour les fenetres moyennes (768-1024px)
  // Ex: split-screen sur ordinateur, tablette
  // Sur mobile (<768px), le CSS responsive gere le layout
  if (vw >= 768 && vw < DESIGN_WIDTH) {
    var scale = vw / DESIGN_WIDTH;
    document.body.style.transform = 'scale(' + scale + ')';
    document.body.style.transformOrigin = 'top left';
    document.body.style.width = (100 / scale) + 'vw';
    document.body.style.height = (100 / scale) + 'vh';
  } else {
    document.body.style.transform = '';
    document.body.style.width = '';
    document.body.style.height = '';
  }
}

window.addEventListener('resize', autoScale);

// === TUTORIEL ===
var _tutoSlideActuel = 0;
var _tutoNbSlides = 7;
var tutoGuide = false;

function ouvrirTuto() {
  lancerVisiteGuidee(true);
}

function ouvrirTutoSlides() {
  var popup = document.getElementById('popup-tuto');
  if (!popup) return;
  popup.style.display = 'flex';
  _tutoSlideActuel = 0;
  _initTutoDots();
  tutoSlide(0);
}

// === VISITE GUIDEE (BULLES INTERACTIVES) ===
var _visiteEtape = 0;
var VISITE_ETAPES = [
  { selector: null, titreKey: 'tutoWelcomeTitle', texteKey: 'tutoWelcomeText', position: 'center' },
  { selector: '.btn-online', titreKey: 'tutoOnlineTitle', texteKey: 'tutoOnlineText', position: 'auto' },
  { selector: '.btn-horsline', titreKey: 'tutoOfflineTitle', texteKey: 'tutoOfflineText', position: 'auto' },
  { selector: '.btn-boutique', titreKey: 'tutoShopTitle', texteKey: 'tutoShopText', position: 'auto' },
  { selector: '.btn-casier', titreKey: 'tutoLockerTitle', texteKey: 'tutoLockerText', position: 'auto' },
  { selector: '.btn-side-quetes', titreKey: 'tutoQuestsTitle', texteKey: 'tutoQuestsText', position: 'auto' },
  { selector: '.btn-side-profil', titreKey: 'tutoProfileTitle', texteKey: 'tutoProfileText', position: 'auto' },
  { selector: '#btn-voir-regles', titreKey: 'tutoRulesTitle', texteKey: 'tutoRulesText', position: 'auto' },
  { selector: '.btn-tuto', titreKey: 'tutoEndTitle', texteKey: 'tutoEndText', position: 'auto' }
];

function lancerVisiteGuidee(force) {
  // Si pas force et deja vue, ne rien faire
  if (!force && localStorage.getItem('virusVisiteGuideeVue') === '1') return;
  // S'assurer qu'on est sur le menu principal
  var menu = document.getElementById('menu-principal');
  if (!menu || !menu.classList.contains('active')) return;
  _visiteEtape = 0;
  afficherEtapeVisite();
}

function afficherEtapeVisite() {
  fermerVisiteUI();
  if (_visiteEtape >= VISITE_ETAPES.length) {
    terminerVisite();
    return;
  }
  var etape = VISITE_ETAPES[_visiteEtape];
  var cible = etape.selector ? document.querySelector(etape.selector) : null;

  // Backdrop
  var backdrop = document.createElement('div');
  backdrop.id = 'visite-backdrop';
  backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99990;pointer-events:auto;';
  document.body.appendChild(backdrop);

  // Spotlight + bulle
  var bulle = document.createElement('div');
  bulle.id = 'visite-bulle';
  bulle.style.cssText = 'position:fixed;background:linear-gradient(180deg,#8e44ad,#6c3483);color:white;padding:14px 18px;border-radius:14px;border:2px solid #a569bd;box-shadow:0 4px 20px rgba(0,0,0,0.6);max-width:320px;width:85%;z-index:99992;font-family:Arial,sans-serif;';
  bulle.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
      '<span style="background:#fff;color:#8e44ad;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;">' + (_visiteEtape + 1) + '</span>' +
      '<span style="font-weight:bold;font-size:14px;flex:1;">' + (etape.titreKey ? t(etape.titreKey) : (etape.titre || '')) + '</span>' +
      '<button onclick="terminerVisite()" style="background:transparent;border:none;color:white;font-size:20px;cursor:pointer;line-height:1;padding:0 4px;">&times;</button>' +
    '</div>' +
    '<p style="margin:0 0 12px;font-size:13px;line-height:1.4;">' + (etape.texteKey ? t(etape.texteKey) : (etape.texte || '')) + '</p>' +
    '<div style="display:flex;gap:6px;">' +
      (_visiteEtape > 0 ? '<button onclick="visitePrecedent()" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:bold;cursor:pointer;">&#9664; ' + t('tutoPrev') + '</button>' : '') +
      '<button onclick="terminerVisite()" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer;">' + t('tutoSkip') + '</button>' +
      '<button onclick="visiteSuivant()" style="background:white;color:#8e44ad;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;flex:1;">' + (_visiteEtape >= VISITE_ETAPES.length - 1 ? t('tutoFinish') : t('tutoNext') + ' &#9654;') + '</button>' +
    '</div>' +
    '<div style="margin-top:8px;font-size:10px;text-align:center;opacity:0.7;">' + (_visiteEtape + 1) + ' / ' + VISITE_ETAPES.length + '</div>';
  document.body.appendChild(bulle);

  // Highlight cible + positionner bulle
  if (cible && etape.position !== 'center') {
    var rect = cible.getBoundingClientRect();
    // Halo highlight
    var halo = document.createElement('div');
    halo.id = 'visite-halo';
    halo.style.cssText = 'position:fixed;top:' + (rect.top - 6) + 'px;left:' + (rect.left - 6) + 'px;width:' + (rect.width + 12) + 'px;height:' + (rect.height + 12) + 'px;border:3px solid #f1c40f;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,0.7),0 0 25px #f1c40f;z-index:99991;pointer-events:none;animation:visitePulse 1.5s ease-in-out infinite;';
    document.body.appendChild(halo);
    backdrop.style.background = 'transparent';

    // Position bulle (au-dessus ou en-dessous)
    var bulleH = bulle.offsetHeight;
    var bulleW = bulle.offsetWidth;
    var vh = window.innerHeight, vw = window.innerWidth;
    var top = rect.bottom + 14;
    if (top + bulleH > vh - 10) top = rect.top - bulleH - 14;
    if (top < 10) top = 10;
    var left = rect.left + rect.width / 2 - bulleW / 2;
    if (left < 10) left = 10;
    if (left + bulleW > vw - 10) left = vw - bulleW - 10;
    bulle.style.top = top + 'px';
    bulle.style.left = left + 'px';
  } else {
    // Centre ecran
    bulle.style.top = '50%';
    bulle.style.left = '50%';
    bulle.style.transform = 'translate(-50%, -50%)';
  }
}

function visiteSuivant() {
  _visiteEtape++;
  afficherEtapeVisite();
}

function visitePrecedent() {
  if (_visiteEtape > 0) { _visiteEtape--; afficherEtapeVisite(); }
}

function terminerVisite() {
  fermerVisiteUI();
  localStorage.setItem('virusVisiteGuideeVue', '1');
}

function fermerVisiteUI() {
  ['visite-backdrop', 'visite-bulle', 'visite-halo'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });
}

function fermerTuto() {
  var popup = document.getElementById('popup-tuto');
  if (popup) popup.style.display = 'none';
  localStorage.setItem('virusTutoVu', '1');
}

function _initTutoDots() {
  var dotsContainer = document.getElementById('tuto-dots');
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  for (var i = 0; i < _tutoNbSlides; i++) {
    var dot = document.createElement('span');
    dot.className = 'tuto-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('data-dot', i);
    dot.onclick = (function(idx) { return function() { tutoSlide(idx); }; })(i);
    dotsContainer.appendChild(dot);
  }
}

function tutoSlide(n) {
  if (n < 0 || n >= _tutoNbSlides) return;
  _tutoSlideActuel = n;

  // Show/hide slides
  var slides = document.querySelectorAll('#tuto-slides-container .tuto-slide');
  for (var i = 0; i < slides.length; i++) {
    slides[i].classList.remove('active');
  }
  if (slides[n]) slides[n].classList.add('active');

  // Update dots
  var dots = document.querySelectorAll('#tuto-dots .tuto-dot');
  for (var j = 0; j < dots.length; j++) {
    dots[j].classList.toggle('active', j === n);
  }

  // Prev/Next buttons
  var btnPrev = document.getElementById('tuto-btn-prev');
  var btnNext = document.getElementById('tuto-btn-next');
  if (btnPrev) btnPrev.disabled = (n === 0);
  if (btnNext) btnNext.style.display = (n === _tutoNbSlides - 1) ? 'none' : '';

  // Passer / Essayer buttons
  var btnPasser = document.getElementById('tuto-btn-passer');
  var btnEssayer = document.getElementById('tuto-btn-essayer');
  if (n === _tutoNbSlides - 1) {
    if (btnPasser) btnPasser.style.display = '';
    if (btnEssayer) btnEssayer.style.display = '';
  } else {
    if (btnPasser) btnPasser.style.display = '';
    if (btnEssayer) btnEssayer.style.display = 'none';
  }
}

function tutoSuivant() {
  if (_tutoSlideActuel < _tutoNbSlides - 1) {
    tutoSlide(_tutoSlideActuel + 1);
  }
}

function tutoPrecedent() {
  if (_tutoSlideActuel > 0) {
    tutoSlide(_tutoSlideActuel - 1);
  }
}

function lancerTutoPartie() {
  fermerTuto();
  tutoGuide = true;
  tutoEtapeActuelle = 0;
  // Lance une partie hors-ligne avec 3 bots
  if (typeof lancerHorsLigne === 'function') {
    lancerHorsLigne(3, 1, 0, 0, 0);
  }
  // Demarrer le guide apres un court delai (le temps que la partie se charge)
  setTimeout(function() { afficherTutoGuideEtape(0); }, 1500);
}

// === GUIDE ENTRAINEMENT (etapes pendant la partie) ===
var tutoEtapeActuelle = 0;
var TUTO_GUIDE_ETAPES = [
  { texte: 'Bienvenue dans l\'entrainement ! ' + (('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'Touche l\'ecran pour deplacer ton personnage.' : 'Utilise ZQSD ou les fleches pour te deplacer.') },
  { texte: 'Approche-toi d\'une boutique pour commencer une mission.' },
  { texte: 'Clique sur le bouton "Faire la tache" pour lancer le mini-jeu.' },
  { texte: 'Termine le mini-jeu pour completer la mission.' },
  { texte: 'Va vers une autre boutique pour une nouvelle mission.' },
  { texte: 'Tu peux voir la carte avec la mini-map en bas a droite.' },
  { texte: 'Si tu vois un cadavre, clique sur "Signaler" pour lancer une reunion.' },
  { texte: 'Pendant la reunion, vote pour eliminer le suspect. Bonne chance !' }
];

function afficherTutoGuideEtape(idx) {
  if (!tutoGuide) return;
  if (idx >= TUTO_GUIDE_ETAPES.length) {
    fermerTutoGuide();
    return;
  }
  tutoEtapeActuelle = idx;
  var existing = document.getElementById('tuto-guide-popup');
  if (existing) existing.remove();
  var etape = TUTO_GUIDE_ETAPES[idx];
  var div = document.createElement('div');
  div.id = 'tuto-guide-popup';
  div.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:linear-gradient(180deg,#8e44ad,#6c3483);color:white;padding:14px 20px;border-radius:14px;border:2px solid #a569bd;box-shadow:0 4px 20px rgba(0,0,0,0.5);max-width:90%;width:420px;z-index:99998;font-family:Arial,sans-serif;';
  div.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
      '<span style="background:#fff;color:#8e44ad;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">' + (idx + 1) + '</span>' +
      '<span style="font-weight:bold;font-size:12px;letter-spacing:1px;">ETAPE ' + (idx + 1) + ' / ' + TUTO_GUIDE_ETAPES.length + '</span>' +
      '<button onclick="fermerTutoGuide()" style="margin-left:auto;background:transparent;border:none;color:white;font-size:18px;cursor:pointer;">&times;</button>' +
    '</div>' +
    '<p style="margin:0 0 10px;font-size:13px;line-height:1.4;">' + etape.texte + '</p>' +
    '<button onclick="tutoGuideSuivant()" style="background:white;color:#8e44ad;border:none;border-radius:8px;padding:6px 16px;font-size:12px;font-weight:bold;cursor:pointer;width:100%;">' + (idx + 1 >= TUTO_GUIDE_ETAPES.length ? 'TERMINER' : 'SUIVANT \u25b6') + '</button>';
  document.body.appendChild(div);
}

function tutoGuideSuivant() {
  afficherTutoGuideEtape(tutoEtapeActuelle + 1);
}

function fermerTutoGuide() {
  tutoGuide = false;
  var existing = document.getElementById('tuto-guide-popup');
  if (existing) existing.remove();
}

// Le tutoriel se declenche a la creation du compte (appele depuis account.js)

// === SYSTEME DE QUETES HEBDOMADAIRES ===
var QUETE_TEMPLATES = [
  { id:'win1', titreKey:'qTitleWin1', icone:'🏆', objectif:1, stat:'wins', recompense:50 },
  { id:'win3', titreKey:'qTitleWin3', icone:'🏆', objectif:3, stat:'wins', recompense:100 },
  { id:'win5', titreKey:'qTitleWin5', icone:'🏆', objectif:5, stat:'wins', recompense:200 },
  { id:'kill2', titreKey:'qTitleKill2', icone:'☠️', objectif:2, stat:'kills', recompense:50 },
  { id:'kill5', titreKey:'qTitleKill5', icone:'☠️', objectif:5, stat:'kills', recompense:100 },
  { id:'kill10', titreKey:'qTitleKill10', icone:'☠️', objectif:10, stat:'kills', recompense:200 },
  { id:'play3', titreKey:'qTitlePlay3', icone:'🎮', objectif:3, stat:'gamesPlayed', recompense:50 },
  { id:'play5', titreKey:'qTitlePlay5', icone:'🎮', objectif:5, stat:'gamesPlayed', recompense:100 },
  { id:'play10', titreKey:'qTitlePlay10', icone:'🎮', objectif:10, stat:'gamesPlayed', recompense:200 },
  { id:'mission5', titreKey:'qTitleMission5', icone:'📝', objectif:5, stat:'missions', recompense:50 },
  { id:'mission15', titreKey:'qTitleMission15', icone:'📝', objectif:15, stat:'missions', recompense:100 },
  { id:'mission30', titreKey:'qTitleMission30', icone:'📝', objectif:30, stat:'missions', recompense:200 },
  { id:'winVirus', titreKey:'qTitleWinVirus', icone:'🦠', objectif:1, stat:'winsVirus', recompense:150 },
  { id:'winInno', titreKey:'qTitleWinInno', icone:'😇', objectif:1, stat:'winsInnocent', recompense:100 },
  { id:'signaler3', titreKey:'qTitleSignaler3', icone:'🚨', objectif:3, stat:'signalements', recompense:75 },
  { id:'survie', titreKey:'qTitleSurvie', icone:'🛡️', objectif:1, stat:'survies', recompense:100 }
];

function getSemaineId() {
  // Retourne un string "YYYY-WW" pour identifier la semaine
  // La semaine change chaque lundi
  var d = new Date();
  var jour = d.getDay() || 7;
  d.setDate(d.getDate() - (jour - 1)); // Reculer au lundi
  d.setHours(0, 0, 0, 0);
  var debut = new Date(d.getFullYear(), 0, 1);
  var semaine = Math.ceil(((d - debut) / 86400000 + debut.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + (semaine < 10 ? '0' : '') + semaine;
}

function getProchainLundiTimestamp() {
  // Prochain lundi 8h heure locale
  var d = new Date();
  var jour = d.getDay() || 7;
  var joursRestants = 8 - jour; // jours jusqu'a prochain lundi
  if (joursRestants >= 7) joursRestants = 0;
  d.setDate(d.getDate() + joursRestants);
  d.setHours(8, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 7);
  return d.getTime();
}

function ouvrirQuetes() {
  var popup = document.getElementById('popup-quetes');
  if (!popup) return;
  popup.classList.add('visible');
  chargerQuetes();
}

function fermerQuetes() {
  var popup = document.getElementById('popup-quetes');
  if (popup) popup.classList.remove('visible');
}

function chargerQuetes() {
  var liste = document.getElementById('quetes-liste');
  if (!liste) return;
  liste.innerHTML = '<div class="spinner"></div>';
  if (!monPlayerId) {
    liste.innerHTML = '<div style="color:#95a5a6;text-align:center;padding:20px;">Connecte-toi pour voir tes quetes.</div>';
    return;
  }
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) { liste.innerHTML = ''; return; }
    var data = doc.data();
    var quetes = data.questsHebdo || null;
    var lundiCourant = getSemaineId();
    // Generer de nouvelles quetes si necessaire (premiere fois ou nouvelle semaine)
    if (!quetes || !quetes.semaine || quetes.semaine !== lundiCourant) {
      quetes = genererNouvellesQuetes(lundiCourant);
      db.collection('players').doc(monPlayerId).update({ questsHebdo: quetes }).catch(function() {});
    }
    afficherQuetes(quetes);
    afficherTempsRestant();
  }).catch(function() {
    liste.innerHTML = '<div style="color:#e74c3c;text-align:center;padding:20px;">Erreur de chargement.</div>';
  });
}

function genererNouvellesQuetes(lundi) {
  var pool = QUETE_TEMPLATES.slice();
  var choisies = [];
  while (choisies.length < 10 && pool.length > 0) {
    var idx = Math.floor(Math.random() * pool.length);
    var q = pool[idx];
    pool.splice(idx, 1);
    choisies.push({ id: q.id, progres: 0, prise: false });
  }
  return { semaine: lundi, quetes: choisies };
}

function afficherQuetes(data) {
  var liste = document.getElementById('quetes-liste');
  if (!liste) return;
  liste.innerHTML = '';
  var qs = data.quetes || [];
  var aRecompense = false;
  qs.forEach(function(q) {
    var tpl = QUETE_TEMPLATES.find(function(t) { return t.id === q.id; });
    if (!tpl) return;
    var pct = Math.min(100, Math.round((q.progres / tpl.objectif) * 100));
    var complete = q.progres >= tpl.objectif;
    if (complete && !q.prise) aRecompense = true;
    var div = document.createElement('div');
    div.className = 'quete-item' + (complete ? ' completee' : '') + (q.prise ? ' recompense-prise' : '');
    div.innerHTML =
      '<span class="quete-icone">' + tpl.icone + '</span>' +
      '<div class="quete-content">' +
        '<div class="quete-titre">' + t(tpl.titreKey) + '</div>' +
        '<div class="quete-progress-bar"><div class="quete-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="quete-progress-text">' + Math.min(q.progres, tpl.objectif) + ' / ' + tpl.objectif + '</div>' +
      '</div>' +
      '<button class="quete-recompense" ' + ((!complete || q.prise) ? 'disabled' : '') +
      ' onclick="reclamerQuete(\'' + q.id + '\')">' +
      (q.prise ? 'PRIS' : '+' + tpl.recompense + ' XP') +
      '</button>';
    liste.appendChild(div);
  });
  // Mettre a jour le badge
  var badge = document.getElementById('quetes-badge');
  if (badge) badge.style.display = aRecompense ? 'flex' : 'none';
}

function afficherTempsRestant() {
  var el = document.getElementById('quetes-temps-restant');
  if (!el) return;
  var prochainLundi = getProchainLundiTimestamp();
  var diff = prochainLundi - Date.now();
  if (diff < 0) { el.textContent = ''; return; }
  var jours = Math.floor(diff / (24 * 3600 * 1000));
  var heures = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  el.textContent = t('questsResetIn', jours, heures);
}

function reclamerQuete(queteId) {
  if (!monPlayerId) return;
  var ref = db.collection('players').doc(monPlayerId);
  var recompenseGagnee = 0;
  db.runTransaction(function(transaction) {
    return transaction.get(ref).then(function(doc) {
      if (!doc.exists) throw new Error('Compte introuvable');
      var data = doc.data();
      var qd = data.questsHebdo;
      if (!qd || !qd.quetes) throw new Error('Pas de quetes');
      var q = qd.quetes.find(function(x) { return x.id === queteId; });
      var tpl = QUETE_TEMPLATES.find(function(t) { return t.id === queteId; });
      if (!q || !tpl) throw new Error('Quete introuvable');
      if (q.prise) throw new Error('Deja reclamee');
      if (q.progres < tpl.objectif) throw new Error('Pas terminee');
      q.prise = true;
      recompenseGagnee = tpl.recompense;
      // Marquer comme prise (le XP sera ajoute via ajouterXP apres la transaction)
      transaction.update(ref, { questsHebdo: qd });
    });
  }).then(function() {
    // Ajouter l'XP via la fonction standard (gere les level ups + gold bonus de niveau)
    if (typeof ajouterXP === 'function') ajouterXP(recompenseGagnee);
    showNotif(t('questsGoldEarned', recompenseGagnee), 'success');
    chargerQuetes();
  }).catch(function(err) {
    showNotif(t('questsError') + ' : ' + (err && err.message ? err.message : 'inconnue'), 'warn');
  });
}

// Incrementer la progression d'une stat avec transaction Firebase (evite race conditions)
function incrementerQueteStat(stat, valeur) {
  if (!monPlayerId) return;
  if (typeof tutoGuide !== 'undefined' && tutoGuide) return; // pas de quetes en entrainement
  valeur = valeur || 1;
  var ref = db.collection('players').doc(monPlayerId);
  db.runTransaction(function(transaction) {
    return transaction.get(ref).then(function(doc) {
      if (!doc.exists) return;
      var data = doc.data();
      var qd = data.questsHebdo;
      var lundiCourant = getSemaineId();
      if (!qd || qd.semaine !== lundiCourant) {
        qd = genererNouvellesQuetes(lundiCourant);
      }
      var modifie = false;
      qd.quetes.forEach(function(q) {
        var tpl = QUETE_TEMPLATES.find(function(t) { return t.id === q.id; });
        if (!tpl || tpl.stat !== stat) return;
        if (q.progres < tpl.objectif) {
          q.progres = Math.min(tpl.objectif, q.progres + valeur);
          modifie = true;
        }
      });
      if (modifie) {
        transaction.update(ref, { questsHebdo: qd });
      }
    });
  }).catch(function(err) { console.error('Erreur incrementerQueteStat:', err); });
}

// === SYSTEME D'ECHANGE DE SKINS ===
var ECHANGE_COOLDOWN = 2 * 3600 * 1000; // 2 heures en ms
var _echangeAmiUid = '';
var _echangeAmiPseudo = '';
var _echangeSkinChoisi = '';

function proposerEchange(amiUid, amiPseudo) {
  // Verifier cooldown
  var lastEchange = parseInt(localStorage.getItem('virusLastEchange') || '0');
  if (Date.now() - lastEchange < ECHANGE_COOLDOWN) {
    var restant = Math.ceil((ECHANGE_COOLDOWN - (Date.now() - lastEchange)) / 60000);
    showNotif('Attends encore ' + restant + ' min avant un nouvel echange.', 'warn');
    return;
  }
  _echangeAmiUid = amiUid;
  _echangeAmiPseudo = amiPseudo;
  _echangeSkinChoisi = '';
  var popup = document.getElementById('popup-echange');
  if (!popup) return;
  popup.classList.add('visible');
  document.getElementById('echange-info').textContent = 'Choisis un skin a proposer a ' + amiPseudo + ' :';
  afficherMesSkinsEchange();
}

function fermerEchange() {
  var popup = document.getElementById('popup-echange');
  if (popup) popup.classList.remove('visible');
}

function afficherMesSkinsEchange() {
  var contenu = document.getElementById('echange-contenu');
  if (!contenu) return;
  var skinEquipe = getSkin();
  var achetes = getSkinsAchetes();
  var tousLesSkins = SKINS.concat(SKINS_BOUTIQUE.filter(function(sb) { return achetes.indexOf(sb.id) >= 0; }));
  // Exclure le skin equipe
  tousLesSkins = tousLesSkins.filter(function(s) { return s.id !== skinEquipe; });
  if (tousLesSkins.length === 0) {
    contenu.innerHTML = '<div style="color:#95a5a6;text-align:center;padding:20px;">Tu n\'as aucun skin a echanger (desequipe ton skin actuel d\'abord).</div>';
    return;
  }
  var html = '<div class="echange-skin-grid">';
  tousLesSkins.forEach(function(s) {
    html += '<div class="echange-skin-item" onclick="selectionnerSkinEchange(\'' + s.id + '\', this)">' +
      '<img src="' + s.fichier + '" alt="' + s.nom + '">' +
      '<span>' + s.nom + '</span></div>';
  });
  html += '</div>';
  html += '<button class="btn-sauver-pseudo" id="btn-envoyer-echange" style="background:linear-gradient(180deg,#e67e22,#d35400);border-color:#e67e22;width:100%;padding:10px;margin-top:10px;" onclick="envoyerDemandeEchange()" disabled>PROPOSER L\'ECHANGE</button>';
  contenu.innerHTML = html;
}

function selectionnerSkinEchange(skinId, el) {
  _echangeSkinChoisi = skinId;
  document.querySelectorAll('.echange-skin-item').forEach(function(e) { e.classList.remove('selected'); });
  if (el) el.classList.add('selected');
  var btn = document.getElementById('btn-envoyer-echange');
  if (btn) btn.disabled = false;
}

function envoyerDemandeEchange() {
  if (!_echangeSkinChoisi || !_echangeAmiUid) return;
  var skinObj = SKINS.concat(SKINS_BOUTIQUE).find(function(s) { return s.id === _echangeSkinChoisi; });
  if (!skinObj) return;
  db.collection('skinTrades').add({
    fromPlayerId: monPlayerId,
    fromPseudo: getPseudo() || '',
    fromSkinId: _echangeSkinChoisi,
    fromSkinNom: skinObj.nom,
    fromSkinFichier: skinObj.fichier,
    toPlayerId: _echangeAmiUid,
    toPseudo: _echangeAmiPseudo,
    toSkinId: '',
    toSkinNom: '',
    toSkinFichier: '',
    status: 'pending',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    showNotif('Demande d\'echange envoyee a ' + _echangeAmiPseudo + ' !', 'success');
    fermerEchange();
  }).catch(function() {
    showNotif('Erreur', 'warn');
  });
}

// Ecouter les demandes d'echange recues
function initEchangeListener() {
  if (!monPlayerId) return;
  db.collection('skinTrades').where('toPlayerId', '==', monPlayerId).where('status', '==', 'pending').onSnapshot(function(snap) {
    snap.docChanges().forEach(function(change) {
      if (change.type === 'added') {
        var data = change.doc.data();
        data._id = change.doc.id;
        afficherDemandeEchange(data);
      }
    });
  });
}

function afficherDemandeEchange(trade) {
  if (!trade || !trade._id || !trade.fromPseudo || !trade.fromSkinFichier || !trade.fromSkinNom) return;
  if (typeof SKINS === 'undefined' || typeof SKINS_BOUTIQUE === 'undefined') return;
  _echangeReponseSkin = '';
  var popup = document.getElementById('popup-echange');
  if (!popup) return;
  popup.classList.add('visible');
  document.getElementById('echange-info').textContent = trade.fromPseudo + ' veut echanger ce skin avec toi :';
  var contenu = document.getElementById('echange-contenu');
  var html = '<div class="echange-preview">' +
    '<div class="echange-preview-skin"><img src="' + trade.fromSkinFichier + '"><span>' + trade.fromSkinNom + '</span></div>' +
    '<span class="echange-fleche">&#128260;</span>' +
    '<div class="echange-preview-skin"><span style="font-size:20px;">?</span><span>Ton skin</span></div>' +
    '</div>';
  html += '<p style="color:#bdc3c7;font-size:12px;text-align:center;">Choisis un skin en echange :</p>';
  // Mes skins disponibles
  var skinEquipe = getSkin();
  var achetes = getSkinsAchetes();
  var tousLesSkins = SKINS.concat(SKINS_BOUTIQUE.filter(function(sb) { return achetes.indexOf(sb.id) >= 0; }));
  tousLesSkins = tousLesSkins.filter(function(s) { return s.id !== skinEquipe; });
  html += '<div class="echange-skin-grid">';
  tousLesSkins.forEach(function(s) {
    html += '<div class="echange-skin-item" onclick="selectionnerSkinReponse(\'' + s.id + '\', this)">' +
      '<img src="' + s.fichier + '" alt="' + s.nom + '">' +
      '<span>' + s.nom + '</span></div>';
  });
  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-top:10px;">' +
    '<button class="btn-sauver-pseudo" id="btn-accepter-echange" style="background:linear-gradient(180deg,#27ae60,#229954);border-color:#27ae60;flex:1;padding:10px;" onclick="accepterEchange(\'' + trade._id + '\')" disabled>ACCEPTER</button>' +
    '<button class="btn-sauver-pseudo" style="background:linear-gradient(180deg,#e74c3c,#c0392b);border-color:#e74c3c;flex:1;padding:10px;" onclick="refuserEchange(\'' + trade._id + '\')">REFUSER</button>' +
    '</div>';
  contenu.innerHTML = html;
}

var _echangeReponseSkin = '';
function selectionnerSkinReponse(skinId, el) {
  _echangeReponseSkin = skinId;
  document.querySelectorAll('.echange-skin-item').forEach(function(e) { e.classList.remove('selected'); });
  if (el) el.classList.add('selected');
  var btn = document.getElementById('btn-accepter-echange');
  if (btn) btn.disabled = false;
}

function accepterEchange(tradeId) {
  if (!tradeId || !_echangeReponseSkin) return;
  if (typeof SKINS === 'undefined' || typeof SKINS_BOUTIQUE === 'undefined') return;
  var skinObj = SKINS.concat(SKINS_BOUTIQUE).find(function(s) { return s.id === _echangeReponseSkin; });
  if (!skinObj) return;
  // Mettre a jour la demande avec le skin choisi
  db.collection('skinTrades').doc(tradeId).update({
    toSkinId: _echangeReponseSkin,
    toSkinNom: skinObj.nom,
    toSkinFichier: skinObj.fichier,
    status: 'accepted'
  }).then(function() {
    // Lire le trade pour faire l'echange
    return db.collection('skinTrades').doc(tradeId).get();
  }).then(function(doc) {
    if (!doc.exists) return;
    var trade = doc.data();
    // Echanger les skins dans les comptes
    executerEchange(trade);
    showNotif('Echange accepte !', 'success');
    localStorage.setItem('virusLastEchange', String(Date.now()));
    fermerEchange();
  }).catch(function() { showNotif('Erreur', 'warn'); });
}

function refuserEchange(tradeId) {
  if (!tradeId) { fermerEchange(); return; }
  db.collection('skinTrades').doc(tradeId).update({ status: 'declined' }).catch(function() {});
  showNotif('Echange refuse.', 'info');
  fermerEchange();
}

function executerEchange(trade) {
  if (!trade || !trade.fromPlayerId || !trade.fromSkinId || !trade.toSkinId) return;
  if (typeof SKINS === 'undefined') return;
  // Joueur local recoit le skin de l'autre
  var mesAchats = getSkinsAchetes();
  // Ajouter le skin recu
  if (mesAchats.indexOf(trade.fromSkinId) < 0 && !SKINS.find(function(s) { return s.id === trade.fromSkinId; })) {
    mesAchats.push(trade.fromSkinId);
  }
  // Retirer le skin donne (sauf si c'est un skin de base)
  var idxDonne = mesAchats.indexOf(trade.toSkinId);
  if (idxDonne >= 0) mesAchats.splice(idxDonne, 1);
  sauvegarderSkinsAchetes(mesAchats);

  // Mettre a jour l'autre joueur via Firebase
  db.collection('players').doc(trade.fromPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    if (!data) return;
    var autreAchats = data.skinsAchetes || [];
    // Ajouter le skin recu
    if (autreAchats.indexOf(trade.toSkinId) < 0 && !SKINS.find(function(s) { return s.id === trade.toSkinId; })) {
      autreAchats.push(trade.toSkinId);
    }
    // Retirer le skin donne
    var idxAutre = autreAchats.indexOf(trade.fromSkinId);
    if (idxAutre >= 0) autreAchats.splice(idxAutre, 1);
    db.collection('players').doc(trade.fromPlayerId).update({ skinsAchetes: autreAchats, skinsCount: autreAchats.length }).catch(function() {});
  });
}

// Ecouter les echanges acceptes (pour l'initiateur)
function initEchangeAccepteListener() {
  if (!monPlayerId) return;
  db.collection('skinTrades').where('fromPlayerId', '==', monPlayerId).where('status', '==', 'accepted').onSnapshot(function(snap) {
    snap.docChanges().forEach(function(change) {
      if (change.type === 'added' || change.type === 'modified') {
        var data = change.doc.data();
        if (data.toSkinId) {
          // L'autre a accepte, faire l'echange cote initiateur
          var mesAchats = getSkinsAchetes();
          if (mesAchats.indexOf(data.toSkinId) < 0 && !SKINS.find(function(s) { return s.id === data.toSkinId; })) {
            mesAchats.push(data.toSkinId);
          }
          var idx = mesAchats.indexOf(data.fromSkinId);
          if (idx >= 0) mesAchats.splice(idx, 1);
          sauvegarderSkinsAchetes(mesAchats);
          showNotif(data.toPseudo + ' a accepte l\'echange ! Tu as recu ' + data.toSkinNom, 'success');
          localStorage.setItem('virusLastEchange', String(Date.now()));
          // Marquer comme complete
          db.collection('skinTrades').doc(change.doc.id).update({ status: 'completed' }).catch(function() {});
        }
      }
    });
  });
}

// === SYSTEME D'ALARME (capteurs) ===
var CAPTEURS = [
  { nom: 'KIOSQUE', x: 2800, y: 1375, rayon: 200, cooldown: 0 },
  { nom: 'OPTICIEN', x: 4800, y: 1375, rayon: 200, cooldown: 0 },
  { nom: 'ARCADE', x: 2800, y: 4000, rayon: 200, cooldown: 0 },
  { nom: 'BOWLING', x: 4800, y: 4000, rayon: 200, cooldown: 0 }
];
var CAPTEUR_COOLDOWN = 3 * 60 * 1000; // 3 minutes
var _alarmeAffichee = false;
var _alarmeTimer = null;

function verifierCapteurs() {
  if (!jeuActif || reunionEnCours) return;
  // Seuls virus, espion, fanatique declenchent l'alarme
  if (monRole !== 'virus' && monRole !== 'espion' && monRole !== 'fanatique') return;
  var now = Date.now();
  for (var ci = 0; ci < CAPTEURS.length; ci++) {
    var cap = CAPTEURS[ci];
    if (now < cap.cooldown) continue;
    var dx = joueurX - cap.x;
    var dy = joueurY - cap.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < cap.rayon) {
      cap.cooldown = now + CAPTEUR_COOLDOWN;
      declencherAlarme(cap);
      break;
    }
  }
  // Verifier aussi les bots virus/espion/fanatique
  for (var bi = 0; bi < bots.length; bi++) {
    var bot = bots[bi];
    if (bot.role !== 'virus' && bot.role !== 'espion' && bot.role !== 'fanatique') continue;
    if (joueursElimines.indexOf(bot.pseudo) >= 0) continue;
    for (var cj = 0; cj < CAPTEURS.length; cj++) {
      var cap2 = CAPTEURS[cj];
      if (now < cap2.cooldown) continue;
      var dbx = bot.x - cap2.x;
      var dby = bot.y - cap2.y;
      var distB = Math.sqrt(dbx * dbx + dby * dby);
      if (distB < cap2.rayon) {
        cap2.cooldown = now + CAPTEUR_COOLDOWN;
        declencherAlarme(cap2);
        break;
      }
    }
  }
}

function declencherAlarme(capteur) {
  // Son d'alarme
  try { var sAlarme = new Audio('Audio/reunion-urgence.mp3'); sAlarme.volume = 0.7; sAlarme.play(); } catch(e) {}
  // Notification
  showNotif('ALARME ! Zone ' + capteur.nom, 'warn');
  // Afficher fleche vers la zone
  afficherFlecheAlarme(capteur);
}

function afficherFlecheAlarme(capteur) {
  // Retirer l'ancienne fleche
  var old = document.getElementById('alarme-fleche');
  if (old) old.remove();
  if (_alarmeTimer) clearTimeout(_alarmeTimer);
  // Creer la fleche
  var div = document.createElement('div');
  div.id = 'alarme-fleche';
  div.style.cssText = 'position:fixed;display:flex;flex-direction:column;align-items:center;pointer-events:none;z-index:202;transition:top 0.1s,left 0.1s;';
  div.innerHTML = '<div style="width:35px;height:35px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 8px rgba(231,76,60,0.8));animation:alarmePulse 0.5s infinite alternate;"><svg viewBox="0 0 40 50" width="35" height="35"><path d="M20 0 L38 45 L20 35 L2 45 Z" fill="#e74c3c"/></svg></div>' +
    '<div style="color:#e74c3c;font-size:9px;font-weight:bold;margin-top:2px;text-shadow:0 0 3px rgba(0,0,0,0.8);">' + capteur.nom + '</div>';
  document.body.appendChild(div);
  // Animer la position pendant 8 secondes
  var duree = 8000;
  var start = Date.now();
  function majFleche() {
    var elapsed = Date.now() - start;
    if (elapsed > duree || !jeuActif) { div.remove(); return; }
    var angle = Math.atan2(capteur.y - joueurY, capteur.x - joueurX);
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var margin = 45;
    var edgeX = vw / 2 + Math.cos(angle) * (vw / 2 - margin);
    var edgeY = vh / 2 + Math.sin(angle) * (vh / 2 - margin);
    edgeX = Math.max(margin, Math.min(vw - margin, edgeX));
    edgeY = Math.max(margin, Math.min(vh - margin, edgeY));
    div.style.left = edgeX + 'px';
    div.style.top = edgeY + 'px';
    requestAnimationFrame(majFleche);
  }
  majFleche();
  _alarmeTimer = setTimeout(function() { if (div.parentNode) div.remove(); }, duree);
}

// === LUMIERES ETEINTES ===
var lumieresEteintes = false;
var LUMIERES_COOLDOWN = 90000; // 1min30
var _dernierLumieres = 0;

function couperLumieres() {
  if (monRole !== 'espion') return;
  var now = Date.now();
  if (now - _dernierLumieres < LUMIERES_COOLDOWN) {
    var restant = Math.ceil((LUMIERES_COOLDOWN - (now - _dernierLumieres)) / 1000);
    showNotif('Attends encore ' + restant + 's', 'warn');
    return;
  }
  _dernierLumieres = now;
  activerLumieresEteintes();
  // En mode en ligne, synchroniser via Firebase
  if (!modeHorsLigne && partieActuelleId && typeof db !== 'undefined') {
    db.collection('parties').doc(partieActuelleId).update({ lumieresEteintes: true }).catch(function() {});
  }
}

function activerLumieresEteintes() {
  lumieresEteintes = true;
  var overlay = document.getElementById('lumieres-overlay');
  if (overlay) overlay.style.display = 'block';
  showNotif('LES LUMIERES SONT ETEINTES !', 'warn');
  majBoutonReparer();
  afficherFlecheSecurite();
}

function afficherFlecheSecurite() {
  var old = document.getElementById('fleche-securite');
  if (old) old.remove();
  var div = document.createElement('div');
  div.id = 'fleche-securite';
  div.style.cssText = 'position:fixed;display:flex;flex-direction:column;align-items:center;pointer-events:none;z-index:202;';
  div.innerHTML = '<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 6px rgba(52,152,219,0.7));"><svg viewBox="0 0 40 50" width="30" height="30"><path d="M20 0 L38 45 L20 35 L2 45 Z" fill="#3498db"/></svg></div>' +
    '<div style="color:#3498db;font-size:9px;font-weight:bold;margin-top:2px;text-shadow:0 0 3px rgba(0,0,0,0.8);">SECURITE</div>';
  document.body.appendChild(div);
}

function majFlecheSecurite() {
  var el = document.getElementById('fleche-securite');
  if (!el) return;
  if (!lumieresEteintes) { el.remove(); return; }
  var secX = 3025, secY = 210;
  var angle = Math.atan2(secY - joueurY, secX - joueurX);
  var deg = angle * (180 / Math.PI);
  var svgEl = el.querySelector('svg');
  if (svgEl) svgEl.style.transform = 'rotate(' + deg + 'deg)';
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var margin = 45;
  var edgeX = vw / 2 + Math.cos(angle) * (vw / 2 - margin);
  var edgeY = vh / 2 + Math.sin(angle) * (vh / 2 - margin);
  edgeX = Math.max(margin, Math.min(vw - margin, edgeX));
  edgeY = Math.max(margin, Math.min(vh - margin, edgeY));
  el.style.left = edgeX + 'px';
  el.style.top = edgeY + 'px';
}

function desactiverLumieres() {
  lumieresEteintes = false;
  var overlay = document.getElementById('lumieres-overlay');
  if (overlay) overlay.style.display = 'none';
  var btnRep = document.getElementById('btn-reparer-lumieres');
  if (btnRep) btnRep.style.display = 'none';
  var flecheSec = document.getElementById('fleche-securite');
  if (flecheSec) flecheSec.remove();
  showNotif('Lumieres reparees !', 'success');
  // En mode en ligne, synchroniser
  if (!modeHorsLigne && partieActuelleId && typeof db !== 'undefined') {
    db.collection('parties').doc(partieActuelleId).update({ lumieresEteintes: false }).catch(function() {});
  }
}

function reparerLumieres() {
  desactiverLumieres();
}

function majBoutonReparer() {
  if (!lumieresEteintes) return;
  // Le poste de securite est a (2800, 60, 450x300)
  var sr = { x: 2800, y: 60, w: 450, h: 300 };
  var marge = 50;
  var dans = joueurX >= sr.x - marge && joueurX <= sr.x + sr.w + marge &&
             joueurY >= sr.y - marge && joueurY <= sr.y + sr.h + marge;
  var btnRep = document.getElementById('btn-reparer-lumieres');
  if (btnRep) btnRep.style.display = dans ? 'block' : 'none';
}

function majLumieresPosition() {
  if (!lumieresEteintes) return;
  var overlay = document.getElementById('lumieres-overlay');
  if (!overlay) return;
  // Calculer la position du joueur sur l'ecran
  var map = document.getElementById('mall-map');
  if (!map) return;
  var mapRect = map.getBoundingClientRect();
  var screenX = mapRect.left + joueurX + 15;
  var screenY = mapRect.top + joueurY + 20;
  overlay.style.setProperty('--lx', screenX + 'px');
  overlay.style.setProperty('--ly', screenY + 'px');
  majBoutonReparer();
}

function initBoutonLumieres() {
  var btn = document.getElementById('hud-btn-lumieres');
  if (btn) btn.style.display = (monRole === 'espion') ? 'inline-block' : 'none';
}

// === POLICE DYSLEXIQUE ===
function toggleDyslexie() {
  var actif = document.body.classList.toggle('dyslexie');
  localStorage.setItem('virusDyslexie', actif ? '1' : '0');
  majToggleDyslexie();
}
function majToggleDyslexie() {
  var tg = document.getElementById('toggle-dyslexie');
  var lb = document.getElementById('toggle-dyslexie-label');
  var actif = document.body.classList.contains('dyslexie');
  if (tg) tg.classList.toggle('active', actif);
  if (lb) lb.classList.toggle('active', actif);
}
(function() {
  function apply() {
    if (localStorage.getItem('virusDyslexie') === '1' && document.body) {
      document.body.classList.add('dyslexie');
    }
  }
  if (document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply);
})();

// === CONFETTIS (fin de partie victoire) ===
function lancerConfettis(couleurs) {
  couleurs = couleurs || ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12'];
  var existing = document.getElementById('confetti-container');
  if (existing) existing.remove();
  var container = document.createElement('div');
  container.id = 'confetti-container';
  container.className = 'confetti-container';
  document.body.appendChild(container);
  var nbConfettis = 120;
  for (var i = 0; i < nbConfettis; i++) {
    var c = document.createElement('div');
    c.className = 'confetti';
    var couleur = couleurs[Math.floor(Math.random() * couleurs.length)];
    var gauche = Math.random() * 100;
    var delai = Math.random() * 2.5;
    var duree = 2.5 + Math.random() * 2.5;
    var tailleW = 6 + Math.random() * 8;
    var tailleH = 10 + Math.random() * 10;
    var formeRound = Math.random() < 0.3;
    c.style.left = gauche + 'vw';
    c.style.background = couleur;
    c.style.width = tailleW + 'px';
    c.style.height = tailleH + 'px';
    c.style.animationDelay = delai + 's';
    c.style.animationDuration = duree + 's';
    c.style.borderRadius = formeRound ? '50%' : '2px';
    container.appendChild(c);
  }
  setTimeout(function() { if (container && container.parentNode) container.remove(); }, 7000);
}

// === RESET CAPTEURS/ALARME entre parties ===
function resetPassagesEtCapteurs() {
  if (typeof CAPTEURS !== 'undefined') {
    for (var j = 0; j < CAPTEURS.length; j++) CAPTEURS[j].cooldown = 0;
  }
  // Cleanup alarme
  if (typeof _alarmeTimer !== 'undefined' && _alarmeTimer) { clearTimeout(_alarmeTimer); _alarmeTimer = null; }
  var alarmeFleche = document.getElementById('alarme-fleche');
  if (alarmeFleche) alarmeFleche.remove();
}

// === TOGGLE REGLES DU JEU ===
function toggleRegles() {
  var panneau = document.getElementById('regles-panneau');
  var btn = document.getElementById('btn-voir-regles');
  if (!panneau) return;
  var estFerme = (panneau.style.display === 'none');
  panneau.style.display = estFerme ? '' : 'none';
  if (btn) {
    btn.innerHTML = '<span>&#128214;</span> <span data-i18n="rules">' + t('rules') + '</span> <span class="btn-voir-regles-arrow">' + (estFerme ? '&#9650;' : '&#9660;') + '</span>';
  }
}

// === SYSTEME DE SIGNALEMENT ===
var panelSignalementOuvert = false;

function ouvrirPanelSignalement() {
  var panel = document.getElementById('panel-signalement');
  if (!panel) return;
  panel.style.display = 'flex';
  panelSignalementOuvert = true;
  remplirListeSignalement();
}

function fermerPanelSignalement() {
  var panel = document.getElementById('panel-signalement');
  if (panel) panel.style.display = 'none';
  panelSignalementOuvert = false;
}

function remplirListeSignalement() {
  var liste = document.getElementById('panel-signalement-liste');
  if (!liste) return;
  liste.innerHTML = '';
  var pseudo = getPseudo() || '';
  // Joueurs de la partie (bots + joueurs distants)
  var joueurs = [];
  // Bots
  for (var i = 0; i < bots.length; i++) {
    if (joueursElimines.indexOf(bots[i].pseudo) >= 0) continue;
    joueurs.push({ pseudo: bots[i].pseudo, skin: bots[i].skin, isBot: true });
  }
  // Joueurs distants (en ligne)
  if (!modeHorsLigne && typeof firebasePartyPlayers !== 'undefined') {
    for (var j = 0; j < firebasePartyPlayers.length; j++) {
      var fp = firebasePartyPlayers[j];
      if (fp.isBot) continue;
      if (fp.playerId === monPlayerId) continue;
      joueurs.push({ pseudo: fp.pseudo, skin: fp.skin, isBot: false, playerId: fp.playerId });
    }
  }
  if (joueurs.length === 0) {
    liste.innerHTML = '<div style="color:#95a5a6;text-align:center;padding:20px;">' + t('reportNoPlayers') + '</div>';
    return;
  }
  joueurs.forEach(function(j) {
    var div = document.createElement('div');
    div.className = 'signalement-joueur';
    div.innerHTML =
      '<img src="' + (j.skin || 'skin/gratuit/skin-de-base-garcon.svg') + '" alt="skin">' +
      '<span class="signalement-pseudo">' + escapeHtml(j.pseudo) + (j.isBot ? ' (bot)' : '') + '</span>' +
      '<button class="signalement-btn" onclick="signalerJoueur(\'' + escapeHtml(j.pseudo).replace(/'/g, "\\'") + '\', ' + j.isBot + ', \'' + (j.playerId || '') + '\')">SIGNALER</button>';
    liste.appendChild(div);
  });
}

function signalerJoueur(pseudoCible, isBot, playerId) {
  if (isBot) {
    showNotif(t('reportCantBot'), 'warn');
    return;
  }
  if (!confirm(t('reportConfirm', pseudoCible))) return;

  // Analyser le pseudo
  var pseudoClean = pseudoCible.toLowerCase().replace(/[^a-z]/g, '');
  var pseudoToxique = false;
  for (var mi = 0; mi < MOTS_INTERDITS.length; mi++) {
    var motClean = MOTS_INTERDITS[mi].replace(/[^a-z]/g, '');
    if (pseudoClean.indexOf(motClean) >= 0) {
      pseudoToxique = true;
      break;
    }
  }

  // Analyser les messages du chat de la partie
  var chatToxique = false;
  if (partieActuelleId) {
    db.collection('chatMessages').where('partyId', '==', partieActuelleId).where('pseudo', '==', pseudoCible).get().then(function(snap) {
      snap.forEach(function(doc) {
        var msg = (doc.data().message || '').toLowerCase().replace(/[^a-z]/g, '');
        for (var ci = 0; ci < MOTS_INTERDITS.length; ci++) {
          var motC = MOTS_INTERDITS[ci].replace(/[^a-z]/g, '');
          if (msg.indexOf(motC) >= 0) {
            chatToxique = true;
            break;
          }
        }
      });
      traiterSignalement(pseudoCible, playerId, pseudoToxique, chatToxique);
    }).catch(function() {
      traiterSignalement(pseudoCible, playerId, pseudoToxique, false);
    });
  } else {
    traiterSignalement(pseudoCible, playerId, pseudoToxique, false);
  }
}

function traiterSignalement(pseudoCible, playerId, pseudoToxique, chatToxique) {
  var raison = [];
  if (pseudoToxique) raison.push(t('reportReasonPseudo'));
  if (chatToxique) raison.push(t('reportReasonChat'));

  // Enregistrer le signalement dans Firebase
  db.collection('signalements').add({
    reporterPlayerId: monPlayerId,
    reporterPseudo: getPseudo() || '',
    targetPlayerId: playerId,
    targetPseudo: pseudoCible,
    raisons: raison,
    autoDetected: pseudoToxique || chatToxique,
    partyId: partieActuelleId || '',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function() {});

  if (pseudoToxique || chatToxique) {
    // Ban de 5 minutes
    if (playerId) {
      db.collection('players').doc(playerId).update({
        banned: true,
        banExpire: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        banRaison: raison.join(', ')
      }).then(function() {
        showNotif(t('reportBanned', pseudoCible, raison.join(', ')), 'success');
      }).catch(function() {});
    }
  } else {
    showNotif(t('reportNoInfraction'), 'info');
  }
  fermerPanelSignalement();
}

// === IA VERIFICATEUR DE MOT DE PASSE ===
function ouvrirMdpCheck() {
  var popup = document.getElementById('popup-mdp-check');
  if (!popup) return;
  popup.classList.add('visible');
  document.getElementById('input-mdp-check').value = '';
  document.getElementById('mdp-resultat').style.display = 'none';
  setTimeout(function() {
    var inp = document.getElementById('input-mdp-check');
    if (inp) inp.focus();
  }, 100);
}

function fermerMdpCheck() {
  var popup = document.getElementById('popup-mdp-check');
  if (popup) popup.classList.remove('visible');
}

function analyserMdp() {
  var mdp = document.getElementById('input-mdp-check').value;
  var resDiv = document.getElementById('mdp-resultat');
  if (!mdp) {
    resDiv.style.display = 'none';
    return;
  }
  resDiv.style.display = '';

  // Listes de mots de passe communs (top 50 mondial)
  var motsCommuns = [
    '123456','password','123456789','12345','12345678','qwerty','1234567','111111','1234567890',
    '123123','azerty','admin','000000','iloveyou','aaaaaa','dragon','password1','qwerty123',
    'abc123','letmein','monkey','welcome','login','starwars','passw0rd','master','hello',
    'freedom','whatever','qazwsx','trustno1','jordan23','harley','ranger','iwantu','jennifer',
    'hunter','buster','soccer','baseball','tigger','charlie','andrew','michelle','love','sunshine',
    'jessica','asshole','696969','amanda','access'
  ];
  if (motsCommuns.indexOf(mdp.toLowerCase()) >= 0) {
    afficherResultatMdp(0, t('mdpInstant').toUpperCase(), t('mdpVeryWeak'), '#e74c3c', '💀',
      [t('mdpTopCommon'), t('mdpCrackInstant'), t('mdpChangeNow')]);
    return;
  }
  // Verifier si c'est le pseudo du joueur
  var monPseudo = (typeof getPseudo === 'function') ? (getPseudo() || '') : '';
  if (monPseudo && mdp.toLowerCase() === monPseudo.toLowerCase()) {
    afficherResultatMdp(0, t('mdpInstant').toUpperCase(), t('mdpVeryWeak'), '#e74c3c', '💀',
      [t('mdpItsYourPseudo'), t('mdpEasyGuess'), t('mdpChangeNow')]);
    return;
  }

  // Calcul de l'entropie
  var pool = 0;
  if (/[a-z]/.test(mdp)) pool += 26;
  if (/[A-Z]/.test(mdp)) pool += 26;
  if (/[0-9]/.test(mdp)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(mdp)) pool += 33;
  var combinations = Math.pow(pool, mdp.length);

  // Vitesse minimum estimee : un attaquant avec un GPU puissant teste 10 milliards de mots/sec
  // Pour le minimum (cas le pire), on prend 100 milliards/sec
  var vitesse = 100000000000;
  var secondes = combinations / vitesse;

  // Penalites
  var conseils = [];
  if (mdp.length < 6) conseils.push(t('mdpTooShort'));
  if (!/[A-Z]/.test(mdp)) conseils.push(t('mdpAddUppercase'));
  if (!/[0-9]/.test(mdp)) conseils.push(t('mdpAddNumbers'));
  if (!/[^a-zA-Z0-9]/.test(mdp)) conseils.push(t('mdpAddSymbols'));
  if (/^(.)\1+$/.test(mdp)) { secondes = 0.001; conseils.push(t('mdpAllSame')); }
  if (/^(0123|1234|abcd|qwer|azer)/i.test(mdp)) { secondes = 0.01; conseils.push(t('mdpSimpleSeq')); }

  var temps = formaterDuree(secondes);
  var niveau, couleur, emoji, pct;
  if (secondes < 1) { niveau = t('mdpVeryWeak'); couleur = '#e74c3c'; emoji = '💀'; pct = 5; }
  else if (secondes < 60) { niveau = t('mdpWeak'); couleur = '#e67e22'; emoji = '😟'; pct = 20; }
  else if (secondes < 3600) { niveau = t('mdpMedium'); couleur = '#f39c12'; emoji = '🤔'; pct = 40; }
  else if (secondes < 86400 * 30) { niveau = t('mdpGood'); couleur = '#f1c40f'; emoji = '🙂'; pct = 60; }
  else if (secondes < 86400 * 365 * 10) { niveau = t('mdpStrong'); couleur = '#2ecc71'; emoji = '😎'; pct = 80; }
  else { niveau = t('mdpVeryStrong'); couleur = '#27ae60'; emoji = '🛡️'; pct = 100; }

  if (conseils.length === 0) conseils.push(t('mdpExcellent'));
  afficherResultatMdp(pct, temps, niveau, couleur, emoji, conseils);
}

function formaterDuree(s) {
  if (s < 0.001) return t('mdpInstant');
  if (s < 1) return t('mdpLessThan1Sec');
  if (s < 60) return t('mdpSeconds', Math.round(s));
  if (s < 3600) return t('mdpMinutes', Math.round(s / 60));
  if (s < 86400) return t('mdpHours', Math.round(s / 3600));
  if (s < 86400 * 30) return t('mdpDays', Math.round(s / 86400));
  if (s < 86400 * 365) return t('mdpMonths', Math.round(s / (86400 * 30)));
  if (s < 86400 * 365 * 1000) return t('mdpYears', Math.round(s / (86400 * 365)));
  if (s < 86400 * 365 * 1e6) return t('mdpThousandsYears', Math.round(s / (86400 * 365 * 1000)));
  if (s < 86400 * 365 * 1e9) return t('mdpMillionsYears', Math.round(s / (86400 * 365 * 1e6)));
  return t('mdpBillionsYears');
}

function afficherResultatMdp(pct, temps, niveau, couleur, emoji, conseils) {
  document.getElementById('mdp-niveau').textContent = niveau;
  document.getElementById('mdp-niveau').style.color = couleur;
  document.getElementById('mdp-temps').textContent = t('mdpCrackTime') + ' ' + temps;
  document.getElementById('mdp-emoji').textContent = emoji;
  var barre = document.getElementById('mdp-barre');
  barre.style.width = pct + '%';
  barre.style.background = couleur;
  document.getElementById('mdp-conseils').innerHTML = conseils.map(function(c) { return '• ' + c; }).join('<br>');
}

