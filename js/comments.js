// ============================
// SYSTEME DE COMMENTAIRES
// ============================
var _commentairesUnsub = null;
var _commentTimestamps = [];
var COMMENT_MAX_MSG = 2;
var COMMENT_COOLDOWN = 10000;
var COMMENT_MAX_LENGTH = 300;

function ouvrirCommentaires() {
  showNotif(t('commentsNotReady'), 'warn');
  return;
}

function fermerCommentaires() {
  document.getElementById('popup-commentaires').classList.remove('visible');
  if (_commentairesUnsub) {
    _commentairesUnsub();
    _commentairesUnsub = null;
  }
}

function chargerCommentaires() {
  if (_commentairesUnsub) _commentairesUnsub();
  _commentairesUnsub = db.collection('comments')
    .orderBy('date', 'desc')
    .limit(50)
    .onSnapshot(function(snap) {
      var liste = document.getElementById('commentaires-liste');
      if (!liste) return;
      if (snap.empty) {
        liste.innerHTML = '<div class="commentaires-vide">Aucun commentaire pour le moment.</div>';
        return;
      }
      liste.innerHTML = '';
      snap.forEach(function(doc) {
        var data = doc.data();
        var item = document.createElement('div');
        item.className = 'commentaire-item';

        var header = document.createElement('div');
        header.className = 'commentaire-header';

        var gauche = document.createElement('div');
        gauche.style.display = 'flex';
        gauche.style.alignItems = 'center';
        gauche.style.gap = '8px';

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
          })(doc.id);
          droite.appendChild(btnSuppr);
        }

        header.appendChild(droite);
        item.appendChild(header);

        var texte = document.createElement('div');
        texte.className = 'commentaire-texte';
        texte.textContent = escapeHtml(filtrerMessage(data.message || ''));
        item.appendChild(texte);

        liste.appendChild(item);
      });
    });
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

  db.collection('comments').add({
    pseudo: pseudo,
    playerId: monPlayerId,
    message: message,
    pfp: pfp,
    date: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    input.value = '';
  }).catch(function() {
    showNotif('Erreur lors de l\'envoi.', 'error');
  });
}
