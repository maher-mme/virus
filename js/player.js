// ============================
// JEU - DEPLACEMENT JOUEUR
// ============================
var joueurX = 3800;
var joueurY = 3050;
var vitesse = 8;
var keys = {};
var jeuActif = false;
var isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
var modeHorsLigne = false;
var monRole = 'innocent';
var espionCamp = null; // 'virus' ou 'innocent' - le camp choisi par l'espion

// Stats de la partie en cours (pour le resume)
var partieKills = 0;
var partieMissions = 0;
var partieStartTime = 0;
var partieMortTime = 0;

var reunionEnCours = false;
var reunionTimer = null;
var voteChoisi = -1; // index du joueur vote

// Map dimensions
var MAP_W = 8000;
var MAP_H = 6000;

// Collision system
var collisionRects = [];
var PJ_W = 22;
var PJ_H = 38;
var PJ_OX = 4;
var PJ_OY = 8;
var WALL_THICK = 6;

// Zones praticables (couloirs + boutiques)
var walkableRects = [];

function buildWalkableData() {
  walkableRects = [];
  var map = document.getElementById('mall-map');
  if (!map) return;
  // Ajouter les couloirs
  map.querySelectorAll('.corridor, .corridor-place').forEach(function(c) {
    walkableRects.push({ x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight });
  });
  // Ajouter les boutiques comme zones praticables
  map.querySelectorAll('.boutique').forEach(function(b) {
    walkableRects.push({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight });
  });
}

function isInWalkable(px, py) {
  var x1 = px + PJ_OX;
  var y1 = py + PJ_OY;
  var x2 = x1 + PJ_W;
  var y2 = y1 + PJ_H;
  // Le joueur doit etre ENTIEREMENT dans au moins une zone praticable
  for (var i = 0; i < walkableRects.length; i++) {
    var r = walkableRects[i];
    if (x1 >= r.x && x2 <= r.x + r.w && y1 >= r.y && y2 <= r.y + r.h) {
      return true;
    }
  }
  // Verification partielle : le centre du joueur est dans une zone praticable
  var cx = px + PJ_OX + PJ_W / 2;
  var cy = py + PJ_OY + PJ_H / 2;
  for (var j = 0; j < walkableRects.length; j++) {
    var r2 = walkableRects[j];
    if (cx >= r2.x && cx <= r2.x + r2.w && cy >= r2.y && cy <= r2.y + r2.h) {
      return true;
    }
  }
  return false;
}

function buildCollisionData() {
  collisionRects = [];
  buildWalkableData();
  var map = document.getElementById('mall-map');
  if (!map) return;
  var boutiques = map.querySelectorAll('.boutique');
  boutiques.forEach(function(b) {
    var bx = b.offsetLeft;
    var by = b.offsetTop;
    var bw = b.offsetWidth;
    var bh = b.offsetHeight;
    if (bw === 0 || bh === 0) return;

    // Parse doors
    var topDoors = [], bottomDoors = [], leftDoors = [], rightDoors = [];
    b.querySelectorAll('.boutique-porte').forEach(function(p) {
      var ps = p.style;
      if (ps.bottom && parseInt(ps.bottom) < 0) {
        bottomDoors.push({ start: parseInt(ps.left) || 0, size: parseInt(ps.width) || 36 });
      } else if (ps.top && parseInt(ps.top) < 0) {
        topDoors.push({ start: parseInt(ps.left) || 0, size: parseInt(ps.width) || 36 });
      } else if (ps.left && parseInt(ps.left) < 0) {
        leftDoors.push({ start: parseInt(ps.top) || 0, size: parseInt(ps.height) || 50 });
      } else if (ps.right && parseInt(ps.right) < 0) {
        rightDoors.push({ start: parseInt(ps.top) || 0, size: parseInt(ps.height) || 50 });
      }
    });

    // Build walls with door gaps
    buildWall(bx, by, bw, WALL_THICK, topDoors, true);
    buildWall(bx, by + bh - WALL_THICK, bw, WALL_THICK, bottomDoors, true);
    buildWall(bx, by, WALL_THICK, bh, leftDoors, false);
    buildWall(bx + bw - WALL_THICK, by, WALL_THICK, bh, rightDoors, false);

    // Interior objects collision - clip against door clearance zones
    var DOOR_CLEARANCE = 60;
    b.querySelectorAll('[class*="obj-"]').forEach(function(o) {
      var ow = o.offsetWidth;
      var oh = o.offsetHeight;
      if (ow > 2 && oh > 2) {
        var ox = o.offsetLeft;
        var oy = o.offsetTop;
        var rects = [{ x: ox, y: oy, w: ow, h: oh }];

        // Clip against bottom door clearance
        bottomDoors.forEach(function(d) {
          var nr = [];
          rects.forEach(function(r) {
            if (r.y + r.h > bh - DOOR_CLEARANCE && r.x < d.start + d.size && r.x + r.w > d.start) {
              if (r.x < d.start) nr.push({ x: r.x, y: r.y, w: d.start - r.x, h: r.h });
              if (r.x + r.w > d.start + d.size) nr.push({ x: d.start + d.size, y: r.y, w: (r.x + r.w) - (d.start + d.size), h: r.h });
            } else { nr.push(r); }
          });
          rects = nr;
        });

        // Clip against top door clearance
        topDoors.forEach(function(d) {
          var nr = [];
          rects.forEach(function(r) {
            if (r.y < DOOR_CLEARANCE && r.x < d.start + d.size && r.x + r.w > d.start) {
              if (r.x < d.start) nr.push({ x: r.x, y: r.y, w: d.start - r.x, h: r.h });
              if (r.x + r.w > d.start + d.size) nr.push({ x: d.start + d.size, y: r.y, w: (r.x + r.w) - (d.start + d.size), h: r.h });
            } else { nr.push(r); }
          });
          rects = nr;
        });

        // Clip against left door clearance
        leftDoors.forEach(function(d) {
          var nr = [];
          rects.forEach(function(r) {
            if (r.x < DOOR_CLEARANCE && r.y < d.start + d.size && r.y + r.h > d.start) {
              if (r.y < d.start) nr.push({ x: r.x, y: r.y, w: r.w, h: d.start - r.y });
              if (r.y + r.h > d.start + d.size) nr.push({ x: r.x, y: d.start + d.size, w: r.w, h: (r.y + r.h) - (d.start + d.size) });
            } else { nr.push(r); }
          });
          rects = nr;
        });

        // Clip against right door clearance
        rightDoors.forEach(function(d) {
          var nr = [];
          rects.forEach(function(r) {
            if (r.x + r.w > bw - DOOR_CLEARANCE && r.y < d.start + d.size && r.y + r.h > d.start) {
              if (r.y < d.start) nr.push({ x: r.x, y: r.y, w: r.w, h: d.start - r.y });
              if (r.y + r.h > d.start + d.size) nr.push({ x: r.x, y: d.start + d.size, w: r.w, h: (r.y + r.h) - (d.start + d.size) });
            } else { nr.push(r); }
          });
          rects = nr;
        });

        // Add surviving collision rects (converted to absolute coords)
        rects.forEach(function(r) {
          if (r.w > 2 && r.h > 2) {
            collisionRects.push({ x: bx + r.x, y: by + r.y, w: r.w, h: r.h });
          }
        });
      }
    });
  });

  // Fontaine centrale
  var fontaines = map.querySelectorAll('.mall-fontaine');
  fontaines.forEach(function(f) {
    collisionRects.push({ x: f.offsetLeft, y: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight });
  });
}

function buildWall(wx, wy, ww, wh, doors, horizontal) {
  if (doors.length === 0) {
    collisionRects.push({ x: wx, y: wy, w: ww, h: wh });
    return;
  }
  doors.sort(function(a, b) { return a.start - b.start; });
  var cur = 0;
  for (var i = 0; i < doors.length; i++) {
    var ds = doors[i].start;
    var de = ds + doors[i].size;
    if (horizontal) {
      if (ds > cur) collisionRects.push({ x: wx + cur, y: wy, w: ds - cur, h: wh });
      cur = de;
    } else {
      if (ds > cur) collisionRects.push({ x: wx, y: wy + cur, w: ww, h: ds - cur });
      cur = de;
    }
  }
  if (horizontal && cur < ww) {
    collisionRects.push({ x: wx + cur, y: wy, w: ww - cur, h: wh });
  } else if (!horizontal && cur < wh) {
    collisionRects.push({ x: wx, y: wy + cur, w: ww, h: wh - cur });
  }
}

function checkCollision(px, py) {
  var x1 = px + PJ_OX;
  var y1 = py + PJ_OY;
  var x2 = x1 + PJ_W;
  var y2 = y1 + PJ_H;
  for (var i = 0; i < collisionRects.length; i++) {
    var r = collisionRects[i];
    if (x2 > r.x && x1 < r.x + r.w && y2 > r.y && y1 < r.y + r.h) {
      return true;
    }
  }
  return false;
}

document.addEventListener('keydown', function(e) {
  // Ne pas capturer les touches si on est dans un champ de saisie
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  keys[e.key] = true;
  // Empecher le scroll de la page avec les fleches
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key) > -1) {
    e.preventDefault();
  }
  // Touche M : ouvrir le picker d'emotes (si en jeu)
  if ((e.key === 'm' || e.key === 'M') && typeof jeuActif !== 'undefined' && jeuActif && typeof toggleEmotePicker === 'function') {
    toggleEmotePicker();
  }
});
document.addEventListener('keyup', function(e) {
  keys[e.key] = false;
});

// Deplacement mobile : toucher pour se deplacer vers le doigt
var touchActif = false;
var touchTargetX = 0, touchTargetY = 0;

// === JOYSTICK VIRTUEL ===
var joystickActif = false;
var joystickDx = 0, joystickDy = 0;
var joystickCx = 0, joystickCy = 0;
var joystickTouchId = null;
var JOYSTICK_RADIUS = 50;

function getControleMobile() {
  var v = localStorage.getItem('virusControleMobile');
  return v || 'joystick'; // 'joystick' (default) ou 'tap'
}
function setControleMobile(mode) {
  localStorage.setItem('virusControleMobile', mode);
  majToggleControleMobile();
}
function majToggleControleMobile() {
  var btn = document.getElementById('toggle-controle-mobile');
  var lbl = document.getElementById('toggle-controle-mobile-label');
  var actif = (getControleMobile() === 'joystick');
  if (btn) btn.classList.toggle('active', actif);
  if (lbl) lbl.classList.toggle('active', actif);
}
function toggleControleMobile() {
  setControleMobile(getControleMobile() === 'joystick' ? 'tap' : 'joystick');
}

function showJoystickAt(cx, cy) {
  var base = document.getElementById('joystick-base');
  var stick = document.getElementById('joystick-stick');
  if (!base || !stick) return;
  joystickCx = cx;
  joystickCy = cy;
  base.style.left = cx + 'px';
  base.style.top = cy + 'px';
  base.style.display = 'block';
  stick.style.left = '50%';
  stick.style.top = '50%';
  stick.style.transform = 'translate(-50%, -50%)';
}
function updateJoystickStick(cx, cy) {
  var dx = cx - joystickCx;
  var dy = cy - joystickCy;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var clamped = Math.min(dist, JOYSTICK_RADIUS);
  var nx = dist > 0 ? dx / dist : 0;
  var ny = dist > 0 ? dy / dist : 0;
  var stickX = nx * clamped;
  var stickY = ny * clamped;
  var stick = document.getElementById('joystick-stick');
  if (stick) {
    stick.style.left = 'calc(50% + ' + stickX + 'px)';
    stick.style.top = 'calc(50% + ' + stickY + 'px)';
    stick.style.transform = 'translate(-50%, -50%)';
  }
  var intensity = clamped / JOYSTICK_RADIUS;
  joystickDx = nx * intensity;
  joystickDy = ny * intensity;
}
function hideJoystick() {
  var base = document.getElementById('joystick-base');
  if (base) base.style.display = 'none';
  joystickActif = false;
  joystickDx = 0;
  joystickDy = 0;
  joystickTouchId = null;
}

if (isMobile) {
  var touchViewport = document.getElementById('jeu-viewport');
  if (touchViewport) {
    touchViewport.addEventListener('touchstart', function(e) {
      if (camerasOuvertes || reunionEnCours) return;
      var touch = e.changedTouches[0];
      if (!touch) return;
      // Verifier si un bouton du HUD est sous le doigt
      var hud = document.querySelector('.jeu-hud');
      if (hud) {
        hud.style.pointerEvents = 'auto';
        var elSous = document.elementFromPoint(touch.clientX, touch.clientY);
        hud.style.pointerEvents = 'none';
        if (elSous && elSous.closest && elSous.closest('button')) {
          elSous.closest('button').click();
          return;
        }
      }
      e.preventDefault();
      var mode = getControleMobile();
      if (mode === 'joystick') {
        joystickActif = true;
        joystickTouchId = touch.identifier;
        showJoystickAt(touch.clientX, touch.clientY);
      } else {
        touchActif = true;
        updateTouchTarget(e);
      }
    }, { passive: false });
    touchViewport.addEventListener('touchmove', function(e) {
      var mode = getControleMobile();
      if (mode === 'joystick' && joystickActif) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier === joystickTouchId) {
            updateJoystickStick(t.clientX, t.clientY);
            break;
          }
        }
      } else if (touchActif) {
        e.preventDefault();
        updateTouchTarget(e);
      }
    }, { passive: false });
    touchViewport.addEventListener('touchend', function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          hideJoystick();
        }
      }
      touchActif = false;
    }, { passive: false });
    touchViewport.addEventListener('touchcancel', function(e) {
      hideJoystick();
      touchActif = false;
    }, { passive: false });
  }
}

function updateTouchTarget(e) {
  var touch = e.touches[0];
  if (!touch) return;
  var vp = document.getElementById('jeu-viewport');
  if (!vp) return;
  var rect = vp.getBoundingClientRect();
  var vw = vp.clientWidth;
  var vh = vp.clientHeight;
  // Calculer l'offset camera (meme formule que updateJoueur)
  var camX = joueurX - vw / 2 + 14;
  var camY = joueurY - vh / 2 + 14;
  if (camX < 0) camX = 0;
  if (camY < 0) camY = 0;
  if (camX > MAP_W - vw) camX = MAP_W - vw;
  if (camY > MAP_H - vh) camY = MAP_H - vh;
  // Convertir coordonnees ecran en coordonnees map
  touchTargetX = (touch.clientX - rect.left) + camX;
  touchTargetY = (touch.clientY - rect.top) + camY;
}

// Demarrer la musique au premier clic (autoplay bloque par les navigateurs)
var musiqueInitialisee = false;
document.addEventListener('click', function() {
  if (musiqueInitialisee) return;
  musiqueInitialisee = true;
  var audio = document.getElementById('musique-menu');
  var jeuActifScreen = document.getElementById('jeu');
  if (audio && !musiqueMuted && !(jeuActifScreen && jeuActifScreen.classList.contains('active'))) {
    audio.play().catch(function() {});
  }
}, { once: false });
