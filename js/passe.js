// ============================
// SYSTEME DE PASSE DE COMBAT (SAISON)
// ============================

// Skins exclusifs au passe (saison 1 = theme "Les 6 Roles")
var SKINS_PASSE = [
  // VIRUS
  { id: 'infecter',       nom: 'Infecter',          fichier: 'skin/Passe/Saison 1/infecter.svg',         rarete: 'commun',      saison: 1, role: 'virus' },
  { id: 'docteur',        nom: 'Docteur',           fichier: 'skin/Passe/Saison 1/Docteur.svg',          rarete: 'epic',        saison: 1, role: 'virus' },
  // JOURNALISTE
  { id: 'detective',      nom: 'Detective',         fichier: 'skin/Passe/Saison 1/detective.svg',        rarete: 'rare',        saison: 1, role: 'journaliste' },
  // FANATIQUE
  { id: 'le_fanatique',   nom: 'Le Fanatique',      fichier: 'skin/Passe/Saison 1/Le_fanatique.svg',     rarete: 'rare',        saison: 1, role: 'fanatique' },
  // INNOCENT
  { id: 'enfant',         nom: 'Enfant',            fichier: 'skin/Passe/Saison 1/enfant.svg',           rarete: 'commun',      saison: 1, role: 'innocent' },
  // ESPION
  { id: 'agent_secret',   nom: 'Agent Secret',      fichier: 'skin/Passe/Saison 1/agent_secret.svg',     rarete: 'rare',        saison: 1, role: 'espion' },
  { id: 'espionne',       nom: 'Espionne',          fichier: 'skin/Passe/Saison 1/espionne.svg',         rarete: 'epic',        saison: 1, role: 'espion' },
  // NOTE: espionne.svg est actuellement dans pets/ — a deplacer dans skin/Passe/Saison 1/
  // CHERIF
  { id: 'cowboy',         nom: 'Cowboy',            fichier: 'skin/Passe/Saison 1/cowboy.svg',           rarete: 'rare',        saison: 1, role: 'cherif' },
  { id: 'cherif',         nom: 'Cherif',            fichier: 'skin/Passe/Saison 1/cherif.svg',           rarete: 'legendaire',  saison: 1, role: 'cherif' }
];

// Pets exclusifs au passe (1 par role)
var PETS_PASSE = [
  { id: 'virus_pet',       nom: 'Virus',              idle: 'pets/Passe/Saison 1/virus.svg',           saison: 1, role: 'virus' },
  { id: 'voiture_jouet',   nom: 'Voiture Jouet',      idle: 'pets/Passe/Saison 1/jouet_voiture-immobile.svg', walk1: 'pets/Passe/Saison 1/jouet_voiture-immobile.svg', walk2: 'pets/Passe/Saison 1/jouet_voiture-en-d\u00e9placement.svg', saison: 1, role: 'innocent' },
  { id: 'pigeon_detective', nom: 'Pigeon Detective', idle: 'pets/Passe/Saison 1/pigeon_detective1.svg', walk1: 'pets/Passe/Saison 1/pigeon_detective1.svg', walk2: 'pets/Passe/Saison 1/pigeon_detective2.svg', saison: 1, role: 'journaliste' },
  { id: 'petit_robot',     nom: 'Petit Robot',        idle: 'pets/Passe/Saison 1/robot-immobile.svg',  walk1: 'pets/Passe/Saison 1/robot-immobile.svg', walk2: 'pets/Passe/Saison 1/robot-en-mouvement.svg', saison: 1, role: 'espion' },
  { id: 'cheval',          nom: 'Cheval',             idle: 'pets/Passe/Saison 1/cheval1.svg',         walk1: 'pets/Passe/Saison 1/cheval1.svg', walk2: 'pets/Passe/Saison 1/cheval2.svg', saison: 1, role: 'cherif' }
];

// Emotes exclusifs au passe (1 par role)
var EMOTES_PASSE = [
  { id: 'tousser',      emoji: '\uD83D\uDE37', nom: 'Tousser',    anim: 'squashDown', saison: 1, role: 'virus' },
  { id: 'peur',         emoji: '\uD83D\uDE28', nom: 'Peur',       anim: 'wiggle',     saison: 1, role: 'innocent' },
  { id: 'enquete',      emoji: '\uD83D\uDD0E', nom: 'Enquete',    anim: 'stretch',    saison: 1, role: 'journaliste' },
  { id: 'rire_demon',   emoji: '\uD83D\uDE08', nom: 'Rire Demon', anim: 'jump',       saison: 1, role: 'fanatique' },
  { id: 'clin_oeil',    emoji: '\uD83D\uDE09', nom: 'Clin d\'oeil', anim: 'tilt',     saison: 1, role: 'espion' },
  { id: 'degaine',      emoji: '\uD83D\uDD2B', nom: 'Degaine',    anim: 'squash',     saison: 1, role: 'cherif' }
];

// ============================
// SAISONS — 30 paliers, 100 XP chacun (niveaux season 1 -> 30)
// Palier 1 = level 1 atteint, palier 30 = level 30
// Chaque palier : { palier, free: reward|null, premium: reward|null }
// Reward: { type: 'gold'|'skin'|'pet'|'emote', id?, montant? }
// ============================
var SAISONS = [
  {
    id: 1,
    nom: 'Les 6 Roles',
    theme: 'roles',
    couleurTheme: '#f39c12',
    dateDebut: '2026-04-19',
    dateFin: '2026-07-19',
    xpParPalier: 100,
    // Sections de 3 paliers chacune, une par role
    sections: [
      { debut: 1,  fin: 3,  role: 'virus',       nom: 'VIRUS',       couleur: '#e74c3c' },
      { debut: 4,  fin: 6,  role: 'innocent',    nom: 'INNOCENT',    couleur: '#2ecc71' },
      { debut: 7,  fin: 9,  role: 'journaliste', nom: 'JOURNALISTE', couleur: '#3498db' },
      { debut: 10, fin: 12, role: 'fanatique',   nom: 'FANATIQUE',   couleur: '#8e44ad' },
      { debut: 13, fin: 15, role: 'espion',      nom: 'ESPION',      couleur: '#9b59b6' },
      { debut: 16, fin: 18, role: 'cherif',      nom: 'CHERIF',      couleur: '#f39c12' }
    ],
    paliers: [
      // VIRUS (1-3)
      { palier: 1,  free: { type: 'skin', id: 'infecter' },       premium: { type: 'pet', id: 'virus_pet' } },
      { palier: 2,  free: { type: 'gold', montant: 20 },          premium: { type: 'emote', id: 'tousser' } },
      { palier: 3,  free: { type: 'gold', montant: 30 },          premium: { type: 'skin', id: 'docteur' } },
      // INNOCENT (4-6)
      { palier: 4,  free: { type: 'gold', montant: 25 },          premium: { type: 'skin', id: 'enfant' } },
      { palier: 5,  free: { type: 'gold', montant: 30 },          premium: { type: 'emote', id: 'peur' } },
      { palier: 6,  free: { type: 'gold', montant: 40 },          premium: { type: 'pet', id: 'voiture_jouet' } },
      // JOURNALISTE (7-9)
      { palier: 7,  free: { type: 'gold', montant: 30 },          premium: { type: 'skin', id: 'detective' } },
      { palier: 8,  free: { type: 'gold', montant: 40 },          premium: { type: 'emote', id: 'enquete' } },
      { palier: 9,  free: { type: 'gold', montant: 50 },          premium: { type: 'pet', id: 'pigeon_detective' } },
      // FANATIQUE (10-12)
      { palier: 10, free: { type: 'gold', montant: 40 },          premium: { type: 'skin', id: 'le_fanatique' } },
      { palier: 11, free: { type: 'gold', montant: 50 },          premium: { type: 'emote', id: 'rire_demon' } },
      { palier: 12, free: { type: 'gold', montant: 60 },          premium: { type: 'gold', montant: 80 } },
      // ESPION (13-15)
      { palier: 13, free: { type: 'gold', montant: 50 },          premium: { type: 'skin', id: 'agent_secret' } },
      { palier: 14, free: { type: 'gold', montant: 60 },          premium: { type: 'pet', id: 'petit_robot' } },
      { palier: 15, free: { type: 'emote', id: 'clin_oeil' },     premium: { type: 'skin', id: 'espionne' } },
      // CHERIF (16-18)
      { palier: 16, free: { type: 'gold', montant: 70 },          premium: { type: 'skin', id: 'cowboy' } },
      { palier: 17, free: { type: 'pet', id: 'cheval' },          premium: { type: 'emote', id: 'degaine' } },
      { palier: 18, free: { type: 'gold', montant: 100 },         premium: { type: 'skin', id: 'cherif' } }
    ]
  }
];

var PASSE_PREMIUM_PRIX = 500;

// ============================
// HELPERS
// ============================
function getSaisonActive() {
  var now = new Date();
  for (var i = 0; i < SAISONS.length; i++) {
    var s = SAISONS[i];
    var debut = new Date(s.dateDebut);
    var fin = new Date(s.dateFin);
    if (now >= debut && now <= fin) return s;
  }
  return SAISONS[SAISONS.length - 1]; // fallback : la derniere
}

function getSaisonLevelFromXP(xp, saison) {
  saison = saison || getSaisonActive();
  var level = Math.floor(xp / saison.xpParPalier);
  if (level > saison.nbPaliers) level = saison.nbPaliers;
  if (level > saison.paliers.length) level = saison.paliers.length;
  return Math.max(1, level);
}

// Reset les stats saison si la saison active a change (appele au login / ouverture profil)
function resetSaisonSiNecessaire(data) {
  var saison = getSaisonActive();
  if (!data || !monPlayerId) return;

  // Migration : si premier passage sur le passe et niveau carriere > 1, seed seasonXP
  if (data.seasonId === saison.id && !data.passeSeededV1 && (data.level || 1) > 1 && (!data.seasonXP || data.seasonXP === 0)) {
    var niveauSaison = Math.min(data.level || 1, saison.paliers.length);
    var seed = niveauSaison * saison.xpParPalier;
    db.collection('players').doc(monPlayerId).update({
      seasonXP: seed,
      seasonLevel: niveauSaison,
      passeSeededV1: true
    }).catch(function() {});
    return;
  }

  if (data.seasonId === saison.id) return; // deja a jour

  // Nouvelle saison : seeder a partir de la carriere si premier passage
  var seedXP = 0;
  if (!data.seasonId && (data.level || 1) > 1) {
    var nivS = Math.min(data.level || 1, saison.paliers.length);
    seedXP = nivS * saison.xpParPalier;
  }

  var update = {
    seasonId: saison.id,
    seasonXP: seedXP,
    seasonLevel: Math.max(1, Math.floor(seedXP / saison.xpParPalier) || 1),
    seasonKills: 0,
    seasonWins: 0,
    seasonDeaths: 0,
    seasonGames: 0,
    passeClaims: [],
    passePremium: false,
    passeSeededV1: true
  };
  db.collection('players').doc(monPlayerId).update(update).catch(function() {});
}

// Ajouter XP saison (appele en parallele de ajouterXP carriere)
function ajouterSeasonXP(xpGagne) {
  if (!monPlayerId || !xpGagne) return;
  if (typeof tutoGuide !== 'undefined' && tutoGuide) return;
  var saison = getSaisonActive();
  db.collection('players').doc(monPlayerId).update({
    seasonId: saison.id,
    seasonXP: firebase.firestore.FieldValue.increment(xpGagne)
  }).catch(function() {});
}

// Ajouter a une stat saison (seasonKills, seasonWins, etc.)
function incrementerStatSaison(champ, valeur) {
  if (!monPlayerId) return;
  if (typeof tutoGuide !== 'undefined' && tutoGuide) return;
  var update = {};
  update['season' + champ] = firebase.firestore.FieldValue.increment(valeur || 1);
  db.collection('players').doc(monPlayerId).update(update).catch(function() {});
}

// ============================
// ACHETER LE PASSE PREMIUM
// ============================
function acheterPassePremium() {
  if (!monPlayerId) return;
  if (playerGold < PASSE_PREMIUM_PRIX) {
    showNotif(t('passeNotEnoughGold', PASSE_PREMIUM_PRIX), 'warn');
    return;
  }
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    if (data.passePremium) {
      showNotif(t('passeAlreadyPremium'), 'info');
      return;
    }
    if ((data.gold || 0) < PASSE_PREMIUM_PRIX) {
      showNotif(t('passeNotEnoughGold', PASSE_PREMIUM_PRIX), 'warn');
      return;
    }
    var saison = getSaisonActive();
    db.collection('players').doc(monPlayerId).update({
      gold: firebase.firestore.FieldValue.increment(-PASSE_PREMIUM_PRIX),
      passePremium: true,
      seasonId: saison.id
    }).then(function() {
      playerGold -= PASSE_PREMIUM_PRIX;
      sauvegarderGold();
      showNotif(t('passePremiumUnlocked'), 'success');
      if (typeof afficherPasse === 'function') afficherPasse();
    }).catch(function() { showNotif(t('passeError'), 'warn'); });
  }).catch(function() {});
}

// ============================
// CLAIM D'UN PALIER
// ============================
// claimKey : 'free-N' ou 'premium-N' (N = numero palier)
function claimPalier(claimKey) {
  if (!monPlayerId) return;
  var parts = claimKey.split('-');
  var track = parts[0]; // free ou premium
  var palierNum = parseInt(parts[1]);
  if (!track || isNaN(palierNum)) return;

  var saison = getSaisonActive();
  var palierData = saison.paliers.find(function(p) { return p.palier === palierNum; });
  if (!palierData) return;
  var reward = track === 'free' ? palierData.free : palierData.premium;
  if (!reward) return;

  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    var claims = data.passeClaims || [];
    if (claims.indexOf(claimKey) >= 0) {
      showNotif(t('passeAlreadyClaimed'), 'info');
      return;
    }
    var seasonXP = data.seasonXP || 0;
    var niveau = getSaisonLevelFromXP(seasonXP, saison);
    if (niveau < palierNum) {
      showNotif(t('passeLevelRequired', palierNum, niveau), 'warn');
      return;
    }
    if (track === 'premium' && !data.passePremium) {
      showNotif(t('passePremiumRequired'), 'warn');
      return;
    }
    // Appliquer la recompense
    claims.push(claimKey);
    var update = { passeClaims: claims };
    if (reward.type === 'gold') {
      update.gold = firebase.firestore.FieldValue.increment(reward.montant);
    } else if (reward.type === 'skin') {
      var sa = (data.skinsAchetes || []).slice();
      if (sa.indexOf(reward.id) < 0) sa.push(reward.id);
      update.skinsAchetes = sa;
      update.skinsCount = sa.length;
    } else if (reward.type === 'pet') {
      var pa = (data.petsAchetes || []).slice();
      if (pa.indexOf(reward.id) < 0) pa.push(reward.id);
      update.petsAchetes = pa;
    } else if (reward.type === 'emote') {
      var ea = (data.emotesAchetes || []).slice();
      if (ea.indexOf(reward.id) < 0) ea.push(reward.id);
      update.emotesAchetes = ea;
    }
    db.collection('players').doc(monPlayerId).update(update).then(function() {
      // Sync local
      if (reward.type === 'gold') {
        playerGold += reward.montant;
        sauvegarderGold();
      } else if (reward.type === 'skin') {
        var mesAchats = getSkinsAchetes();
        if (mesAchats.indexOf(reward.id) < 0) mesAchats.push(reward.id);
        sauvegarderSkinsAchetes(mesAchats);
        // Ajouter au SKINS pour etre dispo
        var sp = SKINS_PASSE.find(function(s) { return s.id === reward.id; });
        if (sp && !SKINS.find(function(s) { return s.id === sp.id; })) {
          SKINS.push({ id: sp.id, nom: sp.nom, fichier: sp.fichier, rarete: sp.rarete });
        }
      }
      showNotif(t('passeRewardClaimed'), 'success');
      if (typeof afficherPasse === 'function') afficherPasse();
    }).catch(function() { showNotif(t('passeError'), 'warn'); });
  }).catch(function() {});
}

// Ouvre directement le profil sur l'onglet SAISON
function ouvrirPasse() {
  if (typeof ouvrirProfil === 'function') {
    ouvrirProfil(typeof monPlayerId !== 'undefined' ? monPlayerId : null);
    // Laisser le temps au profil de s'ouvrir puis switcher sur saison
    setTimeout(function() {
      if (typeof switchProfilTab === 'function') switchProfilTab('saison');
    }, 50);
  }
}

// ============================
// AFFICHAGE DU PASSE (onglet Saison du profil)
// ============================
function afficherPasse() {
  var container = document.getElementById('profil-saison-content');
  if (!container) return;
  if (!monPlayerId) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#95a5a6;">' + t('passeEmpty') + '</div>';
    return;
  }
  container.innerHTML = '<div class="spinner"></div>';

  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    // Auto-reset si nouvelle saison
    resetSaisonSiNecessaire(data);

    var saison = getSaisonActive();
    var seasonXP = data.seasonXP || 0;
    var niveau = getSaisonLevelFromXP(seasonXP, saison);
    var claims = data.passeClaims || [];
    var premium = !!data.passePremium;
    var xpDansPalier = seasonXP % saison.xpParPalier;
    var xpRequis = saison.xpParPalier;
    var pourcent = Math.round((xpDansPalier / xpRequis) * 100);

    var dateDebut = new Date(saison.dateDebut).toLocaleDateString();
    var dateFin = new Date(saison.dateFin).toLocaleDateString();
    var joursRestants = Math.max(0, Math.ceil((new Date(saison.dateFin) - new Date()) / 86400000));

    var html = '';
    // Stats de la saison (sans badges, juste les chiffres)
    var sKills = data.seasonKills || 0;
    var sWins = data.seasonWins || 0;
    var sDeaths = data.seasonDeaths || 0;
    var sGames = data.seasonGames || 0;
    var sWinRate = sGames > 0 ? Math.round((sWins / sGames) * 100) : 0;
    html += '<div class="saison-stats">';
    html += '<div class="profil-stats-grid" style="margin-top:10px;">';
    html += '<div class="profil-stat"><span class="profil-stat-val">' + sKills + '</span><span class="profil-stat-label">KILLS</span></div>';
    html += '<div class="profil-stat"><span class="profil-stat-val">' + sWins + '</span><span class="profil-stat-label">' + (typeof t === 'function' ? t('victories') : 'VICTOIRES') + '</span></div>';
    html += '<div class="profil-stat"><span class="profil-stat-val">' + sDeaths + '</span><span class="profil-stat-label">' + (typeof t === 'function' ? t('deaths') : 'MORTS') + '</span></div>';
    html += '<div class="profil-stat"><span class="profil-stat-val">' + sGames + '</span><span class="profil-stat-label">' + (typeof t === 'function' ? t('gamesPlayed') : 'PARTIES') + '</span></div>';
    html += '</div>';
    html += '<div class="profil-stat" style="grid-column:1/-1;margin-top:6px;"><span class="profil-stat-val">' + sWinRate + '%</span><span class="profil-stat-label">' + (typeof t === 'function' ? t('winRate') : 'TAUX DE VICTOIRE') + '</span></div>';
    html += '</div>';

    // Header saison
    html += '<div class="passe-header" style="border-color:' + saison.couleurTheme + ';">';
    html += '<div class="passe-titre" style="color:' + saison.couleurTheme + ';">&#9889; ' + t('passeSeason') + ' ' + saison.id + ' : ' + saison.nom + '</div>';
    html += '<div class="passe-dates">' + dateDebut + ' &rarr; ' + dateFin + ' &middot; ' + t('passeDaysLeft', joursRestants) + '</div>';
    html += '<div class="passe-niveau-row">';
    html += '<span class="passe-niveau-label">' + t('passeLevel') + ' ' + niveau + '</span>';
    html += '<div class="passe-xp-bar"><div class="passe-xp-fill" style="width:' + pourcent + '%;background:' + saison.couleurTheme + ';"></div></div>';
    html += '<span class="passe-xp-text">' + xpDansPalier + ' / ' + xpRequis + ' XP</span>';
    html += '</div>';
    if (!premium) {
      html += '<button class="passe-btn-premium" onclick="acheterPassePremium()">&#128081; ' + t('passeUnlockPremium', PASSE_PREMIUM_PRIX) + '</button>';
    } else {
      html += '<div class="passe-premium-active">&#128081; ' + t('passePremiumActive') + '</div>';
    }
    html += '</div>';

    // Sections par role (si definies)
    var sections = saison.sections || [{ debut: 1, fin: saison.paliers.length, role: '', nom: '', couleur: saison.couleurTheme }];
    sections.forEach(function(sec) {
      // En-tete section
      html += '<div class="passe-section" style="border-color:' + sec.couleur + ';">';
      html += '<div class="passe-section-titre" style="background:' + sec.couleur + ';">' + sec.nom + '</div>';
      html += '<div class="passe-paliers">';
      saison.paliers.forEach(function(p) {
        if (p.palier < sec.debut || p.palier > sec.fin) return;
        var deverrouille = niveau >= p.palier;
        var freeKey = 'free-' + p.palier;
        var premiumKey = 'premium-' + p.palier;
        var freeClaimed = claims.indexOf(freeKey) >= 0;
        var premiumClaimed = claims.indexOf(premiumKey) >= 0;

        html += '<div class="passe-palier ' + (deverrouille ? 'palier-unlocked' : 'palier-locked') + '" style="border-color:' + (deverrouille ? sec.couleur : '#34495e') + ';">';
        html += '<div class="palier-num" style="background:' + sec.couleur + ';">' + p.palier + '</div>';
        html += '<div class="palier-reward palier-free">' + renderReward(p.free, deverrouille, freeClaimed, freeKey, true) + '</div>';
        html += '<div class="palier-reward palier-premium">' + renderReward(p.premium, deverrouille && premium, premiumClaimed, premiumKey, false) + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    });

    container.innerHTML = html;
  }).catch(function(err) {
    console.error('Erreur afficherPasse:', err);
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#e74c3c;">' + t('passeLoadError') + '</div>';
  });
}

function renderReward(reward, canClaim, claimed, claimKey, isFree) {
  if (!reward) return '<div class="palier-vide">&ndash;</div>';
  var img = '', label = '';
  if (reward.type === 'gold') {
    img = '<div class="reward-icon" style="font-size:28px;">&#9733;</div>';
    label = '+' + reward.montant;
  } else if (reward.type === 'skin') {
    var sp = SKINS_PASSE.find(function(s) { return s.id === reward.id; });
    if (sp) {
      img = '<img class="reward-icon-img" src="' + sp.fichier + '" alt="' + sp.nom + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\';"><div class="reward-placeholder" style="display:none;">&#128100;</div>';
      label = sp.nom;
    } else {
      img = '<div class="reward-icon">&#128100;</div>';
      label = 'Skin';
    }
  } else if (reward.type === 'pet') {
    var pp = PETS_PASSE.find(function(p) { return p.id === reward.id; });
    if (pp) {
      img = '<img class="reward-icon-img" src="' + pp.idle + '" alt="' + pp.nom + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\';"><div class="reward-placeholder" style="display:none;">&#128062;</div>';
      label = pp.nom;
    } else {
      img = '<div class="reward-icon">&#128062;</div>';
      label = 'Pet';
    }
  } else if (reward.type === 'emote') {
    var ep = EMOTES_PASSE.find(function(e) { return e.id === reward.id; });
    if (ep) {
      img = '<div class="reward-icon" style="font-size:28px;">' + ep.emoji + '</div>';
      label = ep.nom;
    } else {
      img = '<div class="reward-icon">&#128512;</div>';
      label = 'Emote';
    }
  }
  var btnHtml;
  if (claimed) {
    btnHtml = '<button class="palier-btn palier-claimed" disabled>' + t('passeClaimed') + '</button>';
  } else if (canClaim) {
    btnHtml = '<button class="palier-btn palier-reclamer" onclick="claimPalier(\'' + claimKey + '\')">' + t('passeClaim') + '</button>';
  } else {
    btnHtml = '<button class="palier-btn palier-bloque" disabled>&#128274;</button>';
  }
  return img + '<div class="reward-label">' + label + '</div>' + btnHtml;
}
