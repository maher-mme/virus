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

  // Rafraichir la liste quand on arrive sur l'ecran
  if (id === 'liste-parties') {
    rafraichirListeParties();
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

// Toggle chat mobile (salle d'attente / reunion)
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
  chat.classList.toggle('chat-visible');
  btn.classList.toggle('active');
}

// (Cabines gerees par ouvrirCabine/fermerCabine plus haut)

