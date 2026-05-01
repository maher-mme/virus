// ============================
// DECORATIONS DE MAP (par saison)
// ============================
// Emojis/icones places aleatoirement sur la map, theme selon la saison active
var DECORATIONS_SAISONS = {
  1: {
    nom: 'Les 6 Roles',
    elements: [
      { icone: '\uD83E\uDDA0', role: 'virus' },       // microbe
      { icone: '\uD83D\uDCF0', role: 'journaliste' }, // journal
      { icone: '\uD83D\uDD6F\uFE0F', role: 'fanatique' }, // bougie
      { icone: '\uD83D\uDD76\uFE0F', role: 'espion' }, // lunettes
      { icone: '\uD83C\uDF37', role: 'innocent' },    // fleur
      { icone: '\u2B50', role: 'cherif' }             // etoile
    ]
  }
};

var DECO_NB_MIN = 120;
var DECO_NB_MAX = 180;
var DECO_MARGIN = 100; // px de marge par rapport aux bords

// Props de mall (peu importe la saison) : objets plus gros, ambiance centre commercial
var DECORATIONS_PROPS = [
  { icone: '🪑' },  // chaise (banc)
  { icone: '🪴' },  // plante en pot
  { icone: '🌱' },  // pousse / herbe
  { icone: '🛒' },  // chariot
  { icone: '🛑' },  // panneau stop
  { icone: '🎉' },  // confettis
  { icone: '💼' },  // mallette
  { icone: '🛗' },  // panneau interdit
  { icone: '🗑' },  // poubelle
  { icone: '🛖' },  // bouton lumiere
  { icone: '📱' },  // telephone
  { icone: '🔋' },  // batterie
  { icone: '🎰' },  // machine a sous (arcade)
  { icone: '🎮' },  // manette (arcade)
  { icone: '☕' },        // cafe
  { icone: '🍔' },  // hamburger (food court)
  { icone: '🍕' },  // pizza
  { icone: '🍦' },  // glace
  { icone: '💻' },  // ordi (boutique tech)
  { icone: '📚' },  // livres
  { icone: '👔' },  // chemise (boutique vetement)
  { icone: '👠' },  // talon (boutique mode)
  { icone: '💍' },  // bague (bijouterie)
  { icone: '🎨' },  // peinture
  { icone: '🎸' },  // guitare
  { icone: '🧸' },  // peluche
  { icone: '🧺' },  // panier
  { icone: '🚪' }   // porte
];

var PROPS_NB_MIN = 35;
var PROPS_NB_MAX = 50;

function getSaisonActiveDeco() {
  if (typeof getSaisonActive === 'function') {
    var s = getSaisonActive();
    if (s && DECORATIONS_SAISONS[s.id]) return s.id;
  }
  // Fallback : saison 1
  return 1;
}

function genererDecorations() {
  nettoyerDecorations();
  var mallMap = document.getElementById('mall-map');
  if (!mallMap) return;
  var saisonId = getSaisonActiveDeco();
  var data = DECORATIONS_SAISONS[saisonId];
  if (!data || !data.elements.length) return;

  var mapW = 8000;
  var mapH = 6000;
  var nb = DECO_NB_MIN + Math.floor(Math.random() * (DECO_NB_MAX - DECO_NB_MIN + 1));
  var container = document.createElement('div');
  container.id = 'decorations-layer';
  container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';

  for (var i = 0; i < nb; i++) {
    var elem = data.elements[Math.floor(Math.random() * data.elements.length)];
    var x = DECO_MARGIN + Math.floor(Math.random() * (mapW - 2 * DECO_MARGIN));
    var y = DECO_MARGIN + Math.floor(Math.random() * (mapH - 2 * DECO_MARGIN));
    var rotation = Math.floor(Math.random() * 60) - 30; // -30deg a +30deg
    var taille = 28 + Math.floor(Math.random() * 20); // 28 a 48 px (plus gros)
    var opacity = 0.75 + Math.random() * 0.2; // 0.75 a 0.95 (presque opaque)

    var deco = document.createElement('div');
    deco.className = 'decoration';
    deco.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;font-size:' + taille + 'px;transform:rotate(' + rotation + 'deg);opacity:' + opacity + ';pointer-events:none;user-select:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));';
    deco.textContent = elem.icone;
    container.appendChild(deco);
  }

  // Couche props : objets de centre commercial plus gros pour donner de la vie
  var nbProps = PROPS_NB_MIN + Math.floor(Math.random() * (PROPS_NB_MAX - PROPS_NB_MIN + 1));
  for (var p = 0; p < nbProps; p++) {
    var prop = DECORATIONS_PROPS[Math.floor(Math.random() * DECORATIONS_PROPS.length)];
    var px = DECO_MARGIN + Math.floor(Math.random() * (mapW - 2 * DECO_MARGIN));
    var py = DECO_MARGIN + Math.floor(Math.random() * (mapH - 2 * DECO_MARGIN));
    var pTaille = 55 + Math.floor(Math.random() * 30); // 55 a 85 px (gros)
    var pRot = Math.floor(Math.random() * 20) - 10;    // legere rotation
    var pOpacity = 0.85 + Math.random() * 0.1;

    var propEl = document.createElement('div');
    propEl.className = 'decoration-prop';
    propEl.style.cssText = 'position:absolute;left:' + px + 'px;top:' + py + 'px;font-size:' + pTaille + 'px;transform:rotate(' + pRot + 'deg);opacity:' + pOpacity + ';pointer-events:none;user-select:none;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.4));';
    propEl.textContent = prop.icone;
    container.appendChild(propEl);
  }

  mallMap.appendChild(container);
}

function nettoyerDecorations() {
  var layer = document.getElementById('decorations-layer');
  if (layer) layer.remove();
}
