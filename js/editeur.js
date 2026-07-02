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
// Monde : 500 cellules × 50 = 16000 × 1600 px (~25 ecrans de long, 2.5 de haut)
// On garde une limite pour eviter les niveaux de plusieurs Mo qui exploseraient Firestore
ED.WORLD_W   = 500;
ED.WORLD_H   = 50;
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

// === Definition des outils ===
// label = clef i18n (edTool_<id>) resolue au rendu via t()
// colorable = true → le color picker s'applique
ED.TOOLS = [
  { id: 'sol',        color: '#6b8e23', icon: '⬛', colorable: true  },
  { id: 'mur',        color: '#5d4e37', icon: '⬛', colorable: true  },
  { id: 'murp',      color: '#8e7a5f', icon: '⬚', colorable: true  },
  { id: 'lave',       color: '#e74c3c', icon: '🔥', colorable: false },
  { id: 'eau',        color: '#3498db', icon: '💧', colorable: false },
  { id: 'tramp',      color: '#e91e63', icon: '⤴',  colorable: false },
  { id: 'tele',       color: '#9b59b6', icon: '⧖',  colorable: false },
  { id: 'porte',      color: '#a0522d', icon: '🚪', colorable: false },
  { id: 'bouton',     color: '#f1c40f', icon: '⬤',  colorable: false },
  { id: 'checkpoint', color: '#f1c40f', icon: '⚐',  colorable: false },
  { id: 'spawn',      color: '#3498db', icon: '●',  colorable: false },
  { id: 'arrivee',    color: '#27ae60', icon: '⚑',  colorable: false },
  { id: 'eraser',     color: '#e74c3c', icon: '✖',  colorable: false }
];

// Wrapper t() qui tombe sur une valeur par defaut si i18n indispo
ED._t = function(key, defaultVal) {
  if (typeof t === 'function') {
    var val = t(key);
    if (val && val !== key) return val;
  }
  return defaultVal;
};

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
  // Migration : si le niveau a des dimensions plus petites que le monde actuel, on l'agrandit
  // (les blocs restent en place, on donne juste plus de terrain pour construire)
  var curW = ED.WORLD_W * ED.GRID_SIZE;
  var curH = ED.WORLD_H * ED.GRID_SIZE;
  if (!ED.level.width || ED.level.width < curW) ED.level.width = curW;
  if (!ED.level.height || ED.level.height < curH) ED.level.height = curH;
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
    if (!silencieux && typeof showNotif === 'function') showNotif(ED._t('edNotifSaved', 'Niveau sauvegarde'), 'success');
  } catch (e) {
    if (typeof showNotif === 'function') showNotif(ED._t('edNotifSaveErr', 'Erreur sauvegarde'), 'error');
  }
};

ED.clearAll = function() {
  if (!confirm(ED._t('edConfirmClear', 'Effacer tout le niveau ?'))) return;
  ED.level = ED.creerNiveauVide();
  ED.save(true);
  ED._render();
};

ED.test = function() {
  if (!ED.level.spawn) {
    if (typeof showNotif === 'function') showNotif(ED._t('edNeedSpawn', 'Place un DEPART avant de tester'), 'warn');
    return;
  }
  if (!ED.level.endZone) {
    if (typeof showNotif === 'function') showNotif(ED._t('edNeedEnd', 'Place une ARRIVEE avant de tester'), 'warn');
    return;
  }
  ED.save(true);
  if (typeof SE === 'undefined') {
    if (typeof showNotif === 'function') showNotif(ED._t('edNoEngine', 'Moteur indisponible'), 'error');
    return;
  }
  ED._cleanup();
  // Configurer SE pour revenir a l'editeur apres QUITTER
  SE.returnScreen = 'editeur-niveau';
  SE.returnCallback = function() {
    // Re-init l'editeur (le canvas est encore la dans le DOM mais nos events ont ete cleanup)
    ED.canvas = document.getElementById('ed-canvas');
    if (!ED.canvas) return;
    ED.ctx = ED.canvas.getContext('2d');
    ED._resize();
    ED._setupEvents();
    ED._render();
  };
  if (typeof showScreen === 'function') showScreen('se-test');
  setTimeout(function() {
    SE.init('se-canvas', ED.level);
    SE.start();
  }, 50);
};

// === PUBLIER LE NIVEAU (Phase 3) ===
ED.publier = function() {
  if (!ED.level.spawn) { showNotif(ED._t('edNeedSpawn', 'Place un DEPART avant de publier'), 'warn'); return; }
  if (!ED.level.endZone) { showNotif(ED._t('edNeedEnd', 'Place une ARRIVEE avant de publier'), 'warn'); return; }
  if (!ED.level.platforms || ED.level.platforms.length < 3) {
    showNotif(ED._t('edNeedMore', 'Ajoute plus de blocs (min 3)'), 'warn'); return;
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
  if (titre.length < 3) { showNotif(ED._t('edTitleShort', 'Titre trop court (3 min)'), 'warn'); return; }
  if (titre.length > 40) { showNotif(ED._t('edTitleLong', 'Titre trop long (40 max)'), 'warn'); return; }
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
        var msg = ED._t('edRateLimit', 'Prochaine publication dans {0} jours');
        showNotif(msg.replace('{0}', remaining), 'warn');
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
    status: 'pending',   // Moderation : nouveau niveau en attente de validation dev
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  showNotif(ED._t('edPublishing', 'Publication...'), 'info');
  db.collection('customLevels').add(data).then(function() {
    showNotif(ED._t('edPublishedPending', 'Envoye en verification. Visible apres validation par un dev.'), 'success');
    ED.fermerPublier();
    ED.close();
  }).catch(function(err) {
    console.error('Publish error', err);
    showNotif(ED._t('edPublishErr', 'Erreur publication'), 'error');
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

// === Labels par defaut (fallback si i18n indispo) ===
ED._DEFAULT_LABELS = {
  sol: 'SOL', mur: 'MUR PLEIN', 'murp': 'MUR TRAV.', lave: 'LAVE', eau: 'EAU',
  tramp: 'RESSORT', tele: 'PORTAIL', porte: 'PORTE', bouton: 'BOUTON',
  checkpoint: 'CHECKPT.', spawn: 'DEPART', arrivee: 'ARRIVEE', eraser: 'EFFACER'
};

// === Palette UI ===
ED._renderPalette = function() {
  var pal = document.getElementById('ed-palette');
  if (!pal) return;
  pal.innerHTML = '';
  ED.TOOLS.forEach(function(tool) {
    var btn = document.createElement('button');
    btn.className = 'ed-tool-btn' + (tool.id === ED.selectedTool ? ' ed-tool-active' : '');
    var label = ED._t('edTool_' + tool.id, ED._DEFAULT_LABELS[tool.id] || tool.id.toUpperCase());
    btn.innerHTML =
      '<span class="ed-tool-icon" style="background:' + tool.color + ';">' + tool.icon + '</span>' +
      '<span class="ed-tool-label">' + label + '</span>';
    btn.onclick = function() { ED.selectTool(tool.id); };
    pal.appendChild(btn);
  });

  // Color picker sous les outils (uniquement pour outils colorables)
  var def = ED.TOOLS.find(function(t) { return t.id === ED.selectedTool; });
  var colorable = def && def.colorable;
  var wrap = document.createElement('div');
  wrap.className = 'ed-color-wrap' + (colorable ? '' : ' ed-color-wrap-disabled');
  wrap.innerHTML =
    '<div class="ed-color-label">' + ED._t('edColor', 'COULEUR') + '</div>' +
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
  // Molette : scroll vertical par defaut, horizontal avec Shift
  c.addEventListener('wheel', ED._onWheel, { passive: false });
  // Fleches du clavier : navigation dans le monde
  document.addEventListener('keydown', ED._onKeyDown);
  window.addEventListener('resize', ED._resize);
};

ED._onWheel = function(e) {
  e.preventDefault();
  var step = 40;
  // Shift → scroll horizontal ; sans Shift → si deltaY existe, on scroll aussi horizontalement
  // (le monde est plus large que haut, donc horizontal par defaut est plus utile)
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    ED.camera.x += (e.deltaX || e.deltaY) > 0 ? step : -step;
  } else {
    // Molette normale : horizontal (car parcours long > haut)
    ED.camera.x += e.deltaY > 0 ? step : -step;
  }
  ED._clampCamera();
  ED._render();
};

ED._onKeyDown = function(e) {
  // On ne bouge la camera QUE si le screen editeur est actif (evite d'intercepter dans un input)
  var screen = document.getElementById('editeur-niveau');
  if (!screen || !screen.classList.contains('active')) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  var step = e.shiftKey ? 160 : 60;
  var handled = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyQ')  ED.camera.x -= step;
  else if (e.code === 'ArrowRight' || e.code === 'KeyD')                 ED.camera.x += step;
  else if (e.code === 'ArrowUp'    || e.code === 'KeyW' || e.code === 'KeyZ') ED.camera.y -= step;
  else if (e.code === 'ArrowDown'  || e.code === 'KeyS')                 ED.camera.y += step;
  else if (e.code === 'Escape')                                          ED.close();
  else handled = false;
  if (handled) {
    e.preventDefault();
    ED._clampCamera();
    ED._render();
  }
};

ED._cleanup = function() {
  window.removeEventListener('resize', ED._resize);
  document.removeEventListener('keydown', ED._onKeyDown);
  if (ED.canvas) ED.canvas.removeEventListener('wheel', ED._onWheel);
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
    // Blocs : eviter doublon sur meme cellule
    var existe = ED.level.platforms.some(function(p) {
      return p.x === cell.gx && p.y === cell.gy && p.w === ED.GRID_SIZE && p.h === ED.GRID_SIZE;
    });
    if (existe) return;
    var toolDef = ED.TOOLS.find(function(t) { return t.id === tool; });
    var color = (toolDef.colorable && ED.customColor) ? ED.customColor : toolDef.color;
    var block = {
      x: cell.gx, y: cell.gy,
      w: ED.GRID_SIZE, h: ED.GRID_SIZE,
      color: color, type: tool
    };
    // Auto-paire les portails (tele) : linkId croissant, 2 tele par pair
    if (tool === 'tele') {
      block.linkId = ED._nextTeleLinkId();
    }
    ED.level.platforms.push(block);
  }
  ED._render();
};

// Alloue le prochain linkId pour un portail : (nb_tele / 2) + 1, deux teles par groupe
ED._nextTeleLinkId = function() {
  var teles = ED.level.platforms.filter(function(p) { return p.type === 'tele'; });
  return Math.floor(teles.length / 2) + 1;
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
  ctx.fillText(ED._t('edHelp', 'Clic = placer | Clic-droit ou fleches = bouger | Molette = scroll | Echap = quitter'), 10, viewH - 10);
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
  } else if (t === 'mur' || t === 'murp' || t === 'mur-p') {
    // Mur classique = briques opaques avec lignes de mortier pleines
    // Mur traversable (murp) = MEMES briques mais toutes les lignes en pointille
    var passable = (t === 'murp' || t === 'mur-p');
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = ED._darken(col, 40);
    ctx.lineWidth = 1;
    if (passable) ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h / 2 + 0.5);
    ctx.lineTo(p.x + p.w, p.y + p.h / 2 + 0.5);
    ctx.moveTo(p.x + p.w / 2 + 0.5, p.y);
    ctx.lineTo(p.x + p.w / 2 + 0.5, p.y + p.h / 2);
    ctx.moveTo(p.x + 0.5, p.y + p.h / 2);
    ctx.lineTo(p.x + 0.5, p.y + p.h);
    ctx.moveTo(p.x + p.w - 0.5, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w - 0.5, p.y + p.h);
    ctx.stroke();
    // Contour pointille pour le mur traversable (encadre la brique)
    if (passable) {
      ctx.strokeStyle = ED._lighten(col, 25);
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
      ctx.setLineDash([]);
    }
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
  } else if (t === 'tramp') {
    // Trampoline : plaque rouge + 3 ressorts noirs
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y + p.h / 2, p.w, p.h / 2);
    ctx.fillStyle = ED._lighten(col, 30);
    ctx.fillRect(p.x, p.y + p.h / 2, p.w, 3);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    var cx = p.x + p.w / 2;
    for (var s = 0; s < 3; s++) {
      var sx = p.x + 6 + s * (p.w - 12) / 2;
      ctx.beginPath();
      for (var i = 0; i < 4; i++) {
        var yy = p.y + p.h / 2 - 2 - i * 3;
        ctx.moveTo(sx - 2, yy); ctx.lineTo(sx + 2, yy);
      }
      ctx.stroke();
    }
  } else if (t === 'tele') {
    // Portail : anneau violet + centre plus clair (portail interdimensionnel)
    var rx = p.x + p.w / 2, ry = p.y + p.h / 2;
    ctx.fillStyle = col + '30';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    var grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, p.w / 2);
    grad.addColorStop(0, '#ecf0f1');
    grad.addColorStop(0.4, col);
    grad.addColorStop(1, col + '20');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, p.w / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    // ID du link visible
    if (p.linkId) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(String(p.linkId), rx, ry + 3);
      ctx.textAlign = 'left';
    }
  } else if (t === 'porte') {
    // Porte : rectangle bois avec panneaux + poignee
    ctx.fillStyle = col;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = ED._darken(col, 30);
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, (p.h - 12) / 2);
    ctx.strokeRect(p.x + 4, p.y + 4 + (p.h - 12) / 2 + 4, p.w - 8, (p.h - 12) / 2);
    // Poignee
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(p.x + p.w - 6, p.y + p.h / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (t === 'bouton') {
    // Bouton : disque jaune sur socle
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(p.x + 4, p.y + p.h - 8, p.w - 8, 8);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h - 12, (p.w - 12) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ED._darken(col, 30);
    ctx.lineWidth = 1;
    ctx.stroke();
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
