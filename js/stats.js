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
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    var ancienXP = data.xp || 0;
    var ancienNiveau = calculerNiveau(ancienXP).niveau;
    var nouveauXP = ancienXP + xpGagne;
    var nouveauNiveau = calculerNiveau(nouveauXP).niveau;
    var niveauxGagnes = nouveauNiveau - ancienNiveau;

    var updateData = { xp: nouveauXP, level: nouveauNiveau };
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

  // Skins : compter depuis le tableau skinsAchetes + skins de base
  if (champ === 'skins') {
    var nbSkinsBase = (typeof SKINS !== 'undefined') ? SKINS.filter(function(s) { return !SKINS_BOUTIQUE.find(function(sb) { return sb.id === s.id; }); }).length : 2;
    var nbSkinsBoutique = (typeof SKINS_BOUTIQUE !== 'undefined') ? SKINS_BOUTIQUE.length : 0;
    var totalSkinsExistants = nbSkinsBase + nbSkinsBoutique;

    db.collection('players').get({ source: 'server' }).then(function(snap) {
      var joueurs = [];
      snap.forEach(function(doc) {
        var data = doc.data();
        data._id = doc.id;
        var pseudoLower = (data.pseudo || '').trim().toLowerCase();
        var estAdmin = pseudoLower === 'obstinate' || pseudoLower === 'obstinate2.0' || pseudoLower === 'chrikidd77';
        if (estAdmin) return; // Exclure les admins du classement skins
        var nbSkins = nbSkinsBase; // Tout le monde a les skins de base
        if (data.skinsAchetes && Array.isArray(data.skinsAchetes)) {
          nbSkins += data.skinsAchetes.length;
        } else if (data.skinsCount) {
          nbSkins += data.skinsCount;
        }
        if (data.pseudo && data.pseudo.trim()) {
          joueurs.push({ data: data, count: nbSkins });
        }
      });
      joueurs.sort(function(a, b) { return b.count - a.count; });
      joueurs = joueurs.slice(0, 20);
      if (joueurs.length === 0) {
        liste.innerHTML = '<div class="classement-vide">' + t('noLeaderboard') + '</div>';
        return;
      }
      liste.innerHTML = '';
      // Info total skins au-dessus du classement
      var info = document.createElement('div');
      info.className = 'classement-info-skins';
      info.textContent = totalSkinsExistants + ' skins disponibles (' + nbSkinsBase + ' gratuits + ' + nbSkinsBoutique + ' boutique)';
      liste.appendChild(info);
      joueurs.forEach(function(j, idx) {
        liste.appendChild(creerClassementItem(j.data, idx + 1, j.count + '/' + totalSkinsExistants));
      });
    }).catch(function(err) {
      console.error('Erreur classement skins:', err);
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
  item.appendChild(img);

  var pseudo = document.createElement('span');
  pseudo.className = 'classement-pseudo';
  pseudo.textContent = escapeHtml(data.pseudo || '???');
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
    // Statut en ligne / hors ligne
    var isOnline = data.online && data.lastSeen && (Date.now() - data.lastSeen.toDate().getTime() < 120000);
    var statutHtml = isOnline
      ? '<span class="profil-statut profil-en-ligne">&#9679; En ligne</span>'
      : '<span class="profil-statut profil-hors-ligne">&#9679; Hors ligne</span>';

    var lienProfil = window.location.origin + window.location.pathname + '?profil=' + encodeURIComponent(pseudo);
    headerEl.innerHTML = pfpHtml +
      '<div class="profil-info">' +
      '<span class="profil-pseudo">' + escapeHtml(pseudo) + '</span>' +
      statutHtml +
      '<span class="profil-niveau">' + t('level') + ' ' + niveauInfo.niveau + '</span>' +
      '<div class="profil-xp-bar"><div class="profil-xp-fill" style="width:' + pourcent + '%"></div></div>' +
      '<span class="profil-xp-text">' + niveauInfo.xpDansNiveau + ' / ' + niveauInfo.xpRequis + ' XP</span>' +
      '<button class="btn-copier-lien" onclick="copierLienProfil(\'' + lienProfil.replace(/'/g, "\\'") + '\')">Copier le lien du profil</button>' +
      '</div>';

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
      '<div class="profil-stat" style="grid-column:1/-1"><span class="profil-stat-val">' + winRate + '%</span><span class="profil-stat-label">' + t('winRate') + '</span></div>';
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
  // Chercher le joueur par pseudo dans Firebase
  if (typeof db === 'undefined') { setTimeout(checkProfilURL, 1000); return; }
  db.collection('players').where('pseudo', '==', profilPseudo).limit(1).get().then(function(snap) {
    if (!snap.empty) {
      ouvrirProfil(snap.docs[0].id);
    } else {
      showNotif('Joueur "' + profilPseudo + '" introuvable', 'warn');
    }
    // Nettoyer l'URL sans recharger
    window.history.replaceState({}, '', window.location.pathname);
  }).catch(function() {});
}
setTimeout(checkProfilURL, 2500);

// ============================
// MISE A JOUR DES STATS EN FIN DE PARTIE
// ============================
function incrementerStat(champ, valeur) {
  if (!monPlayerId) return;
  var update = {};
  update[champ] = firebase.firestore.FieldValue.increment(valeur || 1);
  db.collection('players').doc(monPlayerId).update(update).catch(function() {});
}

function enregistrerStatsFinPartie(gagnant) {
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

  // XP : defaite 10-100, victoire 100-250
  var xpGagne;
  if (aGagne) {
    xpGagne = 100 + Math.floor(Math.random() * 151);
  } else {
    xpGagne = 10 + Math.floor(Math.random() * 91);
  }
  ajouterXP(xpGagne);
}
