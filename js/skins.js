// ============================
// SYSTEME DE SKINS
// ============================
var RARETES = {
  typique:     { nom: 'TYPIQUE',     couleur: '#95a5a6' },
  commun:      { nom: 'COMMUN',      couleur: '#2ecc71' },
  rare:        { nom: 'RARE',        couleur: '#3498db' },
  epic:        { nom: 'EPIC',        couleur: '#9b59b6' },
  legendaire:  { nom: 'LEGENDAIRE',  couleur: '#f39c12' }
};

var SKINS = [
  { id: 'garcon', nom: 'Garcon', fichier: 'skin/gratuit/skin-de-base-garcon.svg', rarete: 'typique' },
  { id: 'fille', nom: 'Fille', fichier: 'skin/gratuit/skin-de-base-fille.svg', rarete: 'typique' }
];

function getSkin() {
  return localStorage.getItem('virus_skin') || 'garcon';
}
function setSkin(skinId) {
  localStorage.setItem('virus_skin', skinId);
  appliquerSkinPartout();
}
function getSkinFichier(skinId) {
  var s = SKINS.find(function(sk) { return sk.id === skinId; });
  return s ? s.fichier : SKINS[0].fichier;
}
function appliquerSkinPartout() {
  var fichier = getSkinFichier(getSkin());
  var joueurImg = document.getElementById('joueur-skin-img');
  if (joueurImg) joueurImg.src = fichier;
  var saImg = document.getElementById('sa-avatar-skin-img');
  if (saImg) saImg.src = fichier;
}
var skinTempSelection = null; // Skin selectionne mais pas encore confirme

function genererSkinSelector(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var currentSkin = getSkin();
  skinTempSelection = currentSkin;
  container.innerHTML = '';
  var ordreRarete = {legendaire:0, epic:1, rare:2, commun:3, typique:4};
  var skinsTries = SKINS.slice().sort(function(a, b) {
    return (ordreRarete[a.rarete] || 4) - (ordreRarete[b.rarete] || 4);
  });
  skinsTries.forEach(function(skin) {
    var div = document.createElement('div');
    div.className = 'skin-option' + (skin.id === currentSkin ? ' skin-selected' : '');
    div.onclick = function() {
      skinTempSelection = skin.id;
      container.querySelectorAll('.skin-option').forEach(function(el) { el.classList.remove('skin-selected'); });
      div.classList.add('skin-selected');
    };
    var rar = RARETES[skin.rarete] || RARETES.typique;
    div.innerHTML = '<img src="' + skin.fichier + '" alt="' + skin.nom + '"><span class="skin-rarete" style="color:' + rar.couleur + '">' + rar.nom + '</span><span class="skin-label">' + skin.nom + '</span>';
    container.appendChild(div);
  });
}

function confirmerSkin() {
  if (skinTempSelection) {
    setSkin(skinTempSelection);
  }
}

// Cabines d'essayage
function ouvrirCabine() {
  document.getElementById('cabine-overlay').classList.add('visible');
  document.getElementById('cabine-popup').classList.add('visible');
  switchCasierTab('skin');
  genererSkinSelector('cabine-skin-selector');
}
function fermerCabine() {
  document.getElementById('cabine-overlay').classList.remove('visible');
  document.getElementById('cabine-popup').classList.remove('visible');
}
function confirmerEtFermerCabine() {
  confirmerSkin();
  fermerCabine();
}

// Onglets du casier
function switchCasierTab(tab) {
  document.querySelectorAll('.casier-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.casier-tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.getElementById('casier-tab-' + tab).classList.add('active');
  document.getElementById('casier-content-' + tab).classList.add('active');
  if (tab === 'musique') genererMusiqueList();
}
