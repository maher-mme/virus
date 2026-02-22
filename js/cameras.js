// ============================
// SYSTEME DE CAMERAS DE SECURITE
// ============================
var CAMERAS = [
  { nom: 'CAM 1 - FONTAINE', x: 3500, y: 2500, w: 600, h: 600 },
  { nom: 'CAM 2 - BIJOUTERIE', x: 7300, y: 0, w: 700, h: 500 },
  { nom: 'CAM 3 - ARCADE', x: 2300, y: 3600, w: 800, h: 600 },
  { nom: 'CAM 4 - SUPERMARCHE', x: 0, y: 3000, w: 900, h: 700 },
  { nom: 'CAM 5 - LIBRAIRIE', x: 0, y: 800, w: 700, h: 600 },
  { nom: 'CAM 6 - CAFE', x: 3600, y: 0, w: 650, h: 400 }
];
var camerasOuvertes = false;
var camerasInterval = null;
var SECURITE_RECT = { x: 2800, y: 60, w: 450, h: 300 };

var sonConnect = new Audio('Audio/Connect.mp3');
var sonDisconnect = new Audio('Audio/Disconnect.mp3');

function ouvrirCameras() {
  camerasOuvertes = true;
  sonConnect.currentTime = 0;
  sonConnect.play().catch(function(){});
  var overlay = document.getElementById('cameras-overlay');
  overlay.classList.add('visible');
  // Generer les panneaux
  var grille = document.getElementById('cameras-grille');
  var html = '';
  for (var c = 0; c < CAMERAS.length; c++) {
    html += '<div class="camera-panel" id="cam-panel-' + c + '">' +
      '<div class="camera-panel-header">' +
        '<span class="camera-panel-nom">' + CAMERAS[c].nom + '</span>' +
        '<span class="camera-panel-rec">● REC</span>' +
      '</div>' +
      '<div class="camera-panel-vue" id="cam-vue-' + c + '"></div>' +
      '<div class="camera-dots-layer" id="cam-dots-' + c + '"></div>' +
      '<div class="camera-scanlines"></div>' +
    '</div>';
  }
  grille.innerHTML = html;
  // Cloner la vraie map HTML dans chaque camera
  var mallMap = document.getElementById('mall-map');
  setTimeout(function() {
    for (var c = 0; c < CAMERAS.length; c++) {
      var vue = document.getElementById('cam-vue-' + c);
      if (!vue || !mallMap) continue;
      var cam = CAMERAS[c];
      var pw = vue.offsetWidth || 220;
      var ph = vue.offsetHeight || 165;
      // Echelle pour que la zone camera remplisse le panel
      var scaleX = pw / cam.w;
      var scaleY = ph / cam.h;
      var scale = Math.max(scaleX, scaleY);
      // Cloner la map
      var clone = mallMap.cloneNode(true);
      clone.removeAttribute('id');
      clone.className = 'camera-map-clone';
      clone.style.width = '8000px';
      clone.style.height = '6000px';
      // Utiliser left/top au lieu de translate pour eviter le clipping du navigateur
      clone.style.left = (-cam.x * scale) + 'px';
      clone.style.top = (-cam.y * scale) + 'px';
      clone.style.transform = 'scale(' + scale + ')';
      clone.style.transformOrigin = '0 0';
      vue.appendChild(clone);
    }
    updateCameras();
  }, 50);
  camerasInterval = setInterval(updateCameras, 100);
}

function fermerCameras() {
  camerasOuvertes = false;
  sonDisconnect.currentTime = 0;
  sonDisconnect.play().catch(function(){});
  document.getElementById('cameras-overlay').classList.remove('visible');
  if (camerasInterval) { clearInterval(camerasInterval); camerasInterval = null; }
}

function updateCameras() {
  var pseudo = getPseudo() || t('player');
  var joueurSkin = getSkinFichier(getSkin());
  for (var c = 0; c < CAMERAS.length; c++) {
    var cam = CAMERAS[c];
    var dotsLayer = document.getElementById('cam-dots-' + c);
    if (!dotsLayer) continue;
    var html = '';
    // Verifier le joueur
    if (joueurX >= cam.x && joueurX <= cam.x + cam.w && joueurY >= cam.y && joueurY <= cam.y + cam.h) {
      var px = ((joueurX - cam.x) / cam.w) * 100;
      var py = ((joueurY - cam.y) / cam.h) * 100;
      html += '<div class="camera-perso" style="left:' + px + '%;top:' + py + '%;">' +
        '<img src="' + joueurSkin + '" alt="joueur">' +
        '<div class="camera-perso-pseudo">' + pseudo + '</div></div>';
    }
    // Verifier les bots vivants
    for (var b = 0; b < bots.length; b++) {
      if (joueursElimines.indexOf(bots[b].pseudo) >= 0) continue;
      if (bots[b].x >= cam.x && bots[b].x <= cam.x + cam.w && bots[b].y >= cam.y && bots[b].y <= cam.y + cam.h) {
        var bx = ((bots[b].x - cam.x) / cam.w) * 100;
        var by = ((bots[b].y - cam.y) / cam.h) * 100;
        html += '<div class="camera-perso" style="left:' + bx + '%;top:' + by + '%;">' +
          '<img src="' + bots[b].skin + '" alt="bot">' +
          '<div class="camera-perso-pseudo">' + bots[b].pseudo + '</div></div>';
      }
    }
    // Verifier les cadavres
    for (var cd = 0; cd < cadavres.length; cd++) {
      var cad = cadavres[cd];
      if (cad.x >= cam.x && cad.x <= cam.x + cam.w && cad.y >= cam.y && cad.y <= cam.y + cam.h) {
        var cx = ((cad.x - cam.x) / cam.w) * 100;
        var cy = ((cad.y - cam.y) / cam.h) * 100;
        html += '<div class="camera-cadavre" style="left:' + cx + '%;top:' + cy + '%;">' +
          '<span class="camera-cadavre-x">X</span>' +
          '<img src="' + cad.skin + '" alt="cadavre"></div>';
      }
    }
    dotsLayer.innerHTML = html;
  }
}
