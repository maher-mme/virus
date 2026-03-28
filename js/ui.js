// Navigation entre ecrans

// === DETECTION DE MISE A JOUR ===
var CURRENT_VERSION = '1.7.3';
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

