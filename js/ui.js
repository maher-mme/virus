// Navigation entre ecrans
var musiqueMuted = false;
function toggleMusique() {
  var audio = document.getElementById('musique-menu');
  var btn = document.getElementById('btn-musique');
  if (!audio) return;
  if (musiqueMuted) {
    audio.play();
    btn.classList.remove('muted');
    btn.innerHTML = '&#9835;';
    musiqueMuted = false;
  } else {
    audio.pause();
    btn.classList.add('muted');
    btn.innerHTML = '&#9835;';
    musiqueMuted = true;
  }
}

function gererMusiqueMenu(ecranId) {
  var audio = document.getElementById('musique-menu');
  if (!audio) return;
  if (ecranId === 'jeu' || ecranId === 'salle-attente') {
    audio.pause();
    audio.currentTime = 0;
  } else {
    if (!musiqueMuted && audio.paused) {
      audio.play().catch(function() {});
    }
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

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  screen.classList.add('active', 'fade-in');
  setTimeout(() => screen.classList.remove('fade-in'), 300);

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
    btnAmis.style.display = (id === 'ecran-compte' || modeHorsLigne) ? 'none' : 'flex';
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
  var isVisible = chat.style.display === 'flex';
  // Rendre le parent visible (sa-droite-chat-col est display:none sur mobile)
  var chatCol = chat.closest('.sa-droite-chat-col');
  if (isVisible) {
    // Fermer le chat
    chat.style.display = 'none';
    chat.style.position = '';
    chat.style.top = '';
    chat.style.bottom = '';
    chat.style.left = '';
    chat.style.right = '';
    chat.style.zIndex = '';
    chat.style.maxHeight = '';
    chat.style.height = '';
    chat.style.borderRadius = '';
    chat.style.boxShadow = '';
    btn.style.top = '';
    btn.style.bottom = '';
    btn.style.right = '';
    btn.style.left = '';
    btn.style.position = '';
    btn.style.zIndex = '';
    if (chatCol) chatCol.style.display = '';
  } else {
    // Rendre le parent visible pour pouvoir afficher le chat
    if (chatCol) chatCol.style.display = 'block';
    // Ouvrir le chat en plein ecran
    chat.style.display = 'flex';
    chat.style.position = 'fixed';
    chat.style.top = '50px';
    chat.style.bottom = '0';
    chat.style.left = '0';
    chat.style.right = '0';
    chat.style.zIndex = '400';
    chat.style.maxHeight = 'none';
    chat.style.height = 'auto';
    chat.style.borderRadius = '12px 12px 0 0';
    chat.style.boxShadow = '0 -4px 30px rgba(0,0,0,0.8)';
    // Bouton en haut a GAUCHE pour fermer (droite = bouton amis)
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.left = '10px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    btn.style.zIndex = '410';
  }
  btn.classList.toggle('active');
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

