// ============================
// SYSTEME DE COMMENTAIRES
// ============================
var _commentairesUnsub = null;
var _commentTimestamps = [];
var COMMENT_MAX_MSG = 2;
var COMMENT_COOLDOWN = 10000;
var COMMENT_MAX_LENGTH = 300;
var _replyToId = null;
var _replyToPseudo = null;

function ouvrirCommentaires() {
  document.getElementById('popup-commentaires').classList.add('visible');
  chargerCommentaires();
  if (typeof navigateTo === 'function') navigateTo('/comments/');
}

function fermerCommentaires() {
  document.getElementById('popup-commentaires').classList.remove('visible');
  // Revenir a l'URL du menu principal
  if (typeof navigateTo === 'function' && typeof getRoutePath === 'function' && getRoutePath() === '/comments/') {
    navigateTo('/', true);
  }
  if (_commentairesUnsub) {
    _commentairesUnsub();
    _commentairesUnsub = null;
  }
  annulerReponse();
}

function chercherProfilParPseudo(pseudo) {
  db.collection('players').where('pseudo', '==', pseudo).limit(1).get().then(function(snap) {
    if (snap.empty) {
      showNotif(t('accountNotFound'), 'warn');
      return;
    }
    var playerId = snap.docs[0].id;
    ouvrirProfilJoueur(playerId);
  }).catch(function() {});
}

function repondreA(commentId, pseudo) {
  _replyToId = commentId;
  _replyToPseudo = pseudo;
  var input = document.getElementById('input-commentaire');
  if (input) {
    input.value = '@' + pseudo + ' ';
    input.focus();
  }
  // Afficher le bandeau de reponse
  var bandeau = document.getElementById('commentaire-reply-bar');
  if (bandeau) {
    bandeau.style.display = 'flex';
    bandeau.querySelector('.reply-bar-pseudo').textContent = pseudo;
  }
}

function annulerReponse() {
  _replyToId = null;
  _replyToPseudo = null;
  var bandeau = document.getElementById('commentaire-reply-bar');
  if (bandeau) bandeau.style.display = 'none';
}

function chargerCommentaires() {
  if (_commentairesUnsub) _commentairesUnsub();
  var liste = document.getElementById('commentaires-liste');
  if (liste) liste.innerHTML = '<div class="spinner"></div>';
  _commentairesUnsub = db.collection('comments')
    .orderBy('date', 'asc')
    .limit(100)
    .onSnapshot(function(snap) {
      var liste = document.getElementById('commentaires-liste');
      if (!liste) return;
      if (snap.empty) {
        liste.innerHTML = '<div class="commentaires-vide">Aucun commentaire pour le moment.</div>';
        return;
      }

      // Separer commentaires principaux et reponses
      var tousLesCommentaires = [];
      snap.forEach(function(doc) {
        var data = doc.data();
        data._id = doc.id;
        tousLesCommentaires.push(data);
      });

      var principaux = tousLesCommentaires.filter(function(c) { return !c.replyTo; });
      var reponses = {};
      tousLesCommentaires.forEach(function(c) {
        if (c.replyTo) {
          if (!reponses[c.replyTo]) reponses[c.replyTo] = [];
          reponses[c.replyTo].push(c);
        }
      });

      liste.innerHTML = '';

      // Afficher du plus recent au plus ancien
      for (var i = principaux.length - 1; i >= 0; i--) {
        var data = principaux[i];
        var item = creerCommentaireElement(data);
        liste.appendChild(item);

        // Afficher les reponses
        var reps = reponses[data._id];
        if (reps && reps.length > 0) {
          for (var r = 0; r < reps.length; r++) {
            var repItem = creerCommentaireElement(reps[r], true);
            liste.appendChild(repItem);
          }
        }
      }
    });
}

function creerCommentaireElement(data, estReponse) {
  var item = document.createElement('div');
  item.className = 'commentaire-item' + (estReponse ? ' commentaire-reponse' : '');

  var header = document.createElement('div');
  header.className = 'commentaire-header';

  var gauche = document.createElement('div');
  gauche.style.display = 'flex';
  gauche.style.alignItems = 'center';
  gauche.style.gap = '8px';
  gauche.style.cursor = 'pointer';
  gauche.onclick = (function(pid) {
    return function() { ouvrirProfilJoueur(pid); };
  })(data.playerId);

  // Photo de profil
  if (data.pfp) {
    var img = document.createElement('img');
    img.src = data.pfp;
    img.style.width = '28px';
    img.style.height = '28px';
    img.style.borderRadius = '50%';
    img.style.objectFit = 'cover';
    img.style.border = '2px solid #f39c12';
    gauche.appendChild(img);
  } else {
    var avatar = document.createElement('div');
    avatar.style.width = '28px';
    avatar.style.height = '28px';
    avatar.style.borderRadius = '50%';
    avatar.style.background = '#34495e';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '14px';
    avatar.textContent = '?';
    gauche.appendChild(avatar);
  }

  var pseudo = document.createElement('span');
  pseudo.className = 'commentaire-pseudo';
  pseudo.textContent = escapeHtml(data.pseudo || '???');
  gauche.appendChild(pseudo);

  header.appendChild(gauche);

  var droite = document.createElement('div');
  droite.style.display = 'flex';
  droite.style.alignItems = 'center';
  droite.style.gap = '6px';

  var dateSpan = document.createElement('span');
  dateSpan.className = 'commentaire-date';
  if (data.date) {
    var d = data.date.toDate ? data.date.toDate() : new Date(data.date);
    dateSpan.textContent = d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
  }
  droite.appendChild(dateSpan);

  // Bouton repondre
  var btnRepondre = document.createElement('button');
  btnRepondre.className = 'commentaire-repondre';
  btnRepondre.textContent = t('reply');
  btnRepondre.onclick = (function(id, p) {
    return function(e) {
      e.stopPropagation();
      repondreA(id, p);
    };
  })(data.replyTo ? data.replyTo : data._id, data.pseudo);
  droite.appendChild(btnRepondre);

  // Bouton supprimer pour admin ou auteur
  if (isAdmin() || data.playerId === monPlayerId) {
    var btnSuppr = document.createElement('button');
    btnSuppr.className = 'commentaire-supprimer';
    btnSuppr.innerHTML = '&times;';
    btnSuppr.title = 'Supprimer';
    btnSuppr.onclick = (function(docId) {
      return function() {
        if (confirm('Supprimer ce commentaire ?')) {
          db.collection('comments').doc(docId).delete().catch(function() {});
        }
      };
    })(data._id);
    droite.appendChild(btnSuppr);
  }

  header.appendChild(droite);
  item.appendChild(header);

  // Afficher le @mention en debut de reponse
  var texte = document.createElement('div');
  texte.className = 'commentaire-texte';
  var msgTexte = escapeHtml(filtrerMessage(data.message || ''));
  // Mettre en surbrillance les @mentions (cliquables)
  msgTexte = msgTexte.replace(/@(\S+)/g, '<span class="commentaire-mention" onclick="chercherProfilParPseudo(\'$1\')">@$1</span>');
  texte.innerHTML = msgTexte;
  item.appendChild(texte);

  return item;
}

function envoyerCommentaire() {
  var input = document.getElementById('input-commentaire');
  var message = input ? input.value.trim() : '';
  if (!message) return;
  if (message.length > COMMENT_MAX_LENGTH) {
    showNotif('Message trop long (max ' + COMMENT_MAX_LENGTH + ' caracteres)', 'warn');
    return;
  }

  // Anti-spam
  var now = Date.now();
  _commentTimestamps = _commentTimestamps.filter(function(t) { return now - t < COMMENT_COOLDOWN; });
  if (_commentTimestamps.length >= COMMENT_MAX_MSG) {
    showNotif('Attendez avant de poster un autre commentaire.', 'warn');
    return;
  }
  _commentTimestamps.push(now);

  var pseudo = getPseudo();
  if (!pseudo) {
    showNotif('Connectez-vous pour commenter.', 'warn');
    return;
  }

  var pfp = localStorage.getItem('virusPfp') || '';

  var messageEmoji = (typeof convertirEmojis === 'function') ? convertirEmojis(message) : message;
  var commentData = {
    pseudo: pseudo,
    playerId: monPlayerId,
    message: messageEmoji,
    pfp: pfp,
    date: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Si c'est une reponse
  if (_replyToId) {
    commentData.replyTo = _replyToId;
  }

  db.collection('comments').add(commentData).then(function() {
    input.value = '';
    annulerReponse();
  }).catch(function() {
    showNotif('Erreur lors de l\'envoi.', 'error');
  });
}
