// Systeme de monnaie : Golds
var playerGold = parseInt(localStorage.getItem('virusGold')) || 0;
// Helper : recuperer le nom traduit d'un cosmetique
function getCosmeticNom(item) {
  if (!item) return '';
  if (item.nomKey && typeof t === 'function') {
    var tr = t(item.nomKey);
    if (tr && tr !== item.nomKey) return tr;
  }
  return item.nom || '';
}

function sauvegarderGold() {
  localStorage.setItem('virusGold', playerGold);
  var el = document.getElementById('gold-display');
  if (el) el.textContent = playerGold;
  var bel = document.getElementById('boutique-gold-display');
  if (bel) bel.textContent = playerGold;
  // Sync Firebase
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ gold: playerGold }).catch(function() {});
  }
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
  { id: 'mario', nom: 'Technicien', nomKey: 'skinTechnicien', fichier: 'skin/boutique/Plombier_blanc.svg', prix: 250, rarete: 'rare' },
  { id: 'princessepeach', nom: 'Princesse', nomKey: 'skinPrincesse', fichier: 'skin/boutique/princesse.svg', prix: 100, rarete: 'commun' },
  { id: 'luigi', nom: 'Technicien Vert', nomKey: 'skinTechnicienVert', fichier: 'skin/boutique/Pombier_vert.svg', prix: 100, rarete: 'commun' },
  { id: 'steve', nom: 'Aventurier', nomKey: 'skinAventurier', fichier: 'skin/boutique/Steve.svg', prix: 300, rarete: 'rare' },
  { id: 'alex', nom: 'Exploratrice', nomKey: 'skinExploratrice', fichier: 'skin/boutique/Alex.svg', prix: 100, rarete: 'commun' },
  { id: 'ninjaxx', nom: 'Glace-man', nomKey: 'skinGlaceMan', fichier: 'skin/boutique/Ninjaxx.svg', prix: 150, rarete: 'rare' },
  { id: 'valentina', nom: 'Voleuse', nomKey: 'skinVoleuse', fichier: 'skin/boutique/Valentina.svg', prix: 500, rarete: 'epic' },
  { id: 'galaxy', nom: 'Galaxy', nomKey: 'skinGalaxy', fichier: 'skin/boutique/Galaxy.svg', prix: 1000, rarete: 'legendaire' },
  { id: 'obstinate', nom: 'Obstinate', nomKey: 'skinObstinate', fichier: 'skin/boutique/obstinate.svg', prix: 500, rarete: 'epic' },
  { id: 'fermier', nom: 'Fermier', nomKey: 'skinFermier', fichier: 'skin/boutique/fermier.svg', prix: 50, rarete: 'typique' },
  { id: 'pandareulou', nom: 'Panda Reulou', nomKey: 'skinPandaReulou', fichier: 'skin/boutique/panda-reulou.svg', prix: 1000, rarete: 'legendaire' },
  { id: 'pomni', nom: 'Poufonne', nomKey: 'skinPoufonne', fichier: 'skin/boutique/pomni.svg', prix: 400, rarete: 'epic' },
  { id: 'frilleu', nom: 'Frilleu', nomKey: 'skinFrilleu', fichier: 'skin/boutique/frilleu.svg', prix: 100, rarete: 'commun' },
  { id: 'creeper', nom: 'Explosif Vert', nomKey: 'skinExplosifVert', fichier: 'skin/boutique/creeper.svg', prix: 250, rarete: 'rare' },
  { id: 'chevalier', nom: 'Chevalier', nomKey: 'skinChevalier', fichier: 'skin/boutique/chevalier.svg', prix: 250, rarete: 'rare' },
  { id: 'archer', nom: 'Archere', nomKey: 'skinArchere', fichier: 'skin/boutique/archère.svg', prix: 200, rarete: 'rare' },
  { id: 'ninja', nom: 'Ninja', nomKey: 'skinNinja', fichier: 'skin/boutique/ninja.svg', prix: 200, rarete: 'rare' },
  { id: 'fille_chat', nom: 'Fille-chat', nomKey: 'skinFilleChat', fichier: 'skin/boutique/fille-chat.svg', prix: 350, rarete: 'epic' }
];

function getSkinsAchetes() {
  try { return JSON.parse(localStorage.getItem('virusSkinsAchetes')) || []; }
  catch(e) { return []; }
}
function sauvegarderSkinsAchetes(liste) {
  localStorage.setItem('virusSkinsAchetes', JSON.stringify(liste));
  // Sync Firebase
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ skinsAchetes: liste, skinsCount: liste.length }).catch(function() {});
  }
}

function acheterSkin(skinId) {
  var skinBoutique = SKINS_BOUTIQUE.find(function(s) { return s.id === skinId; });
  if (!skinBoutique) return;
  var achetes = getSkinsAchetes();
  if (achetes.indexOf(skinId) >= 0) return;
  if (playerGold < skinBoutique.prix) return;
  // Verification anti-triche : valider le gold depuis Firebase
  if (!monPlayerId) return;
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var goldFirebase = doc.data().gold || 0;
    if (goldFirebase < skinBoutique.prix) {
      playerGold = goldFirebase;
      sauvegarderGold();
      showNotif('Solde insuffisant.', 'error');
      genererBoutique();
      return;
    }
    playerGold = goldFirebase - skinBoutique.prix;
    sauvegarderGold();
    achetes.push(skinId);
    sauvegarderSkinsAchetes(achetes);
    if (!SKINS.find(function(s) { return s.id === skinId; })) {
      SKINS.push({ id: skinBoutique.id, nom: skinBoutique.nom, fichier: skinBoutique.fichier, rarete: skinBoutique.rarete });
    }
    genererBoutique();
  }).catch(function() {});
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

  var skinsAffichage = SKINS_BOUTIQUE.slice().reverse();
  skinsAffichage.forEach(function(skin) {
    var possede = achetes.indexOf(skin.id) >= 0 || isAdmin();
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
    var skinNomAff = getCosmeticNom(skin);
    carte.innerHTML = '<img class="skin-carte-img" src="' + skin.fichier + '" alt="' + skinNomAff + '">' +
      '<div class="skin-carte-rarete" style="color:' + rar.couleur + '">' + rar.nom + '</div>' +
      '<div class="skin-carte-nom">' + skinNomAff + '</div>' +
      (possede ? '' : '<div class="skin-carte-prix"><span class="prix-icon">&#9733;</span>' + skin.prix + '</div>') +
      btnHtml;
    grille.appendChild(carte);
  });
}

// Debloquer tous les skins et musiques pour les admins (SAUF skins de passe)
function debloquerToutAdmin() {
  if (!isAdmin()) return;
  var passeIds = (typeof SKINS_PASSE !== 'undefined') ? SKINS_PASSE.map(function(s) { return s.id; }) : [];
  SKINS_BOUTIQUE.forEach(function(sb) {
    if (passeIds.indexOf(sb.id) >= 0) return;
    if (!SKINS.find(function(s) { return s.id === sb.id; })) {
      SKINS.push({ id: sb.id, nom: sb.nom, fichier: sb.fichier, rarete: sb.rarete });
    }
  });
  MUSIQUES_BOUTIQUE.forEach(function(mb) {
    if (!MUSIQUES.find(function(m) { return m.id === mb.id; })) {
      MUSIQUES.push({ id: mb.id, nom: mb.nom, artiste: mb.artiste, fichier: mb.fichier, image: mb.image });
    }
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
  debloquerToutAdmin();
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
  if (tab === 'animaux') genererBoutiqueAnimaux();
  if (tab === 'emotes') genererBoutiqueEmotes();
}

// ============================
// BOUTIQUE EMOTES (apercu avec ton skin equipe)
// ============================
function getEmotesAchetes() {
  try { return JSON.parse(localStorage.getItem('virusEmotesAchetes')) || []; }
  catch(e) { return []; }
}
function sauvegarderEmotesAchetes(liste) {
  try { localStorage.setItem('virusEmotesAchetes', JSON.stringify(liste)); } catch(e) {}
  if (typeof db !== 'undefined' && typeof monPlayerId !== 'undefined' && monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ emotesAchetes: liste }).catch(function() {});
  }
}

function acheterEmote(emoteId) {
  if (typeof EMOTES_BOUTIQUE === 'undefined') return;
  var em = EMOTES_BOUTIQUE.find(function(e) { return e.id === emoteId; });
  if (!em) return;
  var achetes = getEmotesAchetes();
  if (achetes.indexOf(emoteId) >= 0) return;
  if (playerGold < em.prix) {
    showNotif(t('passeNotEnoughGold', em.prix), 'warn');
    return;
  }
  if (!monPlayerId) return;
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var goldFB = doc.data().gold || 0;
    if (goldFB < em.prix) {
      playerGold = goldFB;
      sauvegarderGold();
      showNotif(t('passeNotEnoughGold', em.prix), 'warn');
      genererBoutiqueEmotes();
      return;
    }
    playerGold = goldFB - em.prix;
    sauvegarderGold();
    achetes.push(emoteId);
    sauvegarderEmotesAchetes(achetes);
    showNotif(em.nom + ' achete !', 'success');
    genererBoutiqueEmotes();
  }).catch(function() {});
}

function genererBoutiqueEmotes() {
  var grille = document.getElementById('boutique-grille-emotes');
  if (!grille) return;
  if (typeof EMOTES_BOUTIQUE === 'undefined') return;
  grille.innerHTML = '';
  playerGold = parseInt(localStorage.getItem('virusGold')) || 0;
  var skinFichier = (typeof getSkinFichier === 'function' && typeof getSkin === 'function') ? getSkinFichier(getSkin()) : 'skin/gratuit/skin-de-base-garcon.svg';
  var achetes = getEmotesAchetes();

  EMOTES_BOUTIQUE.forEach(function(em) {
    var carte = document.createElement('div');
    carte.className = 'skin-carte emote-carte';
    carte.title = em.nom;
    var rar = (typeof RARETES !== 'undefined' && RARETES[em.rarete]) || (typeof RARETES !== 'undefined' && RARETES.typique) || { nom: '', couleur: '#95a5a6' };
    carte.style.borderColor = rar.couleur;
    var possede = achetes.indexOf(em.id) >= 0;
    var peutAcheter = !possede && playerGold >= em.prix;
    var btnHtml = '';
    if (possede) {
      btnHtml = '<button class="skin-carte-btn possede">POSSEDE</button>';
    } else if (peutAcheter) {
      btnHtml = '<button class="skin-carte-btn acheter" onclick="event.stopPropagation();acheterEmote(\'' + em.id + '\')">ACHETER</button>';
    } else {
      btnHtml = '<button class="skin-carte-btn acheter desactive">ACHETER</button>';
    }
    carte.innerHTML =
      '<div class="emote-preview-zone">' +
        '<div class="emote-preview-bulle">' + em.emoji + '</div>' +
        '<img class="emote-preview-skin" src="' + skinFichier + '" alt="">' +
      '</div>' +
      '<div class="skin-carte-rarete" style="color:' + rar.couleur + '">' + rar.nom + '</div>' +
      '<div class="skin-carte-nom">' + em.nom + '</div>' +
      (possede ? '' : '<div class="skin-carte-prix"><span class="prix-icon">★</span>' + em.prix + '</div>') +
      btnHtml;

    // Clic sur la carte (pas le bouton) : lancer l'anim demo
    carte.onclick = function(e) {
      if (e.target.tagName === 'BUTTON') return;
      var skinImg = carte.querySelector('.emote-preview-skin');
      var bulle = carte.querySelector('.emote-preview-bulle');
      if (!skinImg) return;
      skinImg.classList.remove('emote-squash', 'emote-squashDown', 'emote-wiggle', 'emote-jump', 'emote-tilt', 'emote-stretch');
      void skinImg.offsetWidth;
      skinImg.classList.add('emote-' + em.anim);
      if (bulle) {
        bulle.classList.remove('emote-bulle-active');
        void bulle.offsetWidth;
        bulle.classList.add('emote-bulle-active');
      }
    };
    grille.appendChild(carte);
  });

  // Anim de demo cyclique
  var idx = 0;
  if (genererBoutiqueEmotes._demoTimer) clearInterval(genererBoutiqueEmotes._demoTimer);
  genererBoutiqueEmotes._demoTimer = setInterval(function() {
    var cont = document.getElementById('boutique-content-emotes');
    if (!cont || !cont.classList.contains('active')) {
      clearInterval(genererBoutiqueEmotes._demoTimer);
      return;
    }
    var cartes = grille.querySelectorAll('.emote-carte');
    if (cartes.length === 0) return;
    var carte = cartes[idx % cartes.length];
    if (carte) {
      var skinImg = carte.querySelector('.emote-preview-skin');
      var bulle = carte.querySelector('.emote-preview-bulle');
      var em = EMOTES_BOUTIQUE[idx % EMOTES_BOUTIQUE.length];
      if (skinImg && em) {
        skinImg.classList.remove('emote-squash', 'emote-squashDown', 'emote-wiggle', 'emote-jump', 'emote-tilt', 'emote-stretch');
        void skinImg.offsetWidth;
        skinImg.classList.add('emote-' + em.anim);
        if (bulle) {
          bulle.classList.remove('emote-bulle-active');
          void bulle.offsetWidth;
          bulle.classList.add('emote-bulle-active');
        }
      }
    }
    idx++;
  }, 2200);
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
  // Sync Firebase
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ musiquesAchetees: liste }).catch(function() {});
  }
}

function acheterMusique(musiqueId) {
  var mBoutique = MUSIQUES_BOUTIQUE.find(function(m) { return m.id === musiqueId; });
  if (!mBoutique) return;
  var achetees = getMusiquesAchetees();
  if (achetees.indexOf(musiqueId) >= 0) return;
  if (playerGold < mBoutique.prix) return;
  // Verification anti-triche : valider le gold depuis Firebase
  if (!monPlayerId) return;
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var goldFirebase = doc.data().gold || 0;
    if (goldFirebase < mBoutique.prix) {
      playerGold = goldFirebase;
      sauvegarderGold();
      showNotif('Solde insuffisant.', 'error');
      genererBoutiqueMusique();
      return;
    }
    playerGold = goldFirebase - mBoutique.prix;
    sauvegarderGold();
    achetees.push(musiqueId);
    sauvegarderMusiquesAchetees(achetees);
    if (!MUSIQUES.find(function(m) { return m.id === musiqueId; })) {
      MUSIQUES.push({ id: mBoutique.id, nom: mBoutique.nom, artiste: mBoutique.artiste, fichier: mBoutique.fichier, image: mBoutique.image });
    }
    showNotif(t('notif.musicPurchased', mBoutique.nom), 'success');
    genererBoutiqueMusique();
  }).catch(function() {});
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
    var possede = achetees.indexOf(m.id) >= 0 || isAdmin();
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

    var mNomAff = getCosmeticNom(m);
    var imgHtml = m.image ? '<img class="musique-carte-img" src="' + m.image + '" alt="' + mNomAff + '">' : '';
    carte.innerHTML = imgHtml +
      '<div class="skin-carte-nom">' + mNomAff + '</div>' +
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

// ============================
// BOUTIQUE D'ANIMAUX (PETS)
// ============================
var PETS_BOUTIQUE = [
  { id: 'chien-spatial', nom: 'Chien Spatial', nomKey: 'petChienSpatial', idle: 'pets/chien_de_l\'espsace1.svg', walk1: 'pets/chien_de_l\'espsace2.svg', walk2: 'pets/chien_de_l\'espsace3.svg', prix: 50, rarete: 'typique' },
  { id: 'lapin', nom: 'Lapin', nomKey: 'petLapin', idle: 'pets/Rabbit-a.svg', walk1: 'pets/Rabbit-a.svg', walk2: 'pets/Rabbit-b.svg', prix: 100, rarete: 'commun' },
  { id: 'bubble', nom: 'Bulle', nomKey: 'petBulle', idle: 'pets/buble.svg', walk1: 'pets/buble.svg', walk2: 'pets/buble2.svg', prix: 150, rarete: 'rare' },
  { id: 'dragon-feu', nom: 'Dragon de Feu', nomKey: 'petDragonFeu', idle: 'pets/dragon_de_feu.gif', walk1: 'pets/dragon_de_feu.gif', walk2: 'pets/dragon_de_feu.gif', prix: 150, rarete: 'epic', isGif: true, sizePx: 80 }
];

var petEquipe = localStorage.getItem('virusPet') || '';

function getPetsAchetes() {
  try { return JSON.parse(localStorage.getItem('virusPetsAchetes')) || []; }
  catch(e) { return []; }
}

function sauvegarderPetsAchetes(liste) {
  localStorage.setItem('virusPetsAchetes', JSON.stringify(liste));
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ petsAchetes: liste }).catch(function() {});
  }
}

function getPetEquipe() {
  return localStorage.getItem('virusPet') || '';
}

function setPetEquipe(petId) {
  petEquipe = petId;
  localStorage.setItem('virusPet', petId);
  if (monPlayerId) {
    db.collection('players').doc(monPlayerId).update({ pet: petId }).catch(function() {});
  }
}

function acheterPet(petId) {
  var pet = PETS_BOUTIQUE.find(function(p) { return p.id === petId; });
  if (!pet) return;
  var achetes = getPetsAchetes();
  if (achetes.indexOf(petId) >= 0) return;
  if (playerGold < pet.prix) return;
  if (!monPlayerId) return;
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var goldFirebase = doc.data().gold || 0;
    if (goldFirebase < pet.prix) {
      playerGold = goldFirebase;
      sauvegarderGold();
      showNotif(t('notEnoughGold'), 'error');
      genererBoutiqueAnimaux();
      return;
    }
    playerGold = goldFirebase - pet.prix;
    sauvegarderGold();
    achetes.push(petId);
    sauvegarderPetsAchetes(achetes);
    genererBoutiqueAnimaux();
    showNotif(t('petBought', pet.nom), 'success');
  }).catch(function() {});
}

function equiperPet(petId) {
  setPetEquipe(petId);
  genererBoutiqueAnimaux();
  genererCasierAnimaux();
}

function desequiperPet() {
  setPetEquipe('');
  genererBoutiqueAnimaux();
  genererCasierAnimaux();
}

function genererBoutiqueAnimaux() {
  var grille = document.getElementById('boutique-grille-animaux');
  if (!grille) return;
  grille.innerHTML = '';
  playerGold = parseInt(localStorage.getItem('virusGold')) || 0;
  var achetes = getPetsAchetes();
  var currentPet = getPetEquipe();
  var goldEl = document.getElementById('boutique-gold-display');
  if (goldEl) goldEl.textContent = playerGold;

  if (PETS_BOUTIQUE.length === 0) {
    grille.innerHTML = '<div class="boutique-vide" data-i18n="petsSoon">' + t('petsSoon') + '</div>';
    return;
  }

  PETS_BOUTIQUE.forEach(function(pet) {
    var possede = achetes.indexOf(pet.id) >= 0 || isAdmin();
    var equipe = possede && currentPet === pet.id;
    var peutAcheter = !possede && playerGold >= pet.prix;

    var carte = document.createElement('div');
    carte.className = 'skin-carte';
    var btnHtml = '';
    if (equipe) {
      btnHtml = '<button class="skin-carte-btn equipe" onclick="desequiperPet()">' + t('equipped') + '</button>';
    } else if (possede) {
      btnHtml = '<button class="skin-carte-btn possede" onclick="equiperPet(\'' + pet.id + '\')">' + t('equip') + '</button>';
    } else if (peutAcheter) {
      btnHtml = '<button class="skin-carte-btn acheter" onclick="acheterPet(\'' + pet.id + '\')">' + t('buy') + '</button>';
    } else {
      btnHtml = '<button class="skin-carte-btn acheter desactive">' + t('buy') + '</button>';
    }
    var rar = RARETES[pet.rarete] || RARETES.typique;
    carte.style.borderColor = rar.couleur;
    var petSrc = pet.isGif ? pet.idle : (pet.idle + '?v=' + CURRENT_VERSION);
    var petNomAff = getCosmeticNom(pet);
    carte.innerHTML = '<img class="skin-carte-img" src="' + petSrc + '" alt="' + petNomAff + '" style="image-rendering:pixelated;object-fit:contain;">' +
      '<div class="skin-carte-rarete" style="color:' + rar.couleur + '">' + rar.nom + '</div>' +
      '<div class="skin-carte-nom">' + petNomAff + '</div>' +
      (possede ? '' : '<div class="skin-carte-prix"><span class="prix-icon">&#9733;</span>' + pet.prix + '</div>') +
      btnHtml;
    grille.appendChild(carte);
  });
}

function genererCasierAnimaux() {
  var container = document.getElementById('casier-animaux-selector');
  if (!container) return;
  container.innerHTML = '';
  var achetes = getPetsAchetes();
  var currentPet = getPetEquipe();

  // Option "aucun pet"
  var divNone = document.createElement('div');
  divNone.className = 'skin-option' + (currentPet === '' ? ' skin-selected' : '');
  divNone.onclick = function() {
    desequiperPet();
    container.querySelectorAll('.skin-option').forEach(function(el) { el.classList.remove('skin-selected'); });
    divNone.classList.add('skin-selected');
  };
  divNone.innerHTML = '<div style="height:46px;width:46px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#566573;">&#10005;</div><span class="skin-label">' + t('none') + '</span>';
  container.appendChild(divNone);

  // Pets possedes (boutique + passe reclames)
  var petsDisponibles = PETS_BOUTIQUE.filter(function(p) { return achetes.indexOf(p.id) >= 0 || isAdmin(); });
  if (typeof PETS_PASSE !== 'undefined') {
    PETS_PASSE.forEach(function(pp) {
      if (achetes.indexOf(pp.id) >= 0 && !petsDisponibles.find(function(x) { return x.id === pp.id; })) {
        petsDisponibles.push(pp);
      }
    });
  }
  if (petsDisponibles.length === 0 && !isAdmin()) {
    var vide = document.createElement('div');
    vide.className = 'boutique-vide';
    vide.textContent = t('noPets');
    container.appendChild(vide);
    return;
  }

  petsDisponibles.forEach(function(pet) {
    var div = document.createElement('div');
    div.className = 'skin-option' + (pet.id === currentPet ? ' skin-selected' : '');
    div.onclick = function() {
      equiperPet(pet.id);
      container.querySelectorAll('.skin-option').forEach(function(el) { el.classList.remove('skin-selected'); });
      div.classList.add('skin-selected');
    };
    var rar = RARETES[pet.rarete] || RARETES.typique;
    var petNomCasier = getCosmeticNom(pet);
    div.innerHTML = '<img src="' + pet.idle + '" alt="' + petNomCasier + '"><span class="skin-rarete" style="color:' + rar.couleur + '">' + rar.nom + '</span><span class="skin-label">' + petNomCasier + '</span>';
    container.appendChild(div);
  });
}
