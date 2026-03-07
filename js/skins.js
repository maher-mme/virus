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
  // Synchroniser le skin sur Firebase (pour les autres joueurs)
  if (typeof db !== 'undefined' && typeof monPlayerId !== 'undefined' && monPlayerId) {
    var fichier = getSkinFichier(skinId);
    db.collection('players').doc(monPlayerId).update({ skin: fichier }).catch(function() {});
    // Mettre a jour aussi dans partyPlayers si en partie
    if (typeof myPartyPlayerDocId !== 'undefined' && myPartyPlayerDocId) {
      db.collection('partyPlayers').doc(myPartyPlayerDocId).update({ skin: fichier }).catch(function() {});
    }
  }
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
  if (tab === 'pfp') chargerPfpDansCasier();
}

// ============================
// SYSTEME DE PHOTO DE PROFIL (PFP)
// ============================
var PFP_MAX_SIZE = 512;
var PFP_FORMAT = 'image/png';
var PFP_DE_BASE = 'assets/pfp_de_base.png';

function getPfp() {
  return localStorage.getItem('virusPfp') || PFP_DE_BASE;
}

function setPfp(base64) {
  localStorage.setItem('virusPfp', base64);
  afficherPfpPartout();
  if (typeof db !== 'undefined' && typeof monPlayerId !== 'undefined' && monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ pfp: base64 }).catch(function() {});
  }
}

function supprimerPfp() {
  localStorage.removeItem('virusPfp');
  afficherPfpPartout();
  if (typeof db !== 'undefined' && typeof monPlayerId !== 'undefined' && monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ pfp: '' }).catch(function() {});
  }
  var previewImg = document.getElementById('pfp-preview-img');
  var btnSupprimer = document.getElementById('pfp-supprimer-btn');
  var placeholder = document.getElementById('pfp-preview-placeholder');
  if (previewImg) {
    previewImg.src = PFP_DE_BASE;
    previewImg.style.display = 'block';
  }
  if (placeholder) placeholder.style.display = 'none';
  if (btnSupprimer) btnSupprimer.style.display = 'none';
  showNotif(t('pfpRemoved'), 'info');
}

function handlePfpFileSelect(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showNotif(t('pfpInvalidFile'), 'warn');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showNotif(t('pfpFileTooLarge'), 'warn');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    redimensionnerImage(e.target.result, PFP_MAX_SIZE, function(base64Resized) {
      setPfp(base64Resized);
      var previewImg = document.getElementById('pfp-preview-img');
      var placeholder = document.getElementById('pfp-preview-placeholder');
      var btnSupprimer = document.getElementById('pfp-supprimer-btn');
      if (previewImg) {
        previewImg.src = base64Resized;
        previewImg.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
      if (btnSupprimer) btnSupprimer.style.display = 'inline-block';
      showNotif(t('pfpSaved'), 'success');
    });
  };
  reader.readAsDataURL(file);
  // Reset input pour permettre de re-selectionner le meme fichier
  event.target.value = '';
}

function redimensionnerImage(dataUrl, maxSize, callback) {
  var img = new Image();
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var srcSize = Math.min(img.width, img.height);
    var srcX = (img.width - srcSize) / 2;
    var srcY = (img.height - srcSize) / 2;
    // Si l'image est plus petite que maxSize, garder sa taille originale
    var taille = Math.min(srcSize, maxSize);
    canvas.width = taille;
    canvas.height = taille;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, taille, taille);
    var result = canvas.toDataURL(PFP_FORMAT);
    callback(result);
  };
  img.src = dataUrl;
}

function afficherPfpPartout() {
  var pfp = getPfp();
  var compteImg = document.getElementById('compte-avatar-pfp');
  var compteEmoji = document.getElementById('compte-avatar-emoji');
  if (compteImg && compteEmoji) {
    if (pfp) {
      compteImg.src = pfp;
      compteImg.style.display = 'block';
      compteEmoji.style.display = 'none';
    } else {
      compteImg.style.display = 'none';
      compteEmoji.style.display = '';
    }
  }
}

function chargerPfpDansCasier() {
  var pfpPerso = localStorage.getItem('virusPfp');
  var pfp = pfpPerso || PFP_DE_BASE;
  var previewImg = document.getElementById('pfp-preview-img');
  var placeholder = document.getElementById('pfp-preview-placeholder');
  var btnSupprimer = document.getElementById('pfp-supprimer-btn');
  if (previewImg) {
    previewImg.src = pfp;
    previewImg.style.display = 'block';
  }
  if (placeholder) placeholder.style.display = 'none';
  // Montrer le bouton supprimer seulement si une PFP perso est definie
  if (btnSupprimer) btnSupprimer.style.display = pfpPerso ? 'inline-block' : 'none';
}
