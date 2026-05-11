// ============================
// MODE CACHE-CACHE
// ============================
// Sous-systeme dedie au mode cache-cache : phases (setup/chasse), zones,
// transformations en prop, timers, conditions de victoire.

// === ETAT GLOBAL ===
var ccPhase = null;          // 'setup' | 'chasse' | 'fin' | null
var ccSetupEndTimestamp = 0; // timestamp ms ou la phase setup se termine
var ccChasseEndTimestamp = 0; // timestamp ms ou la phase chasse se termine
var _ccTimerInterval = null;
var _ccCouinementInterval = null; // Pulse anti-camp toutes les 30s

// Periode du couinement anti-camp (cache-cache)
var CC_COUINEMENT_PERIODE_MS = 30000;

// Zone "salle des chercheurs" (placeholder, a ajuster avec le plan final)
var CC_ZONE_CHERCHEURS = {
  x: 100, y: 100,
  width: 600, height: 400
};

// Duree des phases (placeholders, on tunera plus tard)
var CC_DUREE_SETUP_MS = 30000;   // 30 sec pour se cacher
var CC_DUREE_CHASSE_MS = 300000; // 5 min de chasse

// Liste des props disponibles pour la transformation des caches
// (la table noire n'est PAS dedans : c'est une deco fixe, pas une cible de transformation)
var CC_PROPS = [
  'assets/déco_cache_cache/balle-a.svg',
  'assets/déco_cache_cache/balle-b.svg',
  'assets/déco_cache_cache/boites.svg',
  'assets/déco_cache_cache/boites-b.svg',
  'assets/déco_cache_cache/donut.svg',
  'assets/déco_cache_cache/jouet_canard.svg',
  'assets/déco_cache_cache/ordinateur.svg',
  'assets/déco_cache_cache/pizza.svg',
  'assets/déco_cache_cache/pizza_boite_ferme.svg',
  'assets/déco_cache_cache/plante.svg',
  'assets/déco_cache_cache/plante-b.svg',
  'assets/déco_cache_cache/plante-c.svg',
  'assets/déco_cache_cache/security_chair.svg',
  'assets/déco_cache_cache/Tacos.svg'
];

// === DEFINITION DES PIECES DE LA MAP ===
// Chaque piece est un rectangle de couleur sur la map, peuple aleatoirement
// avec les props specifies. Les coords sont sur la map globale (8000x6000).
var CC_ROOMS = [
  {
    nom: 'Salle des jouets',
    color: '#1e90ff',        // bleu
    x: 1500, y: 1500,
    width: 2200, height: 1600,
    props: [
      { src: 'assets/déco_cache_cache/balle-a.svg', count: 14, sizeMin: 60, sizeMax: 90 },
      { src: 'assets/déco_cache_cache/balle-b.svg', count: 6,  sizeMin: 55, sizeMax: 80 },
      { src: 'assets/déco_cache_cache/jouet_canard.svg', count: 4, sizeMin: 50, sizeMax: 70 },
      { src: 'assets/déco_cache_cache/plante.svg',   count: 5, sizeMin: 60, sizeMax: 90 },
      { src: 'assets/déco_cache_cache/plante-b.svg', count: 4, sizeMin: 60, sizeMax: 90 },
      { src: 'assets/déco_cache_cache/plante-c.svg', count: 3, sizeMin: 60, sizeMax: 90 },
      { src: 'assets/déco_cache_cache/boites.svg',   count: 3, sizeMin: 80, sizeMax: 110 },
      { src: 'assets/déco_cache_cache/boites-b.svg', count: 2, sizeMin: 80, sizeMax: 110 },
      { src: 'assets/déco_cache_cache/ordinateur.svg', count: 1, sizeMin: 110, sizeMax: 130 },
      { src: 'css:table-noire', count: 1, sizeMin: 180, sizeMax: 220 }
    ]
  }
  // Les autres pieces seront ajoutees ici quand l'utilisateur dessinera plus de props
];

// Stockage des elements DOM pour cleanup
var _ccRoomElements = [];

// === DETECTION DU MODE ===
function estModeCacheCache() {
  if (typeof firebaseParties === 'undefined' || !partieActuelleId) return false;
  var p = firebaseParties.find(function(x) { return x._id === partieActuelleId; });
  return p && p.gameMode === 'cachecache';
}

// === DEMARRAGE DU MODE (appele au start de la partie) ===
function initCacheCacheMode(partyData) {
  if (!partyData || partyData.gameMode !== 'cachecache') return;

  // Appliquer le style cache-cache sur le body
  document.body.classList.add('mode-cachecache');

  // Phase initiale depuis Firestore
  ccPhase = partyData.ccPhase || 'setup';
  ccSetupEndTimestamp = partyData.ccSetupEnd || (Date.now() + CC_DUREE_SETUP_MS);

  // Creer les pieces de la map (sols colores + props eparpilles)
  cacheCacheGenererPieces();

  // Creer la zone des chercheurs (visuel)
  cacheCacheCreerZoneChercheurs();

  // Creer le timer affiche
  cacheCacheCreerTimer();

  // Demarrer la boucle de mise a jour
  if (_ccTimerInterval) clearInterval(_ccTimerInterval);
  _ccTimerInterval = setInterval(cacheCacheUpdate, 250);

  // Demarrer le couinement anti-camp pour les caches (toutes les 30s en phase chasse)
  cacheCacheStartCouinement();

  // Telepoter mon perso selon mon role
  cacheCacheRepositionnerJoueur();
}

// === COUINEMENT ANTI-CAMP ===
// Toutes les 30s en phase chasse, le cache emet un son qui revele sa position.
// Empeche les joueurs de simplement "camper" dans un coin sans risque.
function cacheCacheStartCouinement() {
  if (_ccCouinementInterval) clearInterval(_ccCouinementInterval);
  _ccCouinementInterval = setInterval(function() {
    if (typeof monRole === 'undefined') return;
    if (monRole !== 'cache') return;
    if (ccPhase !== 'chasse') return;
    // Verifier que le joueur n'est pas mort
    if (typeof joueursElimines !== 'undefined') {
      var monPseudo = (typeof getPseudo === 'function') ? getPseudo() : '';
      if (monPseudo && joueursElimines.indexOf(monPseudo) >= 0) return;
    }
    if (typeof playSfx === 'function') playSfx('couinement');
  }, CC_COUINEMENT_PERIODE_MS);
}
function cacheCacheStopCouinement() {
  if (_ccCouinementInterval) { clearInterval(_ccCouinementInterval); _ccCouinementInterval = null; }
}

// === FIN DU MODE (cleanup) ===
function quitterCacheCacheMode() {
  document.body.classList.remove('mode-cachecache');
  if (_ccTimerInterval) { clearInterval(_ccTimerInterval); _ccTimerInterval = null; }
  cacheCacheStopCouinement();
  cacheCacheNettoyerPieces();
  var zoneEl = document.getElementById('cc-zone-chercheurs');
  if (zoneEl) zoneEl.remove();
  var timerEl = document.getElementById('cc-timer');
  if (timerEl) timerEl.remove();
  ccPhase = null;
}

// === GENERATION DES PIECES ===
// Pour chaque piece definie dans CC_ROOMS : cree un rectangle colore +
// place aleatoirement les props specifies a l'interieur.
function cacheCacheGenererPieces() {
  cacheCacheNettoyerPieces();
  var mall = document.getElementById('mall-map');
  if (!mall) return;

  CC_ROOMS.forEach(function(room) {
    // Conteneur de la piece (sol colore)
    var sol = document.createElement('div');
    sol.className = 'cc-room';
    sol.dataset.roomNom = room.nom;
    sol.style.cssText = 'position:absolute;left:' + room.x + 'px;top:' + room.y +
      'px;width:' + room.width + 'px;height:' + room.height +
      'px;background:' + room.color + ';z-index:1;';
    mall.appendChild(sol);
    _ccRoomElements.push(sol);

    // Placement des props a l'interieur
    var marge = 30; // px de marge avec les bords
    room.props.forEach(function(propDef) {
      for (var i = 0; i < propDef.count; i++) {
        var taille = propDef.sizeMin + Math.random() * (propDef.sizeMax - propDef.sizeMin);
        var px = marge + Math.random() * (room.width - 2 * marge - taille);
        var py = marge + Math.random() * (room.height - 2 * marge - taille);
        var rotation = Math.floor(Math.random() * 24) - 12; // -12 a +12 deg

        var prop;
        if (propDef.src && propDef.src.indexOf('css:') === 0) {
          // Prop genere en pur CSS (pas de fichier SVG)
          prop = cacheCacheCreerPropCss(propDef.src.replace('css:', ''), taille);
        } else {
          // Prop SVG classique (background-image)
          prop = document.createElement('div');
          prop.style.cssText = 'width:' + taille + 'px;height:' + taille +
            "px;background:url('" + propDef.src + "') center/contain no-repeat;";
        }
        if (!prop) continue;
        prop.classList.add('cc-prop');
        prop.dataset.propSrc = propDef.src;
        prop.style.position = 'absolute';
        prop.style.left = (room.x + px) + 'px';
        prop.style.top = (room.y + py) + 'px';
        prop.style.transform = 'rotate(' + rotation + 'deg)';
        prop.style.zIndex = '3';
        prop.style.pointerEvents = 'none';
        mall.appendChild(prop);
        _ccRoomElements.push(prop);
      }
    });
  });
}

// === PROPS GENERES EN PUR CSS (pas de SVG) ===
// Ces props sont construits avec des div imbriques + styles inline.
function cacheCacheCreerPropCss(type, taille) {
  if (type === 'table-noire') {
    var w = taille;
    var h = taille * 0.65; // proportions table
    var wrap = document.createElement('div');
    wrap.style.cssText = 'width:' + w + 'px;height:' + h + 'px;position:relative;';
    // Pieds avant
    var p1 = document.createElement('div');
    p1.style.cssText = 'position:absolute;left:' + (w * 0.10) + 'px;top:' + (h * 0.55) +
      'px;width:' + (w * 0.07) + 'px;height:' + (h * 0.45) +
      'px;background:#1a1a1a;border:1px solid #000;border-radius:2px;';
    var p2 = document.createElement('div');
    p2.style.cssText = 'position:absolute;left:' + (w * 0.83) + 'px;top:' + (h * 0.55) +
      'px;width:' + (w * 0.07) + 'px;height:' + (h * 0.45) +
      'px;background:#1a1a1a;border:1px solid #000;border-radius:2px;';
    // Pieds arriere (plus petits, decales)
    var p3 = document.createElement('div');
    p3.style.cssText = 'position:absolute;left:' + (w * 0.20) + 'px;top:' + (h * 0.50) +
      'px;width:' + (w * 0.06) + 'px;height:' + (h * 0.42) +
      'px;background:#0a0a0a;border:1px solid #000;border-radius:2px;';
    var p4 = document.createElement('div');
    p4.style.cssText = 'position:absolute;left:' + (w * 0.74) + 'px;top:' + (h * 0.50) +
      'px;width:' + (w * 0.06) + 'px;height:' + (h * 0.42) +
      'px;background:#0a0a0a;border:1px solid #000;border-radius:2px;';
    // Plateau (legere perspective : trapeze via clip-path)
    var plateau = document.createElement('div');
    plateau.style.cssText = 'position:absolute;left:0;top:' + (h * 0.42) + 'px;' +
      'width:' + w + 'px;height:' + (h * 0.18) + 'px;' +
      'background:linear-gradient(180deg,#3a3a3a 0%,#2a2a2a 40%,#1a1a1a 100%);' +
      'border:2px solid #000;clip-path:polygon(6% 0%, 94% 0%, 88% 100%, 12% 100%);' +
      'box-shadow:0 4px 8px rgba(0,0,0,0.6);';
    // Bord avant epais (face visible)
    var bord = document.createElement('div');
    bord.style.cssText = 'position:absolute;left:' + (w * 0.12) + 'px;top:' + (h * 0.55) +
      'px;width:' + (w * 0.76) + 'px;height:' + (h * 0.10) + 'px;' +
      'background:#1a1a1a;border:1.5px solid #000;border-top:none;';
    wrap.appendChild(p1); wrap.appendChild(p2); wrap.appendChild(p3); wrap.appendChild(p4);
    wrap.appendChild(plateau); wrap.appendChild(bord);
    return wrap;
  }
  return null; // type inconnu
}

function cacheCacheNettoyerPieces() {
  _ccRoomElements.forEach(function(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  _ccRoomElements = [];
}

// === ZONE DES CHERCHEURS (visuel) ===
function cacheCacheCreerZoneChercheurs() {
  var mall = document.getElementById('mall-map');
  if (!mall) return;
  var existant = document.getElementById('cc-zone-chercheurs');
  if (existant) existant.remove();
  var div = document.createElement('div');
  div.id = 'cc-zone-chercheurs';
  div.style.cssText = 'position:absolute;left:' + CC_ZONE_CHERCHEURS.x + 'px;top:' +
    CC_ZONE_CHERCHEURS.y + 'px;width:' + CC_ZONE_CHERCHEURS.width + 'px;height:' +
    CC_ZONE_CHERCHEURS.height + 'px;border:4px dashed #f1c40f;border-radius:12px;' +
    'background:rgba(241,196,15,0.05);box-shadow:0 0 30px rgba(241,196,15,0.3);' +
    'z-index:5;pointer-events:none;display:flex;align-items:center;justify-content:center;' +
    'color:#f1c40f;font-family:Arial,sans-serif;font-weight:bold;letter-spacing:2px;font-size:18px;';
  div.textContent = 'ZONE CHERCHEURS';
  mall.appendChild(div);
}

// === TIMER A L'ECRAN ===
function cacheCacheCreerTimer() {
  var existant = document.getElementById('cc-timer');
  if (existant) existant.remove();
  var div = document.createElement('div');
  div.id = 'cc-timer';
  div.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);' +
    'background:rgba(0,0,0,0.85);color:white;padding:8px 16px;border-radius:10px;' +
    'border:2px solid #f1c40f;z-index:600;font-family:Arial,sans-serif;font-weight:bold;' +
    'font-size:16px;letter-spacing:1px;text-shadow:0 1px 3px rgba(0,0,0,0.8);';
  document.body.appendChild(div);
}

function cacheCacheMajTimer() {
  var div = document.getElementById('cc-timer');
  if (!div) return;
  if (ccPhase === 'setup') {
    var reste = Math.max(0, Math.ceil((ccSetupEndTimestamp - Date.now()) / 1000));
    div.textContent = 'PHASE DE CACHETTE : ' + reste + 's';
    div.style.borderColor = '#f1c40f';
    div.style.color = '#f1c40f';
  } else if (ccPhase === 'chasse') {
    var reste2 = Math.max(0, Math.ceil((ccChasseEndTimestamp - Date.now()) / 1000));
    var min = Math.floor(reste2 / 60);
    var sec = reste2 % 60;
    div.textContent = 'CHASSE : ' + min + ':' + (sec < 10 ? '0' : '') + sec;
    div.style.borderColor = '#e74c3c';
    div.style.color = '#e74c3c';
  } else if (ccPhase === 'fin') {
    div.textContent = 'PARTIE TERMINEE';
    div.style.borderColor = '#95a5a6';
    div.style.color = '#95a5a6';
  }
}

// === BOUCLE DE MISE A JOUR ===
function cacheCacheUpdate() {
  if (!estModeCacheCache()) {
    quitterCacheCacheMode();
    return;
  }

  // Lire la phase depuis Firestore (synchronise via firebaseParties)
  var p = firebaseParties.find(function(x) { return x._id === partieActuelleId; });
  if (p) {
    if (p.ccPhase && p.ccPhase !== ccPhase) {
      ccPhase = p.ccPhase;
      // Si on bascule en chasse, retirer la zone visuelle des chercheurs
      if (ccPhase === 'chasse') {
        var zoneEl = document.getElementById('cc-zone-chercheurs');
        if (zoneEl) zoneEl.style.display = 'none';
      }
    }
    if (p.ccSetupEnd) ccSetupEndTimestamp = p.ccSetupEnd;
    if (p.ccChasseEnd) ccChasseEndTimestamp = p.ccChasseEnd;
  }

  cacheCacheMajTimer();

  // Host : detecter la fin du setup et lancer la chasse
  if (estHost && ccPhase === 'setup' && Date.now() >= ccSetupEndTimestamp) {
    cacheCachePasserEnChasse();
  }
}

// === HOST : Passer du setup a la chasse ===
function cacheCachePasserEnChasse() {
  if (!estHost || !partieActuelleId) return;
  ccPhase = 'chasse'; // optimiste local pour eviter un double call
  db.collection('parties').doc(partieActuelleId).update({
    ccPhase: 'chasse',
    ccChasseEnd: Date.now() + CC_DUREE_CHASSE_MS
  }).catch(function() {});
}

// === REPOSITIONNER LE JOUEUR LOCAL SELON SON ROLE ===
function cacheCacheRepositionnerJoueur() {
  if (typeof monRole === 'undefined') return;
  if (monRole === 'chercheur') {
    // Spawn dans la zone chercheurs
    joueurX = CC_ZONE_CHERCHEURS.x + CC_ZONE_CHERCHEURS.width / 2;
    joueurY = CC_ZONE_CHERCHEURS.y + CC_ZONE_CHERCHEURS.height / 2;
  } else if (monRole === 'cache') {
    // Spawn au centre de la map
    joueurX = (typeof MAP_W !== 'undefined' ? MAP_W : 5000) / 2;
    joueurY = (typeof MAP_H !== 'undefined' ? MAP_H : 3500) / 2;
  }
}

// === CONTRAINDRE LES CHERCHEURS A LEUR ZONE PENDANT LE SETUP ===
// Appelee depuis le game loop (game.js) apres le mouvement du joueur.
function cacheCacheClampJoueur() {
  if (!estModeCacheCache()) return;
  if (ccPhase !== 'setup') return;
  if (typeof monRole === 'undefined' || monRole !== 'chercheur') return;
  // Clamper les coords du joueur dans la zone chercheurs
  var z = CC_ZONE_CHERCHEURS;
  if (joueurX < z.x + 20) joueurX = z.x + 20;
  if (joueurX > z.x + z.width - 20) joueurX = z.x + z.width - 20;
  if (joueurY < z.y + 20) joueurY = z.y + 20;
  if (joueurY > z.y + z.height - 20) joueurY = z.y + z.height - 20;
}
