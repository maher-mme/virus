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
  mallMap.appendChild(container);
}

function nettoyerDecorations() {
  var layer = document.getElementById('decorations-layer');
  if (layer) layer.remove();
}
