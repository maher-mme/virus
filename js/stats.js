// ============================
// SYSTEME DE NIVEAUX / XP
// ============================
var XP_PAR_KILL = 5;
var GOLD_PAR_NIVEAU = 50;

function xpPourNiveau(niveau) {
  return 1000;
}

function calculerNiveau(xpTotal) {
  var niveau = 1;
  var xpRestant = xpTotal;
  while (xpRestant >= xpPourNiveau(niveau)) {
    xpRestant -= xpPourNiveau(niveau);
    niveau++;
  }
  return { niveau: niveau, xpDansNiveau: xpRestant, xpRequis: xpPourNiveau(niveau) };
}

var _dernierNiveauNotifie = 0;

function ajouterXP(xpGagne) {
  if (!monPlayerId) return;
  if (typeof tutoGuide !== 'undefined' && tutoGuide) return;
  var ref = db.collection('players').doc(monPlayerId);
  db.runTransaction(function(transaction) {
    return transaction.get(ref).then(function(doc) {
      if (!doc.exists) return;
      var data = doc.data();
      var ancienXP = data.xp || 0;
      var ancienNiveau = data.level || calculerNiveau(ancienXP).niveau;
      var nouveauXP = ancienXP + xpGagne;
      var nouveauNiveau = calculerNiveau(nouveauXP).niveau;

      // Ne jamais faire regresser le niveau
      var levelFinal = Math.max(nouveauNiveau, ancienNiveau);

      var updateData = { xp: nouveauXP, level: levelFinal };
      var now = new Date();
      var moisCle = 'xpParMois.' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      updateData[moisCle] = firebase.firestore.FieldValue.increment(xpGagne);
      transaction.update(ref, updateData);

      // Notif level up seulement si le niveau augmente ET pas deja notifie
      if (levelFinal > ancienNiveau && levelFinal > _dernierNiveauNotifie) {
        _dernierNiveauNotifie = levelFinal;
        var niveauxGagnes = levelFinal - ancienNiveau;
        var goldBonus = niveauxGagnes * GOLD_PAR_NIVEAU;
        playerGold += goldBonus;
        sauvegarderGold();
        showNotif(t('levelUp', levelFinal, goldBonus), 'success');
      }
    });
  }).catch(function(err) { console.error('Erreur ajouterXP:', err); });
}

// ============================
// CLASSEMENT & PROFIL JOUEUR
// ============================
var classementTab = 'wins';

function ouvrirClassement() {
  document.getElementById('popup-classement').classList.add('visible');
  classementTab = 'wins';
  switchClassementTab('wins');
}

function fermerClassement() {
  document.getElementById('popup-classement').classList.remove('visible');
}

function switchClassementTab(tab) {
  classementTab = tab;
  document.querySelectorAll('.classement-tab').forEach(function(el) { el.classList.remove('active'); });
  var btn = document.getElementById('classement-tab-' + tab);
  if (btn) btn.classList.add('active');
  chargerClassement(tab);
}

function chargerClassement(champ) {
  var liste = document.getElementById('classement-liste');
  if (!liste) return;
  liste.innerHTML = '<div class="spinner"></div>';

  // Cosmetiques : compter skins + pets + musiques
  if (champ === 'skins') {
    var nbSkinsBase = (typeof SKINS !== 'undefined') ? SKINS.filter(function(s) { return !SKINS_BOUTIQUE.find(function(sb) { return sb.id === s.id; }); }).length : 2;
    var nbSkinsBoutique = (typeof SKINS_BOUTIQUE !== 'undefined') ? SKINS_BOUTIQUE.length : 0;
    var nbPetsBoutique = (typeof PETS_BOUTIQUE !== 'undefined') ? PETS_BOUTIQUE.length : 0;
    var nbMusiquesBoutique = (typeof MUSIQUES_BOUTIQUE !== 'undefined') ? MUSIQUES_BOUTIQUE.length : 0;
    var totalCosmetiques = nbSkinsBase + nbSkinsBoutique + nbPetsBoutique + nbMusiquesBoutique;

    db.collection('players').get({ source: 'server' }).then(function(snap) {
      var joueurs = [];
      snap.forEach(function(doc) {
        var data = doc.data();
        data._id = doc.id;
        var pseudoLower = (data.pseudo || '').trim().toLowerCase();
        var estAdmin = pseudoLower === 'obstinate' || pseudoLower === 'obstinate2.0' || pseudoLower === 'chrikidd77';
        if (estAdmin) return;
        var nb = nbSkinsBase; // skins de base inclus pour tous
        if (data.skinsAchetes && Array.isArray(data.skinsAchetes)) nb += data.skinsAchetes.length;
        if (data.petsAchetes && Array.isArray(data.petsAchetes)) nb += data.petsAchetes.length;
        if (data.musiquesAchetees && Array.isArray(data.musiquesAchetees)) nb += data.musiquesAchetees.length;
        if (data.pseudo && data.pseudo.trim()) {
          joueurs.push({ data: data, count: nb });
        }
      });
      joueurs.sort(function(a, b) { return b.count - a.count; });
      joueurs = joueurs.slice(0, 100);
      if (joueurs.length === 0) {
        liste.innerHTML = '<div class="classement-vide">' + t('noLeaderboard') + '</div>';
        return;
      }
      liste.innerHTML = '';
      var info = document.createElement('div');
      info.className = 'classement-info-skins';
      info.textContent = t('totalCosmetics', totalCosmetiques, (nbSkinsBase + nbSkinsBoutique), nbPetsBoutique, nbMusiquesBoutique);
      liste.appendChild(info);
      joueurs.forEach(function(j, idx) {
        liste.appendChild(creerClassementItem(j.data, idx + 1, j.count + '/' + totalCosmetiques));
      });
    }).catch(function(err) {
      console.error('Erreur classement cosmetiques:', err);
      liste.innerHTML = '<div class="classement-vide">' + t('connectionError') + '</div>';
    });
    return;
  }

  var seuilMin = (champ === 'level') ? 1 : 0;
  db.collection('players')
    .where(champ, '>', seuilMin)
    .orderBy(champ, 'desc')
    .limit(100)
    .get({ source: 'server' })
    .then(function(snap) {
      if (snap.empty) {
        liste.innerHTML = '<div class="classement-vide">' + t('noLeaderboard') + '</div>';
        return;
      }
      liste.innerHTML = '';
      var rang = 0;
      snap.forEach(function(doc) {
        var data = doc.data();
        if (!data.pseudo || !data.pseudo.trim()) return;
        rang++;
        data._id = doc.id;
        liste.appendChild(creerClassementItem(data, rang, data[champ] || 0));
      });
    })
    .catch(function(err) {
      console.error('Erreur classement:', err);
      liste.innerHTML = '<div class="classement-vide">' + t('connectionError') + '</div>';
    });
}

function creerClassementItem(data, rang, valeur) {
  var item = document.createElement('div');
  item.className = 'classement-item';
  if (rang === 1) item.classList.add('top1');
  else if (rang === 2) item.classList.add('top2');
  else if (rang === 3) item.classList.add('top3');

  var rangEl = document.createElement('div');
  rangEl.className = 'classement-rang';
  rangEl.textContent = rang;
  item.appendChild(rangEl);

  var img = document.createElement('img');
  img.className = 'classement-pfp';
  img.src = data.pfp || (typeof PFP_DE_BASE !== 'undefined' ? PFP_DE_BASE : 'assets/pfp_de_base.png');
  img.style.cursor = 'pointer';
  img.title = 'Voir le profil';
  img.onclick = function() {
    fermerClassement();
    ouvrirProfil(data._id);
  };
  item.appendChild(img);

  var pseudo = document.createElement('span');
  pseudo.className = 'classement-pseudo';
  pseudo.textContent = escapeHtml(data.pseudo || '???');
  pseudo.style.cursor = 'pointer';
  pseudo.onclick = function() {
    fermerClassement();
    ouvrirProfil(data._id);
  };
  item.appendChild(pseudo);

  var val = document.createElement('span');
  val.className = 'classement-val';
  val.textContent = valeur;
  item.appendChild(val);

  return item;
}

// ============================
// PROFIL JOUEUR
// ============================
function ouvrirProfil(playerId) {
  // Fermer le panel amis s'il est ouvert
  if (typeof panelAmisOuvert !== 'undefined' && panelAmisOuvert) {
    togglePanelAmis();
  }
  document.getElementById('popup-profil').classList.add('visible');
  chargerProfil(playerId);
  // Mettre a jour l'URL avec le pseudo du joueur
  var targetId = playerId || monPlayerId;
  if (targetId) {
    db.collection('players').doc(targetId).get().then(function(doc) {
      if (doc.exists && doc.data().pseudo) {
        window.history.pushState({}, '', '?profil=' + encodeURIComponent(doc.data().pseudo));
      }
    }).catch(function() {});
  }
}

function fermerProfil() {
  document.getElementById('popup-profil').classList.remove('visible');
  // Restaurer l'URL d'origine
  window.history.pushState({}, '', window.location.pathname);
}

function ouvrirProfilJoueur(playerId) {
  fermerCommentaires();
  ouvrirProfil(playerId);
}

// Systeme de badges
var BADGE_PALIERS_COMBAT = [
  { nom: 'Maitre', min: 5000, fichier: 'assets/badges/Badges_maître.svg', couleur: '#9b59b6' },
  { nom: 'Champion', min: 1000, fichier: 'assets/badges/Badges_Chaimpion.svg', couleur: '#e74c3c' },
  { nom: 'Diamant', min: 500, fichier: 'assets/badges/Badges_diament.svg', couleur: '#2962ff' },
  { nom: 'Platine', min: 250, fichier: 'assets/badges/Badges_Platine.svg', couleur: '#00e5ff' },
  { nom: 'Or', min: 100, fichier: 'assets/badges/Bages_or.svg', couleur: '#fdd835' },
  { nom: 'Argent', min: 50, fichier: 'assets/badges/Badges_argent.svg', couleur: '#bdbdbd' },
  { nom: 'Bronze', min: 1, fichier: 'assets/badges/Badges_bronze.svg', couleur: '#b8860b' }
];
var BADGE_PALIERS_NIVEAU = [
  { nom: 'Maitre', min: 200, fichier: 'assets/badges/Badges_maître.svg', couleur: '#9b59b6' },
  { nom: 'Champion', min: 125, fichier: 'assets/badges/Badges_Chaimpion.svg', couleur: '#e74c3c' },
  { nom: 'Diamant', min: 75, fichier: 'assets/badges/Badges_diament.svg', couleur: '#2962ff' },
  { nom: 'Platine', min: 50, fichier: 'assets/badges/Badges_Platine.svg', couleur: '#00e5ff' },
  { nom: 'Or', min: 25, fichier: 'assets/badges/Bages_or.svg', couleur: '#fdd835' },
  { nom: 'Argent', min: 10, fichier: 'assets/badges/Badges_argent.svg', couleur: '#bdbdbd' },
  { nom: 'Bronze', min: 1, fichier: 'assets/badges/Badges_bronze.svg', couleur: '#b8860b' }
];

function getBadgePalier(valeur, type) {
  var paliers = (type === 'niveau') ? BADGE_PALIERS_NIVEAU : BADGE_PALIERS_COMBAT;
  for (var i = 0; i < paliers.length; i++) {
    if (valeur >= paliers[i].min) return paliers[i];
  }
  return null;
}

function construireBadges(kills, wins, niveau) {
  var categories = [
    { label: 'KILLS', valeur: kills, emoji: '🦠', type: 'combat' },
    { label: 'VICTOIRES', valeur: wins, emoji: '🏆', type: 'combat' },
    { label: 'NIVEAU', valeur: niveau, emoji: '<span style="color:#9b59b6;font-weight:bold;">XP</span>', type: 'niveau' }
  ];
  var html = '<div style="display:flex;justify-content:center;gap:15px;flex-wrap:wrap;margin-bottom:10px;">';
  categories.forEach(function(cat) {
    var palier = getBadgePalier(cat.valeur, cat.type);
    if (palier) {
      html += '<div style="text-align:center;width:90px;">' +
        '<div style="position:relative;width:80px;height:80px;margin:0 auto;">' +
        '<img src="' + palier.fichier + '" style="width:100%;height:100%;object-fit:contain;" alt="' + palier.nom + '">' +
        '<div style="position:absolute;top:55%;left:50%;transform:translate(-50%,-50%);font-size:22px;">' + cat.emoji + '</div>' +
        '</div>' +
        '<div style="color:' + palier.couleur + ';font-size:10px;font-weight:bold;letter-spacing:1px;margin-top:4px;">' + palier.nom.toUpperCase() + '</div>' +
        '<div style="color:#ecf0f1;font-size:13px;font-weight:bold;">' + cat.valeur + '</div>' +
        '<div style="color:#95a5a6;font-size:9px;">' + cat.label + '</div>' +
        '</div>';
    } else {
      html += '<div style="text-align:center;width:90px;">' +
        '<div style="width:80px;height:80px;margin:0 auto;border:2px dashed #34495e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;opacity:0.4;">' + cat.emoji + '</div>' +
        '<div style="color:#566573;font-size:10px;margin-top:4px;">---</div>' +
        '<div style="color:#566573;font-size:13px;">0</div>' +
        '<div style="color:#566573;font-size:9px;">' + cat.label + '</div>' +
        '</div>';
    }
  });
  html += '</div>';
  return html;
}

// Construire un graphique en barres de l'XP par mois (6 derniers mois)
function construireGrapheXP(xpParMois) {
  var moisLabels = [t('monthJan'),t('monthFeb'),t('monthMar'),t('monthApr'),t('monthMay'),t('monthJun'),t('monthJul'),t('monthAug'),t('monthSep'),t('monthOct'),t('monthNov'),t('monthDec')];
  var now = new Date();
  var data = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var cle = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var label = moisLabels[d.getMonth()];
    data.push({ label: label, value: xpParMois[cle] || 0 });
  }
  var max = Math.max.apply(null, data.map(function(d) { return d.value; }));
  if (max === 0) max = 1;
  var BAR_AREA = 100; // hauteur en pixels de la zone de barres
  var html = '<div style="grid-column:1/-1;background:rgba(44,62,80,0.5);border:1px solid #34495e;border-radius:10px;padding:12px;margin-top:6px;">' +
    '<div style="color:#f39c12;font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:8px;text-align:center;">' + t('graphXP6Months') + '</div>' +
    '<div style="display:flex;align-items:flex-end;justify-content:space-around;gap:6px;">';
  for (var b = 0; b < data.length; b++) {
    var hauteur = Math.max(3, Math.round((data[b].value / max) * BAR_AREA));
    html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">' +
      '<div style="color:#f39c12;font-size:9px;margin-bottom:2px;font-weight:bold;">' + data[b].value + '</div>' +
      '<div style="width:80%;height:' + hauteur + 'px;background:linear-gradient(180deg,#f39c12,#e67e22);border-radius:4px 4px 0 0;"></div>' +
      '<div style="color:#bdc3c7;font-size:10px;margin-top:4px;">' + data[b].label + '</div>' +
    '</div>';
  }
  html += '</div></div>';
  return html;
}

function chargerProfil(playerId) {
  var headerEl = document.getElementById('profil-header');
  var statsEl = document.getElementById('profil-stats');
  if (!headerEl || !statsEl) return;

  var targetId = playerId || monPlayerId;

  // Stats depuis Firebase
  headerEl.innerHTML = '';
  statsEl.innerHTML = '<div class="spinner"></div>';
  db.collection('players').doc(targetId).get().then(function(doc) {
    if (!doc.exists) {
      statsEl.innerHTML = '<div class="classement-vide">' + t('accountNotFound') + '</div>';
      return;
    }
    var data = doc.data();
    var pseudo = data.pseudo || '???';
    var pfp = data.pfp || '';

    // Niveau
    var xpTotal = data.xp || 0;
    var niveauInfo = calculerNiveau(xpTotal);
    var pourcent = Math.round((niveauInfo.xpDansNiveau / niveauInfo.xpRequis) * 100);

    // Header
    var pfpHtml = pfp
      ? '<img class="profil-pfp" src="' + pfp + '" alt="PFP">'
      : '<div class="profil-pfp-placeholder">?</div>';
    // Statut en ligne / hors ligne + derniere connexion
    var isOnline = data.online && data.lastSeen && (Date.now() - data.lastSeen.toDate().getTime() < 120000);
    var statutHtml = isOnline
      ? '<span class="profil-statut profil-en-ligne">&#9679; ' + t('profilOnline') + '</span>'
      : '<span class="profil-statut profil-hors-ligne">&#9679; ' + t('profilOffline') + '</span>';
    // Derniere connexion si hors ligne
    var dernierVuHtml = '';
    if (!isOnline && data.lastSeen) {
      var lastDate = data.lastSeen.toDate();
      var diff = Date.now() - lastDate.getTime();
      var minutes = Math.floor(diff / 60000);
      var heures = Math.floor(diff / 3600000);
      var jours = Math.floor(diff / 86400000);
      var dernierVuTexte = '';
      if (minutes < 1) dernierVuTexte = t('profilSecondsAgo');
      else if (minutes < 60) dernierVuTexte = t('profilMinAgo', minutes);
      else if (heures < 24) dernierVuTexte = t('profilHoursAgo', heures);
      else dernierVuTexte = t('profilDaysAgo', jours);
      dernierVuHtml = '<span class="profil-dernier-vu">' + t('profilSeen') + ' ' + dernierVuTexte + '</span>';
    }
    // Date d'inscription
    var inscriptionHtml = '';
    if (data.createdAt) {
      var dateInscr = data.createdAt.toDate();
      var mois = ['jan', 'fev', 'mars', 'avr', 'mai', 'juin', 'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];
      inscriptionHtml = '<span class="profil-inscription">' + t('profilMemberSince') + ' ' + mois[dateInscr.getMonth()] + ' ' + dateInscr.getFullYear() + '</span>';
    }
    // Skin equipe
    var skinHtml = '';
    if (data.skin) {
      skinHtml = '<img class="profil-skin" src="' + data.skin + '" alt="skin">';
    }

    var lienProfil = window.location.origin + window.location.pathname + '?profil=' + encodeURIComponent(pseudo);
    headerEl.innerHTML = pfpHtml +
      '<div class="profil-info">' +
      '<span class="profil-pseudo">' + escapeHtml(pseudo) + '</span>' +
      statutHtml + dernierVuHtml +
      '<span class="profil-niveau">' + t('level') + ' ' + niveauInfo.niveau + '</span>' +
      '<div class="profil-xp-bar"><div class="profil-xp-fill" style="width:' + pourcent + '%"></div></div>' +
      '<span class="profil-xp-text">' + niveauInfo.xpDansNiveau + ' / ' + niveauInfo.xpRequis + ' XP</span>' +
      inscriptionHtml +
      '<button class="btn-copier-lien" onclick="copierLienProfil(\'' + lienProfil.replace(/'/g, "\\'") + '\')">' + t('profilCopyLink') + '</button>' +
      '</div>' +
      skinHtml;

    var wins = data.wins || 0;
    var kills = data.kills || 0;
    var games = data.gamesPlayed || 0;
    var deaths = data.deaths || 0;
    var winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
    var niveau = data.level || niveauInfo.niveau;

    statsEl.innerHTML =
      construireBadges(kills, wins, niveau) +
      '<div class="profil-stat" style="grid-column:1/-1"><span class="profil-stat-val">' + winRate + '%</span><span class="profil-stat-label">' + t('winRate') + ' (' + wins + '/' + games + ')</span></div>' +
      construireGrapheXP(data.xpParMois || {});
  }).catch(function() {
    statsEl.innerHTML = '<div class="classement-vide">' + t('connectionError') + '</div>';
  });
}

// ============================
// LIEN PROFIL VIA URL : ?profil=pseudo
// ============================
function copierLienProfil(lien) {
  navigator.clipboard.writeText(lien).then(function() {
    showNotif(t('profilLinkCopied'), 'info');
  }).catch(function() {
    showNotif(t('profilCopyError'), 'warn');
  });
}

function checkProfilURL() {
  var params = new URLSearchParams(window.location.search);
  var profilPseudo = params.get('profil');
  if (!profilPseudo) return;
  // Attendre que Firebase soit dispo
  if (typeof db === 'undefined') { setTimeout(checkProfilURL, 500); return; }
  // Attendre que le DOM soit pret (popup-profil existe)
  if (!document.getElementById('popup-profil')) { setTimeout(checkProfilURL, 500); return; }
  // Recherche insensible a la casse
  var pseudoLower = profilPseudo.toLowerCase();
  db.collection('players').where('pseudoLower', '==', pseudoLower).limit(1).get().then(function(snap) {
    if (snap.empty) {
      // Fallback : chercher par pseudo exact
      return db.collection('players').where('pseudo', '==', profilPseudo).limit(1).get();
    }
    return snap;
  }).then(function(snap) {
    if (snap && !snap.empty) {
      ouvrirProfil(snap.docs[0].id);
    } else {
      showNotif(t('profilNotFound', profilPseudo), 'warn');
    }
    // Nettoyer l'URL sans recharger
    window.history.replaceState({}, '', window.location.pathname);
  }).catch(function(err) {
    console.error('Erreur checkProfilURL:', err);
  });
}
// Lancer plusieurs fois au cas ou le DOM/Firebase ne sont pas prets
setTimeout(checkProfilURL, 1500);
setTimeout(checkProfilURL, 3500);

// ============================
// MISE A JOUR DES STATS EN FIN DE PARTIE
// ============================
function incrementerStat(champ, valeur) {
  if (!monPlayerId) return;
  if (typeof tutoGuide !== 'undefined' && tutoGuide) return;
  var update = {};
  update[champ] = firebase.firestore.FieldValue.increment(valeur || 1);
  db.collection('players').doc(monPlayerId).update(update).then(function() {
    // Verifier si un nouveau palier de badge est atteint
    if (champ === 'kills' || champ === 'wins') verifierNouveauBadge(champ);
  }).catch(function() {});
}

function verifierNouveauBadge(champ) {
  if (!monPlayerId) return;
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    var valeur = data[champ] || 0;
    var type = (champ === 'level') ? 'niveau' : 'combat';
    var palier = getBadgePalier(valeur, type);
    if (!palier) return;
    var badgesDebloque = data.badgesDebloques || {};
    var cle = champ + '_' + palier.nom;
    if (!badgesDebloque[cle]) {
      badgesDebloque[cle] = true;
      db.collection('players').doc(monPlayerId).update({ badgesDebloques: badgesDebloque }).catch(function() {});
      showNotif('Badge ' + palier.nom + ' debloque ! +100 XP', 'success');
      ajouterXP(100);
    }
  }).catch(function() {});
}

function enregistrerStatsFinPartie(gagnant) {
  // Mode entrainement : pas de stats / XP / gold
  if (typeof tutoGuide !== 'undefined' && tutoGuide) {
    if (typeof fermerTutoGuide === 'function') fermerTutoGuide();
    return;
  }
  // Mort ?
  var pseudo = getPseudo() || '';
  var estMort = joueursElimines.indexOf(pseudo) >= 0;

  // Victoire ?
  var aGagne = false;
  if (gagnant === 'virus' && monRole === 'virus') aGagne = true;
  if (gagnant === 'virus' && monRole === 'espion' && espionCamp === 'virus') aGagne = true;
  if ((gagnant === 'innocents' || gagnant === 'missions') && (monRole === 'innocent' || monRole === 'journaliste')) aGagne = true;
  if ((gagnant === 'innocents' || gagnant === 'missions') && monRole === 'espion' && espionCamp === 'innocent') aGagne = true;
  if (gagnant === 'fanatique' && monRole === 'fanatique') aGagne = true;

  // Mise a jour des quetes hebdomadaires (online + hors ligne)
  if (typeof incrementerQueteStat === 'function') {
    incrementerQueteStat('gamesPlayed', 1);
    if (aGagne) {
      incrementerQueteStat('wins', 1);
      if (monRole === 'virus') incrementerQueteStat('winsVirus', 1);
      if (monRole === 'innocent' || monRole === 'journaliste') incrementerQueteStat('winsInnocent', 1);
    }
    if (!estMort) incrementerQueteStat('survies', 1);
  }

  // Mode API : le serveur gere tout
  if (typeof apiDisponible !== 'undefined' && apiDisponible && partieActuelleId) {
    var killsCount = typeof playerKills !== 'undefined' ? playerKills : 0;
    apiEndGameStats(partieActuelleId, aGagne, estMort, killsCount).catch(function() {});
    apiEndGameXP(partieActuelleId, aGagne).then(function(data) {
      if (data && data.niveauxGagnes > 0) {
        playerGold += data.goldBonus;
        showNotif(t('levelUp', data.niveau, data.goldBonus), 'success');
      }
      if (data && data.xpGagne) {
        showNotif('+' + data.xpGagne + ' XP', 'info');
      }
    }).catch(function() {});
    return;
  }

  // Mode local (fallback) : gestion directe
  incrementerStat('gamesPlayed');
  if (estMort) incrementerStat('deaths');
  if (aGagne) incrementerStat('wins');

  // XP : defaite 10-100, victoire 100-250
  var xpGagne;
  if (aGagne) {
    xpGagne = 100 + Math.floor(Math.random() * 151);
  } else {
    xpGagne = 10 + Math.floor(Math.random() * 91);
  }
  ajouterXP(xpGagne);
}
