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
  liste.innerHTML = '<div class="classement-vide">...</div>';

  db.collection('players')
    .where(champ, '>', 0)
    .orderBy(champ, 'desc')
    .limit(20)
    .get()
    .then(function(snap) {
      if (snap.empty) {
        liste.innerHTML = '<div class="classement-vide">' + t('noLeaderboard') + '</div>';
        return;
      }
      liste.innerHTML = '';
      var rang = 0;
      snap.forEach(function(doc) {
        rang++;
        var data = doc.data();
        var item = document.createElement('div');
        item.className = 'classement-item';
        if (rang === 1) item.classList.add('top1');
        else if (rang === 2) item.classList.add('top2');
        else if (rang === 3) item.classList.add('top3');

        var rangEl = document.createElement('div');
        rangEl.className = 'classement-rang';
        rangEl.textContent = rang;
        item.appendChild(rangEl);

        if (data.pfp) {
          var img = document.createElement('img');
          img.className = 'classement-pfp';
          img.src = data.pfp;
          item.appendChild(img);
        } else {
          var placeholder = document.createElement('div');
          placeholder.className = 'classement-pfp';
          placeholder.style.background = '#34495e';
          placeholder.style.display = 'flex';
          placeholder.style.alignItems = 'center';
          placeholder.style.justifyContent = 'center';
          placeholder.style.fontSize = '16px';
          placeholder.textContent = '?';
          item.appendChild(placeholder);
        }

        var pseudo = document.createElement('span');
        pseudo.className = 'classement-pseudo';
        pseudo.textContent = escapeHtml(data.pseudo || '???');
        item.appendChild(pseudo);

        var val = document.createElement('span');
        val.className = 'classement-val';
        val.textContent = data[champ] || 0;
        item.appendChild(val);

        liste.appendChild(item);
      });
    })
    .catch(function(err) {
      console.error('Erreur classement:', err);
      liste.innerHTML = '<div class="classement-vide">' + t('connectionError') + '</div>';
    });
}

// ============================
// PROFIL JOUEUR
// ============================
function ouvrirProfil() {
  document.getElementById('popup-profil').classList.add('visible');
  chargerProfil();
}

function fermerProfil() {
  document.getElementById('popup-profil').classList.remove('visible');
}

function chargerProfil() {
  var headerEl = document.getElementById('profil-header');
  var statsEl = document.getElementById('profil-stats');
  if (!headerEl || !statsEl) return;

  var pseudo = getPseudo() || '???';
  var pfp = localStorage.getItem('virusPfp') || '';

  // Header
  var pfpHtml = pfp
    ? '<img class="profil-pfp" src="' + pfp + '" alt="PFP">'
    : '<div class="profil-pfp-placeholder">?</div>';
  headerEl.innerHTML = pfpHtml +
    '<div class="profil-info">' +
    '<span class="profil-pseudo">' + escapeHtml(pseudo) + '</span>' +
    '</div>';

  // Stats depuis Firebase
  statsEl.innerHTML = '<div class="classement-vide">...</div>';
  db.collection('players').doc(monPlayerId).get().then(function(doc) {
    if (!doc.exists) {
      statsEl.innerHTML = '<div class="classement-vide">' + t('accountNotFound') + '</div>';
      return;
    }
    var data = doc.data();
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
// MISE A JOUR DES STATS EN FIN DE PARTIE
// ============================
function incrementerStat(champ, valeur) {
  if (!monPlayerId) return;
  var update = {};
  update[champ] = firebase.firestore.FieldValue.increment(valeur || 1);
  db.collection('players').doc(monPlayerId).update(update).catch(function() {});
}

function enregistrerStatsFinPartie(gagnant) {
  // Parties jouees
  incrementerStat('gamesPlayed');

  // Mort ?
  var pseudo = getPseudo() || '';
  if (joueursElimines.indexOf(pseudo) >= 0) {
    incrementerStat('deaths');
  }

  // Victoire ?
  var aGagne = false;
  if (gagnant === 'virus' && monRole === 'virus') aGagne = true;
  if (gagnant === 'virus' && monRole === 'espion' && espionCamp === 'virus') aGagne = true;
  if ((gagnant === 'innocents' || gagnant === 'missions') && (monRole === 'innocent' || monRole === 'journaliste')) aGagne = true;
  if ((gagnant === 'innocents' || gagnant === 'missions') && monRole === 'espion' && espionCamp === 'innocent') aGagne = true;
  if (gagnant === 'fanatique' && monRole === 'fanatique') aGagne = true;

  if (aGagne) {
    incrementerStat('wins');
  }
}
