// ============================
// SYSTEME DE PARTICULES
// ============================
// API simple pour spawner des particules (kill, victoire, mission, etc.)
// Les particules sont des divs CSS animees, auto-nettoyees apres l'animation.

var _particlesContainer = null;
function _getParticlesContainer() {
  if (_particlesContainer && document.body.contains(_particlesContainer)) return _particlesContainer;
  _particlesContainer = document.createElement('div');
  _particlesContainer.id = 'particles-layer';
  _particlesContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(_particlesContainer);
  return _particlesContainer;
}

// Particule generique : x,y point d'origine en clientX/clientY (px ecran)
// options : { count, emoji, colors, minSize, maxSize, minSpeed, maxSpeed, gravity, duration, spread }
function spawnParticles(x, y, options) {
  options = options || {};
  var count = options.count || 12;
  var emoji = options.emoji || '';
  var colors = options.colors || ['#e74c3c', '#f39c12', '#f1c40f'];
  var minSize = options.minSize || 6;
  var maxSize = options.maxSize || 12;
  var minSpeed = options.minSpeed || 200;
  var maxSpeed = options.maxSpeed || 450;
  var gravity = options.gravity !== undefined ? options.gravity : 600;
  var duration = options.duration || 800;
  var spread = options.spread || (Math.PI * 2); // 2*PI = explosion 360deg

  var container = _getParticlesContainer();
  for (var i = 0; i < count; i++) {
    var p = document.createElement('div');
    var size = minSize + Math.random() * (maxSize - minSize);
    var angle = (Math.random() - 0.5) * spread - Math.PI / 2; // -90deg base
    var speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    var vx = Math.cos(angle) * speed;
    var vy = Math.sin(angle) * speed;
    var color = colors[Math.floor(Math.random() * colors.length)];

    p.style.cssText = [
      'position:absolute',
      'left:' + x + 'px',
      'top:' + y + 'px',
      'width:' + size + 'px',
      'height:' + size + 'px',
      emoji ? 'font-size:' + size + 'px' : 'background:' + color,
      emoji ? '' : 'border-radius:50%',
      'pointer-events:none',
      'will-change:transform,opacity',
      'transform:translate(-50%,-50%)',
      'transition:transform ' + duration + 'ms cubic-bezier(0.2,0.6,0.4,1), opacity ' + duration + 'ms ease-out'
    ].filter(Boolean).join(';');
    if (emoji) p.textContent = emoji;
    container.appendChild(p);

    // Trigger animation au prochain frame
    var dx = vx * (duration / 1000);
    var dy = vy * (duration / 1000) + 0.5 * gravity * Math.pow(duration / 1000, 2);
    var rot = (Math.random() - 0.5) * 720;
    (function(el, dx, dy, rot) {
      requestAnimationFrame(function() {
        el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + rot + 'deg)';
        el.style.opacity = '0';
      });
      setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, duration + 50);
    })(p, dx, dy, rot);
  }
}

// Helpers : spawn par presets

// Confettis (victoire)
function spawnConfettis(x, y) {
  spawnParticles(x, y, {
    count: 40,
    colors: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'],
    minSize: 5, maxSize: 10,
    minSpeed: 300, maxSpeed: 600,
    gravity: 700,
    duration: 1500,
    spread: Math.PI * 1.5
  });
}

// Explosion sang/mort (kill)
function spawnExplosionMort(x, y) {
  spawnParticles(x, y, {
    count: 18,
    colors: ['#8b0000', '#c0392b', '#641e16'],
    minSize: 4, maxSize: 9,
    minSpeed: 150, maxSpeed: 350,
    gravity: 400,
    duration: 700
  });
}

// Etincelles (mission)
function spawnEtincelles(x, y) {
  spawnParticles(x, y, {
    count: 14,
    emoji: '✨',
    minSize: 16, maxSize: 28,
    minSpeed: 100, maxSpeed: 250,
    gravity: 100,
    duration: 900,
    spread: Math.PI * 2
  });
}

// Coeurs (emote love)
function spawnCoeurs(x, y) {
  spawnParticles(x, y, {
    count: 8,
    emoji: '❤️',
    minSize: 18, maxSize: 28,
    minSpeed: 80, maxSpeed: 180,
    gravity: -200, // remontent
    duration: 1200,
    spread: Math.PI / 2
  });
}

// Notes de musique
function spawnNotes(x, y) {
  spawnParticles(x, y, {
    count: 6,
    emoji: '🎵',
    minSize: 18, maxSize: 26,
    minSpeed: 60, maxSpeed: 150,
    gravity: -150,
    duration: 1200,
    spread: Math.PI / 1.5
  });
}

// Helper : spawn relatif a un element DOM
function spawnParticlesOnElement(element, preset) {
  if (!element) return;
  var rect = element.getBoundingClientRect();
  var cx = rect.left + rect.width / 2;
  var cy = rect.top + rect.height / 2;
  switch (preset) {
    case 'confettis': spawnConfettis(cx, cy); break;
    case 'mort': spawnExplosionMort(cx, cy); break;
    case 'etincelles': spawnEtincelles(cx, cy); break;
    case 'coeurs': spawnCoeurs(cx, cy); break;
    case 'notes': spawnNotes(cx, cy); break;
    default: spawnParticles(cx, cy, {});
  }
}
