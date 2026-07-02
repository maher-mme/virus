// ============================
// SIDE ENGINE — Moteur physique side view (parcours)
// ============================
// Isole du moteur VIRUS topdown. Gere : gravite, mouvement, saut simple,
// wall-jump, coyote time, collisions AABB. Rendu via canvas 2D.
// Entree dev : window.SE.openTest() depuis le panneau admin.

var SE = SE || {};

// === Constantes physiques (px / s) ===
SE.GRAVITY           = 1800;
SE.MOVE_SPEED        = 320;
SE.WATER_SPEED_MULT  = 0.55;  // vitesse ralentie dans l'eau
SE.WATER_GRAVITY_MULT = 0.25; // gravite reduite (on flotte)
SE.WATER_FALL_MAX    = 180;   // vitesse de chute max dans l'eau (nage)
SE.WATER_SWIM_FORCE  = 340;   // impulsion vers le haut quand on nage
SE.JUMP_FORCE        = 620;
SE.TRAMP_FORCE       = 950;   // rebond du trampoline
SE.WALL_JUMP_X       = 380;
SE.WALL_SLIDE_MAX    = 100;
SE.COYOTE_TIME       = 0.10;
SE.JUMP_BUFFER       = 0.10;
SE.WALL_JUMP_LOCK    = 0.15;
SE.TELE_COOLDOWN     = 0.4;

// Types de blocs solides (physique bloque le mouvement)
// tramp = solide comme un sol (mais rebond gere ailleurs)
// porte = solide seulement si le bouton n'est pas presse (verifie dans _isSolid)
SE.SOLID_TYPES = { sol: 1, mur: 1, tramp: 1 };

// === Etat global ===
SE.canvas = null;
SE.ctx = null;
SE.level = null;
SE.player = null;
SE.camera = { x: 0, y: 0 };
SE.keys = {};
SE.running = false;
SE.lastTime = 0;
SE._jumpBufferTime = -999;
SE._wallJumpLockUntil = 0;

// === API ===
SE.init = function(canvasId, level) {
  SE.canvas = document.getElementById(canvasId);
  if (!SE.canvas) { console.error('SE: canvas introuvable ' + canvasId); return false; }
  SE.ctx = SE.canvas.getContext('2d');
  SE.level = level;
  SE.player = {
    x: level.spawn.x, y: level.spawn.y,
    w: 40, h: 48,
    vx: 0, vy: 0,
    facing: 1,
    onGround: false,
    onWallLeft: false,
    onWallRight: false,
    lastGroundTime: -999,
    won: false,
    inWater: false,
    buttonPressed: false,
    checkpointButtonState: false,   // etat du bouton snapshote au dernier checkpoint
    lastTeleTime: -999,
    respawnX: level.spawn.x,
    respawnY: level.spawn.y
  };
  // Charger le skin du joueur
  var skinId = (typeof getSkin === 'function') ? getSkin() : null;
  var skinFile = (typeof getSkinFichier === 'function' && skinId)
    ? getSkinFichier(skinId)
    : 'skin/gratuit/skin-de-base-garcon.svg';
  SE.skinImg = new Image();
  SE.skinImg.src = skinFile;
  SE._resize();
  window.addEventListener('resize', SE._resize);
  document.addEventListener('keydown', SE._onKeyDown);
  document.addEventListener('keyup', SE._onKeyUp);
  return true;
};

SE.start = function() {
  if (SE.running) return;
  SE.running = true;
  SE.lastTime = performance.now();
  requestAnimationFrame(SE._loop);
};

SE.stop = function() { SE.running = false; };

SE.cleanup = function() {
  SE.stop();
  document.removeEventListener('keydown', SE._onKeyDown);
  document.removeEventListener('keyup', SE._onKeyUp);
  window.removeEventListener('resize', SE._resize);
  SE.keys = {};
};

// === Input ===
SE._onKeyDown = function(e) {
  SE.keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'KeyZ') {
    SE._jumpBufferTime = performance.now() / 1000;
    e.preventDefault();
  }
  if (e.code === 'Escape' && typeof SE.closeTest === 'function') SE.closeTest();
};

SE._onKeyUp = function(e) { SE.keys[e.code] = false; };

SE._resize = function() {
  if (!SE.canvas) return;
  var dpr = window.devicePixelRatio || 1;
  SE.canvas.width = window.innerWidth * dpr;
  SE.canvas.height = window.innerHeight * dpr;
  SE.canvas.style.width = window.innerWidth + 'px';
  SE.canvas.style.height = window.innerHeight + 'px';
  if (SE.ctx) SE.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

// === Game loop ===
SE._loop = function(now) {
  if (!SE.running) return;
  var dt = Math.min(0.033, (now - SE.lastTime) / 1000); // cap a 30fps min pour eviter sauts physiques
  SE.lastTime = now;
  SE._update(dt);
  SE._render();
  requestAnimationFrame(SE._loop);
};

// === Physique ===
SE._update = function(dt) {
  var p = SE.player;
  if (p.won) return;
  var nowS = performance.now() / 1000;

  // 1) Input horizontal
  var inputX = 0;
  if (SE.keys['KeyA'] || SE.keys['ArrowLeft'] || SE.keys['KeyQ']) inputX -= 1;
  if (SE.keys['KeyD'] || SE.keys['ArrowRight']) inputX += 1;
  // Ralentissement si dans l'eau
  var speed = SE.MOVE_SPEED * (p.inWater ? SE.WATER_SPEED_MULT : 1);
  // Pendant wall-jump lock, l'input est ignore (sinon le perso reviendrait coller au mur)
  if (nowS < SE._wallJumpLockUntil) {
    // garde la vx imposee par le wall-jump
  } else {
    p.vx = inputX * speed;
  }
  if (inputX !== 0) p.facing = inputX;

  // 2) Saut / nage (avec coyote time + jump buffer + wall-jump + swim)
  var bufferedJump = (nowS - SE._jumpBufferTime) < SE.JUMP_BUFFER;
  if (bufferedJump) {
    if (p.inWater) {
      // Dans l'eau : nage vers le haut
      p.vy = -SE.WATER_SWIM_FORCE;
      SE._jumpBufferTime = -999;
    } else {
      var canCoyoteJump = (nowS - p.lastGroundTime) < SE.COYOTE_TIME;
      if (p.onGround || canCoyoteJump) {
        p.vy = -SE.JUMP_FORCE;
        p.lastGroundTime = -999;
        SE._jumpBufferTime = -999;
        p.onGround = false;
      } else if (p.onWallLeft) {
        p.vy = -SE.JUMP_FORCE;
        p.vx = SE.WALL_JUMP_X;
        SE._wallJumpLockUntil = nowS + SE.WALL_JUMP_LOCK;
        SE._jumpBufferTime = -999;
      } else if (p.onWallRight) {
        p.vy = -SE.JUMP_FORCE;
        p.vx = -SE.WALL_JUMP_X;
        SE._wallJumpLockUntil = nowS + SE.WALL_JUMP_LOCK;
        SE._jumpBufferTime = -999;
      }
    }
  }

  // 3) Gravite (reduite dans l'eau + cap sur la vitesse de chute)
  if (p.inWater) {
    p.vy += SE.GRAVITY * SE.WATER_GRAVITY_MULT * dt;
    if (p.vy > SE.WATER_FALL_MAX) p.vy = SE.WATER_FALL_MAX;
  } else {
    p.vy += SE.GRAVITY * dt;
  }

  // 4) Wall slide : on glisse plus lentement quand on est colle a un mur en chute
  if ((p.onWallLeft || p.onWallRight) && !p.onGround && !p.inWater && p.vy > SE.WALL_SLIDE_MAX) {
    p.vy = SE.WALL_SLIDE_MAX;
  }

  // 5) Mouvement axe par axe (resolution stable)
  p.x += p.vx * dt;
  SE._resolveX();
  p.y += p.vy * dt;
  SE._resolveY();

  // 6) Detection murs (1px de marge a chaque cote)
  p.onWallLeft  = !p.onGround && SE._touchSolid(p.x - 1, p.y + 2, p.w, p.h - 4);
  p.onWallRight = !p.onGround && SE._touchSolid(p.x + 1, p.y + 2, p.w, p.h - 4);

  // 7) MAJ memoire "etait au sol" pour coyote time
  if (p.onGround) p.lastGroundTime = nowS;

  // 8) Hors map → respawn
  if (p.y > SE.level.height + 300) SE._respawn();

  // 8a) Trampoline : si on est au sol ET la plateforme sous nous est un tramp, rebond
  if (p.onGround && SE._standingOn('tramp')) {
    p.vy = -SE.TRAMP_FORCE;
    p.onGround = false;
  }

  // 8b) Blocs non-solides (lave / eau / checkpoint / tele / bouton) — pas de collision physique, effet uniquement
  p.inWater = false;
  var plats = SE.level.platforms;
  for (var i = 0; i < plats.length; i++) {
    var bl = plats[i];
    if (!bl.type || SE.SOLID_TYPES[bl.type]) continue;
    if (bl.type === 'porte' && !p.buttonPressed) continue;   // porte fermee = solide, deja gere par collision
    if (!SE._aabb(p, bl)) continue;
    if (bl.type === 'lave') {
      SE._respawn();
      break;
    } else if (bl.type === 'eau') {
      p.inWater = true;
    } else if (bl.type === 'checkpoint') {
      if (p.respawnX !== bl.x || p.respawnY !== bl.y) {
        p.respawnX = bl.x;
        p.respawnY = bl.y - p.h;
        // Snapshot de l'etat des boutons au moment du checkpoint → conserve au respawn
        p.checkpointButtonState = p.buttonPressed;
        // Pas de notification (feedback visuel implicite : le checkpoint est passe)
      }
    } else if (bl.type === 'bouton' && !p.buttonPressed) {
      p.buttonPressed = true;
      if (typeof showNotif === 'function') showNotif((typeof t === 'function' ? t('edButtonPressed') : null) || 'Bouton active !', 'info');
    } else if (bl.type === 'tele' && (nowS - p.lastTeleTime) > SE.TELE_COOLDOWN) {
      // Trouve un autre portail du meme linkId
      var partner = plats.find(function(o) {
        return o.type === 'tele' && o.linkId === bl.linkId && o !== bl;
      });
      if (partner) {
        p.x = partner.x + (partner.w - p.w) / 2;
        p.y = partner.y + (partner.h - p.h) / 2;
        p.lastTeleTime = nowS;
      }
    }
  }

  // 9) Arrivee → victoire, on stoppe et on retourne a l'editeur (ou menu-salon)
  if (SE.level.endZone && SE._aabb(p, SE.level.endZone) && !p.won) {
    p.won = true;
    SE.stop();
    if (typeof showNotif === 'function') showNotif((typeof t === 'function' ? t('edWon') : null) || 'GAGNE !', 'success');
    setTimeout(function() { SE.closeTest(); }, 1000);
  }

  // 10) Camera centree sur le joueur, bornee au niveau
  var cssW = SE.canvas.clientWidth;
  var cssH = SE.canvas.clientHeight;
  SE.camera.x = p.x + p.w / 2 - cssW / 2;
  SE.camera.y = p.y + p.h / 2 - cssH / 2;
  SE.camera.x = Math.max(0, Math.min(SE.level.width - cssW, SE.camera.x));
  SE.camera.y = Math.max(0, Math.min(SE.level.height - cssH, SE.camera.y));
};

SE._respawn = function() {
  var p = SE.player;
  p.x = p.respawnX;
  p.y = p.respawnY;
  p.vx = 0; p.vy = 0;
  // Restaurer l'etat du bouton snapshote au dernier checkpoint
  // → si le joueur avait deja active un bouton avant le checkpoint, la porte reste ouverte
  p.buttonPressed = p.checkpointButtonState;
};

// === Collisions AABB ===
SE._aabb = function(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
};

SE._isSolid = function(pl) {
  if (pl.type === 'porte') return !SE.player.buttonPressed;   // porte s'ouvre si bouton actif
  return !pl.type || SE.SOLID_TYPES[pl.type];
};

SE._touchSolid = function(x, y, w, h) {
  var box = { x: x, y: y, w: w, h: h };
  var plats = SE.level.platforms;
  for (var i = 0; i < plats.length; i++) {
    if (SE._isSolid(plats[i]) && SE._aabb(box, plats[i])) return true;
  }
  return false;
};

// Test si on est debout sur un bloc du type donne (tramp par exemple)
SE._standingOn = function(type) {
  var p = SE.player;
  // On teste juste sous le joueur (1px sous ses pieds)
  var probe = { x: p.x + 2, y: p.y + p.h, w: p.w - 4, h: 1 };
  var plats = SE.level.platforms;
  for (var i = 0; i < plats.length; i++) {
    if (plats[i].type === type && SE._aabb(probe, plats[i])) return true;
  }
  return false;
};

SE._resolveX = function() {
  var p = SE.player;
  var plats = SE.level.platforms;
  for (var i = 0; i < plats.length; i++) {
    var pl = plats[i];
    if (!SE._isSolid(pl)) continue;
    if (SE._aabb(p, pl)) {
      if (p.vx > 0)      p.x = pl.x - p.w;
      else if (p.vx < 0) p.x = pl.x + pl.w;
      p.vx = 0;
    }
  }
};

SE._resolveY = function() {
  var p = SE.player;
  p.onGround = false;
  var plats = SE.level.platforms;
  for (var i = 0; i < plats.length; i++) {
    var pl = plats[i];
    if (!SE._isSolid(pl)) continue;
    if (SE._aabb(p, pl)) {
      if (p.vy > 0) {
        p.y = pl.y - p.h;
        p.onGround = true;
      } else if (p.vy < 0) {
        p.y = pl.y + pl.h;
      }
      p.vy = 0;
    }
  }
};

// === Rendu ===
SE._render = function() {
  var ctx = SE.ctx;
  var cssW = SE.canvas.clientWidth;
  var cssH = SE.canvas.clientHeight;

  // Fond
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.translate(-SE.camera.x, -SE.camera.y);

  // Plateformes (delegue au drawBlock de l'editeur si dispo pour un rendu type-aware)
  var plats = SE.level.platforms;
  for (var i = 0; i < plats.length; i++) {
    var pl = plats[i];
    if (typeof ED !== 'undefined' && typeof ED._drawBlock === 'function') {
      ED._drawBlock(ctx, pl);
    } else {
      ctx.fillStyle = pl.color || '#8b6f47';
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    }
  }

  // Arrivee
  if (SE.level.endZone) {
    var ez = SE.level.endZone;
    ctx.fillStyle = 'rgba(46,204,113,0.4)';
    ctx.fillRect(ez.x, ez.y, ez.w, ez.h);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 3;
    ctx.strokeRect(ez.x, ez.y, ez.w, ez.h);
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('ARRIVEE', ez.x + 6, ez.y + 20);
  }

  // Spawn
  if (SE.level.spawn) {
    ctx.fillStyle = 'rgba(52,152,219,0.3)';
    ctx.beginPath();
    ctx.arc(SE.level.spawn.x + 14, SE.level.spawn.y + 20, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Joueur : dessiner le skin si charge, sinon rectangle rouge en fallback
  var p = SE.player;
  if (SE.skinImg && SE.skinImg.complete && SE.skinImg.naturalWidth > 0) {
    if (p.facing < 0) {
      ctx.save();
      ctx.translate(p.x + p.w, p.y);
      ctx.scale(-1, 1);
      ctx.drawImage(SE.skinImg, 0, 0, p.w, p.h);
      ctx.restore();
    } else {
      ctx.drawImage(SE.skinImg, p.x, p.y, p.w, p.h);
    }
  } else {
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, cssW, 30);
  ctx.fillStyle = '#ecf0f1';
  ctx.font = '13px Arial';
  ctx.fillText('A/D ou ←/→ = bouger | Espace = sauter | Wall-jump : contre mur + Espace | Echap = quitter', 10, 19);
};

// === Niveau de test hardcode ===
// Decale vers le bas (y plus eleves) pour qu'on voit le sol direct au lancement
SE.TEST_LEVEL = {
  width: 2400,
  height: 700,
  spawn: { x: 80, y: 452 },
  platforms: [
    // Sol gauche + plateforme de spawn (le joueur tombe dessus)
    { x: 0,    y: 500, w: 600, h: 200, color: '#6b8e23' },
    // Plateformes flottantes (saut)
    { x: 350,  y: 360, w: 90,  h: 18,  color: '#a08056' },
    { x: 500,  y: 260, w: 90,  h: 18,  color: '#a08056' },
    // Mur bas (test collision laterale)
    { x: 700,  y: 300, w: 50,  h: 200, color: '#5d4e37' },
    // Gap + plateforme suivante
    { x: 900,  y: 500, w: 350, h: 200, color: '#6b8e23' },
    // Mur haut pour tester wall-jump (corridor)
    { x: 1340, y: 50,  w: 50,  h: 450, color: '#5d4e37' },
    { x: 1500, y: 150, w: 50,  h: 450, color: '#5d4e37' },
    // Sol final (en haut, accessible via wall-jumps)
    { x: 1390, y: 0,   w: 220, h: 50,  color: '#6b8e23' },
    // Sol bas droit (zone d'arrivee)
    { x: 1600, y: 500, w: 800, h: 200, color: '#6b8e23' },
    // Petits obstacles
    { x: 1900, y: 440, w: 40,  h: 60,  color: '#5d4e37' },
    { x: 2100, y: 400, w: 40,  h: 100, color: '#5d4e37' }
  ],
  endZone: { x: 2280, y: 420, w: 80, h: 80 }
};

// === Entree depuis le panneau dev ===
SE.openTest = function() {
  if (typeof peutOuvrirConsole === 'function' && !peutOuvrirConsole()) {
    if (typeof showNotif === 'function') showNotif('Reserve aux admins dev', 'warn');
    return;
  }
  SE.returnScreen = 'menu-salon';
  SE.returnCallback = null;
  if (typeof showScreen === 'function') showScreen('se-test');
  setTimeout(function() {
    SE.init('se-canvas', SE.TEST_LEVEL);
    SE.start();
  }, 50);
};

SE.closeTest = function() {
  SE.cleanup();
  var ret = SE.returnScreen || 'menu-salon';
  var cb = SE.returnCallback;
  SE.returnScreen = null;
  SE.returnCallback = null;
  if (typeof showScreen === 'function') showScreen(ret);
  if (typeof cb === 'function') setTimeout(cb, 60);
};
