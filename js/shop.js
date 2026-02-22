// Systeme de monnaie : Golds
var playerGold = parseInt(localStorage.getItem('virusGold')) || 0;
function sauvegarderGold() {
  localStorage.setItem('virusGold', playerGold);
  var el = document.getElementById('gold-display');
  if (el) el.textContent = playerGold;
  var bel = document.getElementById('boutique-gold-display');
  if (bel) bel.textContent = playerGold;
}
function gagnerGold(montant) {
  playerGold += montant;
  sauvegarderGold();
}
// Initialiser l'affichage des golds au chargement
sauvegarderGold();

// ============================
// BOUTIQUE DE SKINS
// ============================
var SKINS_BOUTIQUE = [
  { id: 'mario', nom: 'Mario', fichier: 'skin/boutique/Mario.svg', prix: 250, rarete: 'rare' },
  { id: 'princessepeach', nom: 'Princesse Peach', fichier: 'skin/boutique/princesse-peach.svg', prix: 100, rarete: 'commun' },
  { id: 'luigi', nom: 'Luigi', fichier: 'skin/boutique/Luigi.svg', prix: 100, rarete: 'commun' },
  { id: 'steve', nom: 'Steve', fichier: 'skin/boutique/Steve.svg', prix: 300, rarete: 'rare' },
  { id: 'alex', nom: 'Alex', fichier: 'skin/boutique/Alex.svg', prix: 100, rarete: 'commun' },
  { id: 'ninjaxx', nom: 'Ninjaxx', fichier: 'skin/boutique/Ninjaxx.svg', prix: 150, rarete: 'rare' },
  { id: 'valentina', nom: 'Valentina', fichier: 'skin/boutique/Valentina.svg', prix: 500, rarete: 'epic' },
  { id: 'galaxy', nom: 'Galaxy', fichier: 'skin/boutique/Galaxy.svg', prix: 1000, rarete: 'legendaire' },
  { id: 'obstinate', nom: 'Obstinate', fichier: 'skin/boutique/obstinate.svg', prix: 500, rarete: 'epic' },
  { id: 'fermier', nom: 'Fermier', fichier: 'skin/boutique/fermier.svg', prix: 50, rarete: 'typique' },
  { id: 'pandareulou', nom: 'Panda Reulou', fichier: 'skin/boutique/panda-reulou.svg', prix: 1000, rarete: 'legendaire' }
];

function getSkinsAchetes() {
  try { return JSON.parse(localStorage.getItem('virusSkinsAchetes')) || []; }
  catch(e) { return []; }
}
function sauvegarderSkinsAchetes(liste) {
  localStorage.setItem('virusSkinsAchetes', JSON.stringify(liste));
}

function acheterSkin(skinId) {
  var skinBoutique = SKINS_BOUTIQUE.find(function(s) { return s.id === skinId; });
  if (!skinBoutique) return;
  var achetes = getSkinsAchetes();
  if (achetes.indexOf(skinId) >= 0) return;
  if (playerGold < skinBoutique.prix) return;
  playerGold -= skinBoutique.prix;
  sauvegarderGold();
  achetes.push(skinId);
  sauvegarderSkinsAchetes(achetes);
  // Ajouter au tableau SKINS pour pouvoir l'equiper
  if (!SKINS.find(function(s) { return s.id === skinId; })) {
    SKINS.push({ id: skinBoutique.id, nom: skinBoutique.nom, fichier: skinBoutique.fichier, rarete: skinBoutique.rarete });
  }
  genererBoutique();
}

function equiperSkinBoutique(skinId) {
  setSkin(skinId);
  genererBoutique();
}

function genererBoutique() {
  var grille = document.getElementById('boutique-grille');
  if (!grille) return;
  grille.innerHTML = '';
  // Recharger le gold depuis localStorage au cas ou
  playerGold = parseInt(localStorage.getItem('virusGold')) || 0;
  var achetes = getSkinsAchetes();
  var currentSkin = getSkin();
  var goldEl = document.getElementById('boutique-gold-display');
  if (goldEl) goldEl.textContent = playerGold;

  SKINS_BOUTIQUE.forEach(function(skin) {
    var possede = achetes.indexOf(skin.id) >= 0;
    var equipe = possede && currentSkin === skin.id;
    var peutAcheter = !possede && playerGold >= skin.prix;

    var carte = document.createElement('div');
    carte.className = 'skin-carte';
    var btnHtml = '';
    if (equipe) {
      btnHtml = '<button class="skin-carte-btn equipe">EQUIPE</button>';
    } else if (possede) {
      btnHtml = '<button class="skin-carte-btn possede" onclick="equiperSkinBoutique(\'' + skin.id + '\')">EQUIPER</button>';
    } else if (peutAcheter) {
      btnHtml = '<button class="skin-carte-btn acheter" onclick="acheterSkin(\'' + skin.id + '\')">ACHETER</button>';
    } else {
      btnHtml = '<button class="skin-carte-btn acheter desactive">ACHETER</button>';
    }
    var rar = RARETES[skin.rarete] || RARETES.typique;
    carte.style.borderColor = rar.couleur;
    carte.innerHTML = '<img class="skin-carte-img" src="' + skin.fichier + '" alt="' + skin.nom + '">' +
      '<div class="skin-carte-rarete" style="color:' + rar.couleur + '">' + rar.nom + '</div>' +
      '<div class="skin-carte-nom">' + skin.nom + '</div>' +
      (possede ? '' : '<div class="skin-carte-prix"><span class="prix-icon">&#9733;</span>' + skin.prix + '</div>') +
      btnHtml;
    grille.appendChild(carte);
  });
}

// Charger les skins achetes dans SKINS au demarrage
(function() {
  var achetes = getSkinsAchetes();
  SKINS_BOUTIQUE.forEach(function(sb) {
    if (achetes.indexOf(sb.id) >= 0 && !SKINS.find(function(s) { return s.id === sb.id; })) {
      SKINS.push({ id: sb.id, nom: sb.nom, fichier: sb.fichier, rarete: sb.rarete });
    }
  });
})();

// ============================
// ONGLETS BOUTIQUE
// ============================
function switchBoutiqueTab(tab) {
  document.querySelectorAll('.boutique-tab').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.boutique-tab-content').forEach(function(el) { el.classList.remove('active'); });
  document.getElementById('boutique-tab-' + tab).classList.add('active');
  document.getElementById('boutique-content-' + tab).classList.add('active');
  if (tab === 'musique') genererBoutiqueMusique();
}

// ============================
// BOUTIQUE DE MUSIQUES
// ============================
function getMusiquesAchetees() {
  try { return JSON.parse(localStorage.getItem('virusMusiquesAchetees')) || []; }
  catch(e) { return []; }
}
function sauvegarderMusiquesAchetees(liste) {
  localStorage.setItem('virusMusiquesAchetees', JSON.stringify(liste));
}

function acheterMusique(musiqueId) {
  var mBoutique = MUSIQUES_BOUTIQUE.find(function(m) { return m.id === musiqueId; });
  if (!mBoutique) return;
  var achetees = getMusiquesAchetees();
  if (achetees.indexOf(musiqueId) >= 0) return;
  if (playerGold < mBoutique.prix) return;
  playerGold -= mBoutique.prix;
  sauvegarderGold();
  achetees.push(musiqueId);
  sauvegarderMusiquesAchetees(achetees);
  if (!MUSIQUES.find(function(m) { return m.id === musiqueId; })) {
    MUSIQUES.push({ id: mBoutique.id, nom: mBoutique.nom, artiste: mBoutique.artiste, fichier: mBoutique.fichier, image: mBoutique.image });
  }
  showNotif(t('notif.musicPurchased', mBoutique.nom), 'success');
  genererBoutiqueMusique();
}

function equiperMusiqueBoutique(musiqueId) {
  setMusique(musiqueId);
  genererBoutiqueMusique();
}

function genererBoutiqueMusique() {
  var grille = document.getElementById('boutique-grille-musique');
  if (!grille) return;
  grille.innerHTML = '';
  // Recharger le gold depuis localStorage au cas ou
  playerGold = parseInt(localStorage.getItem('virusGold')) || 0;
  var achetees = getMusiquesAchetees();
  var currentMusique = getMusiqueId();
  var goldEl = document.getElementById('boutique-gold-display');
  if (goldEl) goldEl.textContent = playerGold;

  MUSIQUES_BOUTIQUE.forEach(function(m) {
    var possede = achetees.indexOf(m.id) >= 0;
    var equipe = possede && currentMusique === m.id;
    var peutAcheter = !possede && playerGold >= m.prix;

    var carte = document.createElement('div');
    carte.className = 'skin-carte';
    var col = m.couleur || '#566573';
    carte.style.borderColor = col;
    carte.style.background = 'linear-gradient(180deg, rgba(26,26,46,0.9), ' + col + '22)';
    var btnHtml = '';
    if (equipe) {
      btnHtml = '<button class="skin-carte-btn equipe">' + t('equipped') + '</button>';
    } else if (possede) {
      btnHtml = '<button class="skin-carte-btn possede" onclick="equiperMusiqueBoutique(\'' + m.id + '\')">' + t('equip') + '</button>';
    } else if (peutAcheter) {
      btnHtml = '<button class="skin-carte-btn acheter" onclick="acheterMusique(\'' + m.id + '\')">' + t('buy') + '</button>';
    } else {
      btnHtml = '<button class="skin-carte-btn acheter desactive">' + t('buy') + '</button>';
    }

    var imgHtml = m.image ? '<img class="musique-carte-img" src="' + m.image + '" alt="' + m.nom + '">' : '';
    carte.innerHTML = imgHtml +
      '<div class="skin-carte-nom">' + m.nom + '</div>' +
      (possede ? '' : '<div class="skin-carte-prix"><span class="prix-icon">&#9733;</span>' + m.prix + '</div>') +
      btnHtml;
    grille.appendChild(carte);
  });
}

// Charger les musiques achetees dans MUSIQUES au demarrage
(function() {
  var achetees = getMusiquesAchetees();
  MUSIQUES_BOUTIQUE.forEach(function(mb) {
    if (achetees.indexOf(mb.id) >= 0 && !MUSIQUES.find(function(m) { return m.id === mb.id; })) {
      MUSIQUES.push({ id: mb.id, nom: mb.nom, artiste: mb.artiste, fichier: mb.fichier, image: mb.image });
    }
  });
  // Restaurer la musique sauvegardee
  var savedMusique = getMusiqueId();
  if (savedMusique !== 'destroyed') {
    var m = MUSIQUES.find(function(x) { return x.id === savedMusique; });
    if (m) {
      var audio = document.getElementById('musique-menu');
      if (audio) audio.src = m.fichier;
    }
  }
})();
