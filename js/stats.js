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

function ajouterXP(xpGagne) {
  if (!monPlayerId) return;
  if (typeof tutoGuide !== 'undefined' && tutoGuide) return; // pas de XP en entrainement
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    var ancienXP = data.xp || 0;
    var ancienNiveau = calculerNiveau(ancienXP).niveau;
    var nouveauXP = ancienXP + xpGagne;
    var nouveauNiveau = calculerNiveau(nouveauXP).niveau;
    var niveauxGagnes = nouveauNiveau - ancienNiveau;

    var updateData = { xp: nouveauXP, level: nouveauNiveau };
    // Tracker l'XP gagnee par mois (cle YYYY-MM)
    var now = new Date();
    var moisCle = 'xpParMois.' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    updateData[moisCle] = firebase.firestore.FieldValue.increment(xpGagne);
    if (niveauxGagnes > 0) {
      // Donner 50 gold par niveau gagne
      var goldBonus = niveauxGagnes * GOLD_PAR_NIVEAU;
      playerGold += goldBonus;
      sauvegarderGold();
      showNotif(t('levelUp', nouveauNiveau, goldBonus), 'success');
    }
    db.collection('players').doc(monPlayerId).update(updateData).catch(function() {});
  }).catch(function() {});
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
      joueurs = joueurs.slice(0, 20);
      if (joueurs.length === 0) {
        liste.innerHTML = '<div class="classement-vide">' + t('noLeaderboard') + '</div>';
        return;
      }
      liste.innerHTML = '';
      var info = document.createElement('div');
      info.className = 'classement-info-skins';
      info.textContent = totalCosmetiques + ' cosmetiques (' + (nbSkinsBase + nbSkinsBoutique) + ' skins + ' + nbPetsBoutique + ' pets + ' + nbMusiquesBoutique + ' musiques)';
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

  db.collection('players')
    .where(champ, '>', 0)
    .orderBy(champ, 'desc')
    .limit(20)
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

// Construire un graphique en barres de l'XP par mois (6 derniers mois)
function construireGrapheXP(xpParMois) {
  var moisLabels = ['Jan','Fev','Mar','Avr','Mai','Juin','Juil','Aou','Sep','Oct','Nov','Dec'];
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
  var html = '<div style="grid-column:1/-1;background:rgba(44,62,80,0.5);border:1px solid #34495e;border-radius:10px;padding:12px;margin-top:6px;">' +
    '<div style="color:#f39c12;font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:8px;text-align:center;">XP DES 6 DERNIERS MOIS</div>' +
    '<div style="display:flex;align-items:flex-end;justify-content:space-around;height:90px;gap:6px;">';
  for (var b = 0; b < data.length; b++) {
    var pct = Math.max(2, Math.round((data[b].value / max) * 100));
    html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">' +
      '<div style="color:#f39c12;font-size:9px;margin-bottom:2px;">' + data[b].value + '</div>' +
      '<div style="width:100%;height:' + pct + '%;background:linear-gradient(180deg,#f39c12,#e67e22);border-radius:4px 4px 0 0;min-height:2px;"></div>' +
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
      ? '<span class="profil-statut profil-en-ligne">&#9679; En ligne</span>'
      : '<span class="profil-statut profil-hors-ligne">&#9679; Hors ligne</span>';
    // Derniere connexion si hors ligne
    var dernierVuHtml = '';
    if (!isOnline && data.lastSeen) {
      var lastDate = data.lastSeen.toDate();
      var diff = Date.now() - lastDate.getTime();
      var minutes = Math.floor(diff / 60000);
      var heures = Math.floor(diff / 3600000);
      var jours = Math.floor(diff / 86400000);
      var dernierVuTexte = '';
      if (minutes < 1) dernierVuTexte = 'il y a quelques secondes';
      else if (minutes < 60) dernierVuTexte = 'il y a ' + minutes + ' min';
      else if (heures < 24) dernierVuTexte = 'il y a ' + heures + 'h';
      else dernierVuTexte = 'il y a ' + jours + 'j';
      dernierVuHtml = '<span class="profil-dernier-vu">Vu ' + dernierVuTexte + '</span>';
    }
    // Date d'inscription
    var inscriptionHtml = '';
    if (data.createdAt) {
      var dateInscr = data.createdAt.toDate();
      var mois = ['jan', 'fev', 'mars', 'avr', 'mai', 'juin', 'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];
      inscriptionHtml = '<span class="profil-inscription">Membre depuis ' + mois[dateInscr.getMonth()] + ' ' + dateInscr.getFullYear() + '</span>';
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
      '<button class="btn-copier-lien" onclick="copierLienProfil(\'' + lienProfil.replace(/'/g, "\\'") + '\')">Copier le lien du profil</button>' +
      '</div>' +
      skinHtml;

    var wins = data.wins || 0;
    var kills = data.kills || 0;
    var games = data.gamesPlayed || 0;
    var deaths = data.deaths || 0;
    var winRate = games > 0 ? Math.round((wins / games) * 100) : 0;

    statsEl.innerHTML =
      '<div class="profil-stat"><span class="profil-stat-val">' + games + '</span><span class="profil-stat-label">' + t('gamesPlayed') + '</span></div>' +
      '<div class="profil-stat"><span class="profil-stat-val">' + wins + '</span><span class="profil-stat-label">' + t('victories') + '</span></div>' +
      '<div class="profil-stat"><span class="profil-stat-val">' + kills + '</span><span class="profil-stat-label">KILLS</span></div>' +
      '<div class="profil-stat"><span class="profil-stat-val">' + deaths + '</span><span class="profil-stat-label">' + t('deaths') + '</span></div>' +
      '<div class="profil-stat" style="grid-column:1/-1"><span class="profil-stat-val">' + winRate + '%</span><span class="profil-stat-label">' + t('winRate') + '</span></div>' +
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
    showNotif('Lien copie !', 'info');
  }).catch(function() {
    showNotif('Erreur copie', 'warn');
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
      showNotif('Joueur "' + profilPseudo + '" introuvable', 'warn');
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
  if (typeof tutoGuide !== 'undefined' && tutoGuide) return; // pas de stats en entrainement
  var update = {};
  update[champ] = firebase.firestore.FieldValue.increment(valeur || 1);
  db.collection('players').doc(monPlayerId).update(update).catch(function() {});
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

  // Mise a jour des quetes hebdomadaires (uniquement en mode en ligne)
  if (!modeHorsLigne && typeof incrementerQueteStat === 'function') {
    incrementerQueteStat('gamesPlayed', 1);
    if (aGagne) {
      incrementerQueteStat('wins', 1);
      if (monRole === 'virus') incrementerQueteStat('winsVirus', 1);
      if (monRole === 'innocent' || monRole === 'journaliste') incrementerQueteStat('winsInnocent', 1);
    }
    if (!estMort) incrementerQueteStat('survies', 1);
  }

  // XP : defaite 10-100, victoire 100-250
  var xpGagne;
  if (aGagne) {
    xpGagne = 100 + Math.floor(Math.random() * 151);
  } else {
    xpGagne = 10 + Math.floor(Math.random() * 91);
  }
  ajouterXP(xpGagne);
}
