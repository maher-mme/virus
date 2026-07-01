// ============================
// EDITEUR DE NIVEAUX (Phase 2 — basique)
// ============================
// Permet de creer un niveau parcours en placant des blocs sur une grille 32x32.
// Outils dispo : sol, mur, spawn, arrivee, gomme.
// Sauvegarde locale (localStorage). Test via SE.init() sur le niveau actuel.
// Acces depuis le hub salon → card CREER (active via feature flag creerNiveau).

var ED = ED || {};

// === Constantes ===
ED.GRID_SIZE = 32;
ED.WORLD_W   = 80;   // cellules (largeur monde = 2560px)
ED.WORLD_H   = 20;   // cellules (hauteur monde = 640px)
ED.STORAGE_KEY = 'virus_editor_level';

// === Etat ===
ED.level = null;
ED.selectedTool = 'sol';
ED.customColor = null;   // null = utilise la couleur par defaut de l'outil ; sinon override
ED.canvas = null;
ED.ctx = null;
ED.isDrawing = false;
ED.isPanning = false;
ED.camera = { x: 0, y: 0 };
ED.lastSnap = { x: -1, y: -1 };
ED.hoverCell = null;

// === Definition des outils (colorables = sol / mur / lave / eau) ===
ED.TOOLS = [
  { id: 'sol',        label: 'SOL',      color: '#6b8e23', icon: '⬛', colorable: true  },
  { id: 'mur',        label: 'MUR',      color: '#5d4e37', icon: '⬛', colorable: true  },
  { id: 'lave',       label: 'LAVE',     color: '#e74c3c', icon: '🔥', colorable: false },
  { id: 'eau',        label: 'EAU',      color: '#3498db', icon: '💧', colorable: false },
  { id: 'checkpoint', label: 'CHECKPT.', color: '#f1c40f', icon: '⚐',  colorable: false },
  { id: 'spawn',      label: 'DEPART',   color: '#3498db', icon: '●',  colorable: false },
  { id: 'arrivee',    label: 'ARRIVEE',  color: '#27ae60', icon: '⚑',  colorable: false },
  { id: 'eraser',     label: 'EFFACER',  color: '#e74c3c', icon: '✖',  colorable: false }
];

// === Niveau par defaut (petite plateforme de depart + spawn place dessus) ===
ED.creerNiveauVide = function() {
  var worldW = ED.WORLD_W * ED.GRID_SIZE;
  var worldH = ED.WORLD_H * ED.GRID_SIZE;
  var platY = worldH - ED.GRID_SIZE * 4;   // sol a 4 cellules du bas
  var platforms = [];
  for (var i = 0; i < 5; i++) {
    platforms.push({
      x: i * ED.GRID_SIZE, y: platY,
      w: ED.GRID_SIZE, h: ED.GRID_SIZE,
      color: '#6b8e23', type: 'sol'
    });
  }
  return {
    titre: 'Mon niveau',
    width: worldW,
    height: worldH,
    spawn: { x: ED.GRID_SIZE, y: platY - ED.GRID_SIZE * 2 },
    platforms: platforms,
    endZone: null
  };
};

// === Ouvrir l'editeur (depuis card CREER du hub salon) ===
ED.open = function() {
  // Charger le dernier niveau sauve ou en creer un nouveau
  var saved = localStorage.getItem(ED.STORAGE_KEY);
  try { ED.level = saved ? JSON.parse(saved) : ED.creerNiveauVide(); }
  catch (e) { ED.level = ED.creerNiveauVide(); }
  if (typeof showScreen === 'function') showScreen('editeur-niveau');
  setTimeout(function() {
    ED.canvas = document.getElementById('ed-canvas');
    if (!ED.canvas) { console.error('ED: canvas introuvable'); return; }
    ED.ctx = ED.canvas.getContext('2d');
    ED.camera.x = 0;
    ED.camera.y = 0;
    ED._renderPalette();
    ED._resize();
    ED._setupEvents();
    ED._render();
  }, 50);
};

ED.close = function() {
  ED._cleanup();
  if (typeof showScreen === 'function') showScreen('menu-salon');
};

// === Actions toolbar ===
ED.save = function(silencieux) {
  try {
    localStorage.setItem(ED.STORAGE_KEY, JSON.stringify(ED.level));
    if (!silencieux && typeof showNotif === 'function') showNotif('Niveau sauvegarde', 'success');
  } catch (e) {
    if (typeof showNotif === 'function') showNotif('Erreur sauvegarde', 'error');
  }
};

ED.clearAll = function() {
  if (!confirm('Effacer tout le niveau ?')) return;
  ED.level = ED.creerNiveauVide();
  ED.save(true);
  ED._render();
};

ED.test = function() {
  if (!ED.level.spawn) {
    if (typeof showNotif === 'function') showNotif('Place un DEPART avant de tester', 'warn');
    return;
  }
  if (!ED.level.endZone) {
    if (typeof showNotif === 'function') showNotif('Place une ARRIVEE avant de tester', 'warn');
    return;
  }
  ED.save(true);
  // Lancer le moteur side avec ce niveau
  if (typeof SE === 'undefined') {
    if (typeof showNotif === 'function') showNotif('Moteur indisponible', 'error');
    return;
  }
  ED._cleanup();
  if (typeof showScreen === 'function') showScreen('se-test');
  setTimeout(function() {
    SE.init('se-canvas', ED.level);
    SE.start();
  }, 50);
};

// === PUBLIER LE NIVEAU (Phase 3) ===
ED.publier = function() {
  if (!ED.level.spawn) { showNotif('Place un DEPART avant de publier', 'warn'); return; }
  if (!ED.level.endZone) { showNotif('Place une ARRIVEE avant de publier', 'warn'); return; }
  if (!ED.level.platforms || ED.level.platforms.length < 3) {
    showNotif('Ajoute plus de blocs (min 3)', 'warn'); return;
  }
  var pop = document.getElementById('popup-publier-niveau');
  if (!pop) { showNotif('Popup indisponible', 'error'); return; }
  var input = document.getElementById('publier-titre');
  if (input) input.value = ED.level.titre || '';
  pop.classList.add('visible');
};

ED.fermerPublier = function() {
  var pop = document.getElementById('popup-publier-niveau');
  if (pop) pop.classList.remove('visible');
};

ED.publierConfirmer = function() {
  var input = document.getElementById('publier-titre');
  var titre = (input && input.value || '').trim();
  if (titre.length < 3) { showNotif('Titre trop court (3 min)', 'warn'); return; }
  if (titre.length > 40) { showNotif('Titre trop long (40 max)', 'warn'); return; }
  if (typeof db === 'undefined') { showNotif('Firebase indisponible', 'error'); return; }
  if (typeof monPlayerId === 'undefined' || !monPlayerId) {
    showNotif('Tu dois etre connecte', 'error'); return;
  }
  // Rate limit : 1 publication tous les 14 jours (bypass pour admins dev)
  var estDev = (typeof peutOuvrirConsole === 'function') && peutOuvrirConsole();
  var checkLimit = estDev ? Promise.resolve(true) : ED._checkPublishLimit();
  checkLimit.then(function(ok) {
    if (!ok) return;
    ED._doPublier(titre);
  });
};

ED._checkPublishLimit = function() {
  return db.collection('customLevels')
    .where('creatorId', '==', monPlayerId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .then(function(snap) {
      if (snap.empty) return true;
      var last = snap.docs[0].data();
      if (!last.createdAt) return true;
      var ageMs = Date.now() - last.createdAt.toMillis();
      var days = ageMs / (1000 * 60 * 60 * 24);
      if (days < 14) {
        var remaining = Math.ceil(14 - days);
        showNotif('Prochaine publication dans ' + remaining + ' jours', 'warn');
        return false;
      }
      return true;
    })
    .catch(function() { return true; });   // en cas d'erreur, on laisse passer
};

ED._doPublier = function(titre) {
  var pseudo = (typeof getPseudo === 'function') ? getPseudo() : 'Anonyme';
  var code = ED._generateCode();
  var data = {
    code: code,
    titre: titre,
    creatorId: monPlayerId,
    creatorPseudo: pseudo,
    mode: 'parcours',
    view: 'side',
    width: ED.level.width,
    height: ED.level.height,
    spawn: ED.level.spawn,
    endZone: ED.level.endZone,
    platforms: ED.level.platforms,
    plays: 0,
    likes: 0,
    reportCount: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  showNotif('Publication...', 'info');
  db.collection('customLevels').add(data).then(function() {
    showNotif('Niveau publie ! Code: ' + code, 'success');
    ED.fermerPublier();
    ED.close();
  }).catch(function(err) {
    console.error('Publish error', err);
    showNotif('Erreur publication', 'error');
  });
};

ED._generateCode = function() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

ED.selectTool = function(id) {
  ED.selectedTool = id;
  // Sync color picker sur la couleur par defaut de l'outil (sauf si outil non colorable)
  var def = ED.TOOLS.find(function(t) { return t.id === id; });
  if (def && def.colorable) {
    ED.customColor = def.color;
    var picker = document.getElementById('ed-color-picker');
    if (picker) picker.value = def.color;
  }
  ED._renderPalette();
  if (ED.canvas) {
    ED.canvas.style.cursor = (id === 'eraser') ? 'not-allowed' : 'crosshair';
  }
};

ED.setColor = function(hex) {
  ED.customColor = hex;
};

// === Palette UI ===
ED._renderPalette = function() {
  var pal = document.getElementById('ed-palette');
  if (!pal) return;
  pal.innerHTML = '';
  ED.TOOLS.forEach(function(tool) {
    var btn = document.createElement('button');
    btn.className = 'ed-tool-btn' + (tool.id === ED.selectedTool ? ' ed-tool-active' : '');
    btn.innerHTML =
      '<span class="ed-tool-icon" style="background:' + tool.color + ';">' + tool.icon + '</span>' +
      '<span class="ed-tool-label">' + tool.label + '</span>';
    btn.onclick = function() { ED.selectTool(tool.id); };
    pal.appendChild(btn);
  });

  // Color picker sous les outils (uniquement pour outils colorables)
  var def = ED.TOOLS.find(function(t) { return t.id === ED.selectedTool; });
  var colorable = def && def.colorable;
  var wrap = document.createElement('div');
  wrap.className = 'ed-color-wrap' + (colorable ? '' : ' ed-color-wrap-disabled');
  wrap.innerHTML =
    '<div class="ed-color-label">COULEUR</div>' +
    '<input type="color" id="ed-color-picker" value="' + (colorable ? (ED.customColor || def.color) : '#888888') + '"' +
    (colorable ? '' : ' disabled') + '>';
  pal.appendChild(wrap);
  var picker = wrap.querySelector('#ed-color-picker');
  picker.oninput = function(e) { ED.setColor(e.target.value); };
};

// === Events souris (placement / suppression / pan avec clic droit) ===
ED._setupEvents = function() {
  var c = ED.canvas;
  c.onmousedown = function(e) {
    if (e.button === 2) {
      // Clic droit : pan
      ED.isPanning = true;
      ED._panStart = { x: e.clientX, y: e.clientY, cx: ED.camera.x, cy: ED.camera.y };
      return;
    }
    ED.isDrawing = true;
    ED._placeAt(e);
  };
  c.onmousemove = function(e) {
    if (ED.isPanning && ED._panStart) {
      ED.camera.x = ED._panStart.cx - (e.clientX - ED._panStart.x);
      ED.camera.y = ED._panStart.cy - (e.clientY - ED._panStart.y);
      ED._clampCamera();
      ED._render();
      return;
    }
    var snap = ED._cellAt(e);
    if (snap) ED.hoverCell = snap;
    if (ED.isDrawing) ED._placeAt(e);
    else ED._render();
  };
  c.onmouseup = function() {
    if (ED.isDrawing) ED.save(true);
    ED.isDrawing = false;
    ED.isPanning = false;
    ED.lastSnap.x = -1;
    ED.lastSnap.y = -1;
  };
  c.onmouseleave = function() {
    ED.isDrawing = false;
    ED.isPanning = false;
    ED.hoverCell = null;
    ED._render();
  };
  c.oncontextmenu = function(e) { e.preventDefault(); };
  window.addEventListener('resize', ED._resize);
};

ED._cleanup = function() {
  window.removeEventListener('resize', ED._resize);
};

ED._cellAt = function(e) {
  if (!ED.canvas) return null;
  var rect = ED.canvas.getBoundingClientRect();
  var x = e.clientX - rect.left + ED.camera.x;
  var y = e.clientY - rect.top + ED.camera.y;
  if (x < 0 || y < 0 || x >= ED.level.width || y >= ED.level.height) return null;
  return {
    gx: Math.floor(x / ED.GRID_SIZE) * ED.GRID_SIZE,
    gy: Math.floor(y / ED.GRID_SIZE) * ED.GRID_SIZE
  };
};

ED._placeAt = function(e) {
  var cell = ED._cellAt(e);
  if (!cell) return;
  if (cell.gx === ED.lastSnap.x && cell.gy === ED.lastSnap.y) return;
  ED.lastSnap.x = cell.gx;
  ED.lastSnap.y = cell.gy;

  var tool = ED.selectedTool;
  if (tool === 'eraser') {
    // Supprimer tout bloc qui contient cette cellule
    ED.level.platforms = ED.level.platforms.filter(function(p) {
      return !(cell.gx >= p.x && cell.gx < p.x + p.w && cell.gy >= p.y && cell.gy < p.y + p.h);
    });
    // Spawn ?
    if (ED.level.spawn &&
        cell.gx === Math.floor(ED.level.spawn.x / ED.GRID_SIZE) * ED.GRID_SIZE &&
        cell.gy === Math.floor(ED.level.spawn.y / ED.GRID_SIZE) * ED.GRID_SIZE) {
      ED.level.spawn = null;
    }
    // Arrivee ?
    if (ED.level.endZone &&
        cell.gx >= ED.level.endZone.x && cell.gx < ED.level.endZone.x + ED.level.endZone.w &&
        cell.gy >= ED.level.endZone.y && cell.gy < ED.level.endZone.y + ED.level.endZone.h) {
      ED.level.endZone = null;
    }
  } else if (tool === 'spawn') {
    ED.level.spawn = { x: cell.gx, y: cell.gy };
  } else if (tool === 'arrivee') {
    ED.level.endZone = { x: cell.gx, y: cell.gy, w: ED.GRID_SIZE * 2, h: ED.GRID_SIZE * 2 };
  } else {
    // Blocs (sol / mur / lave / eau / checkpoint) : eviter doublon sur meme cellule
    var existe = ED.level.platforms.some(function(p) {
      return p.x === cell.gx && p.y === cell.gy && p.w === ED.GRID_SIZE && p.h === ED.GRID_SIZE;
    });
    if (existe) return;
    var toolDef = ED.TOOLS.find(function(t) { return t.id === tool; });
    var color = (toolDef.colorable && ED.customColor) ? ED.customColor : toolDef.color;
    ED.level.platforms.push({
      x: cell.gx, y: cell.gy,
      w: ED.GRID_SIZE, h: ED.GRID_SIZE,
      color: color, type: tool
    });
  }
  ED._render();
};

ED._resize = function() {
  if (!ED.canvas) return;
  var container = document.getElementById('ed-canvas-container');
  if (!container) return;
  var rect = container.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  ED.canvas.width = rect.width * dpr;
  ED.canvas.height = rect.height * dpr;
  ED.canvas.style.width = rect.width + 'px';
  ED.canvas.style.height = rect.height + 'px';
  ED.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ED._clampCamera();
  ED._render();
};

ED._clampCamera = function() {
  if (!ED.canvas) return;
  var viewW = ED.canvas.clientWidth;
  var viewH = ED.canvas.clientHeight;
  var maxX = Math.max(0, ED.level.width - viewW);
  var maxY = Math.max(0, ED.level.height - viewH);
  ED.camera.x = Math.max(0, Math.min(maxX, ED.camera.x));
  ED.camera.y = Math.max(0, Math.min(maxY, ED.camera.y));
};

// === Rendu ===
ED._render = function() {
  if (!ED.ctx) return;
  var ctx = ED.ctx;
  var viewW = ED.canvas.clientWidth;
  var viewH = ED.canvas.clientHeight;

  // Fond
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(-ED.camera.x, -ED.camera.y);

  // Grille
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (var x = 0; x <= ED.level.width; x += ED.GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, ED.level.height);
    ctx.stroke();
  }
  for (var y = 0; y <= ED.level.height; y += ED.GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(ED.level.width, y + 0.5);
    ctx.stroke();
  }

  // Bordure du monde
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, ED.level.width, ED.level.height);

  // Plateformes : rendu different selon type
  ED.level.platforms.forEach(function(p) {
    ED._drawBlock(ctx, p);
  });

  // Spawn
  if (ED.level.spawn) {
    var s = ED.level.spawn;
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(s.x + ED.GRID_SIZE / 2, s.y + ED.GRID_SIZE / 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('S', s.x + ED.GRID_SIZE / 2, s.y + ED.GRID_SIZE / 2 + 4);
    ctx.textAlign = 'left';
  }

  // Arrivee
  if (ED.level.endZone) {
    var ez = ED.level.endZone;
    ctx.fillStyle = 'rgba(46,204,113,0.4)';
    ctx.fillRect(ez.x, ez.y, ez.w, ez.h);
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    ctx.strokeRect(ez.x, ez.y, ez.w, ez.h);
    ctx.fillStyle = '#27ae60';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('ARRIVEE', ez.x + 4, ez.y + 16);
  }

  // Hover preview
  if (ED.hoverCell && !ED.isPanning) {
    var def = ED.TOOLS.find(function(t) { return t.id === ED.selectedTool; });
    if (def) {
      var previewColor = (def.colorable && ED.customColor) ? ED.customColor : def.color;
      ctx.fillStyle = previewColor + '80';
      ctx.strokeStyle = previewColor;
      ctx.lineWidth = 1;
      ctx.fillRect(ED.hoverCell.gx, ED.hoverCell.gy, ED.GRID_SIZE, ED.GRID_SIZE);
      ctx.strokeRect(ED.hoverCell.gx + 0.5, ED.hoverCell.gy + 0.5, ED.GRID_SIZE - 1, ED.GRID_SIZE - 1);
    }
  }

  ctx.restore();

  // HUD : indication de l'outil + raccourcis
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, viewH - 28, viewW, 28);
  ctx.fillStyle = '#ecf0f1';
  ctx.font = '12px Arial';
  ctx.fillText('Clic = placer  |  Clic-droit + glisser = bouger la vue  |  Echap = quitter', 10, viewH - 10);
};

// === Rendu d'un bloc selon son type (visuel distinctif) ===
ED._drawBlock = function(ctx, p) {
  var t = p.type || 'sol';
  var col = p.color;

  if (t === 'sol') {
    // Sol : rectangle + bande d'herbe plus claire sur le dessus
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = ED._lighten(col, 25);
    ctx.fillRect(p.x, p.y, p.w, 5);
    // Petites touffes d'herbe
    ctx.fillStyle = ED._lighten(col, 40);
    ctx.fillRect(p.x + 4, p.y - 2, 3, 4);
    ctx.fillRect(p.x + p.w / 2 - 1, p.y - 2, 3, 4);
    ctx.fillRect(p.x + p.w - 7, p.y - 2, 3, 4);
  } else if (t === 'mur') {
    // Mur : brique = fond + lignes de mortier
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = ED._darken(col, 30);
    ctx.lineWidth = 1;
    // Ligne horizontale au milieu
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h / 2 + 0.5);
    ctx.lineTo(p.x + p.w, p.y + p.h / 2 + 0.5);
    ctx.stroke();
    // Ligne verticale (decalee entre les deux rangees pour effet briques)
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2 + 0.5, p.y);
    ctx.lineTo(p.x + p.w / 2 + 0.5, p.y + p.h / 2);
    ctx.moveTo(p.x + 0.5, p.y + p.h / 2);
    ctx.lineTo(p.x + 0.5, p.y + p.h);
    ctx.moveTo(p.x + p.w - 0.5, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w - 0.5, p.y + p.h);
    ctx.stroke();
  } else if (t === 'lave') {
    // Lave : rouge/orange avec vaguelettes
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#ffd93d';
    for (var i = 0; i < 3; i++) {
      var wx = p.x + (i * p.w / 3);
      ctx.beginPath();
      ctx.arc(wx + p.w / 6, p.y + 4, 3, 0, Math.PI, true);
      ctx.fill();
    }
  } else if (t === 'eau') {
    // Eau : bleu translucide + reflets
    ctx.fillStyle = col + 'cc';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, 2);
    ctx.fillRect(p.x + 6, p.y + p.h - 8, p.w - 16, 2);
  } else if (t === 'checkpoint') {
    // Checkpoint : petit mat + drapeau jaune
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(p.x + p.w / 2 - 2, p.y + 4, 4, p.h - 8);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2 + 2, p.y + 4);
    ctx.lineTo(p.x + p.w - 4, p.y + 8);
    ctx.lineTo(p.x + p.w / 2 + 2, p.y + 14);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
};

// Utils couleur
ED._lighten = function(hex, pct) {
  var c = ED._hexToRgb(hex);
  return 'rgb(' +
    Math.min(255, c.r + pct * 2) + ',' +
    Math.min(255, c.g + pct * 2) + ',' +
    Math.min(255, c.b + pct * 2) + ')';
};
ED._darken = function(hex, pct) {
  var c = ED._hexToRgb(hex);
  return 'rgb(' +
    Math.max(0, c.r - pct * 2) + ',' +
    Math.max(0, c.g - pct * 2) + ',' +
    Math.max(0, c.b - pct * 2) + ')';
};
ED._hexToRgb = function(hex) {
  hex = (hex || '#000').replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return {
    r: parseInt(hex.substr(0,2), 16) || 0,
    g: parseInt(hex.substr(2,2), 16) || 0,
    b: parseInt(hex.substr(4,2), 16) || 0
  };
};
