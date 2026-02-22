// ============================
// SYSTEME D'AMIS - Fonctions
// ============================

function togglePanelAmis() {
  panelAmisOuvert = !panelAmisOuvert;
  var panel = document.getElementById('panel-amis');
  if (panelAmisOuvert) {
    panel.classList.remove('panel-amis-ferme');
    panel.classList.add('panel-amis-ouvert');
    rafraichirPanelAmis();
  } else {
    panel.classList.remove('panel-amis-ouvert');
    panel.classList.add('panel-amis-ferme');
  }
}

function switchTabAmi(tab) {
  tabAmiActif = tab;
  document.querySelectorAll('.tab-ami').forEach(function(t) { t.classList.remove('active'); });
  var tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.add('active');
  rafraichirPanelAmis();
}

function rafraichirPanelAmis() {
  if (tabAmiActif === 'demandes') {
    afficherDemandes();
  } else {
    afficherAmis();
  }
}

function afficherAmis() {
  var contenu = document.getElementById('panel-amis-contenu');
  if (!contenu) return;
  var filtreOnline = (tabAmiActif === 'en-ligne');
  var html = '';
  var amisFiltres = mesAmis.filter(function(a) {
    var statut = amisStatuts[a.uid];
    if (filtreOnline) return statut && statut.online;
    return !statut || !statut.online;
  });

  if (amisFiltres.length === 0) {
    html = '<div class="panel-amis-vide">' +
      (filtreOnline ? t('noFriendsOnline') : t('noFriendsOffline')) +
      '</div>';
  } else {
    amisFiltres.forEach(function(ami) {
      var isOnline = amisStatuts[ami.uid] && amisStatuts[ami.uid].online;
      html += '<div class="ami-item">';
      html += '<div class="ami-statut-dot ' + (isOnline ? 'online' : 'offline') + '"></div>';
      html += '<span class="ami-pseudo ' + (isOnline ? '' : 'offline-text') + '">' + escapeHtml(ami.pseudo) + '</span>';
      if (isOnline) {
        html += '<button class="ami-btn-inviter" onclick="inviterAmi(\'' + escapeOnclick(ami.uid) + '\', \'' + escapeOnclick(ami.pseudo) + '\')">INVITER</button>';
      }
      html += '</div>';
    });
  }
  contenu.innerHTML = html;
}

function afficherDemandes() {
  var contenu = document.getElementById('panel-amis-contenu');
  if (!contenu) return;
  if (demandesEnAttente.length === 0) {
    contenu.innerHTML = '<div class="panel-amis-vide">' + t('noPendingRequests') + '</div>';
    return;
  }
  var html = '';
  demandesEnAttente.forEach(function(demande) {
    html += '<div class="demande-item">';
    html += '<span class="demande-pseudo">' + escapeHtml(demande.fromPseudo) + '</span>';
    html += '<button class="demande-btn-accepter" onclick="accepterDemande(\'' + escapeOnclick(demande.id) + '\', \'' + escapeOnclick(demande.from) + '\', \'' + escapeOnclick(demande.fromPseudo) + '\')">ACCEPTER</button>';
    html += '<button class="demande-btn-refuser" onclick="refuserDemande(\'' + escapeOnclick(demande.id) + '\')">REFUSER</button>';
    html += '</div>';
  });
  contenu.innerHTML = html;
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Echapper pour utilisation dans un onclick="func('...')"
function escapeOnclick(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function updateBadgeAmis() {
  var badge = document.getElementById('badge-amis');
  var countEl = document.getElementById('count-demandes');
  if (badge) {
    if (demandesEnAttente.length > 0) {
      badge.style.display = 'flex';
      badge.textContent = demandesEnAttente.length;
    } else {
      badge.style.display = 'none';
    }
  }
  if (countEl) {
    countEl.textContent = demandesEnAttente.length > 0 ? demandesEnAttente.length : '';
  }
}

function envoyerDemandeAmi() {
  var input = document.getElementById('input-recherche-ami');
  var pseudo = input.value.trim();
  if (!pseudo) { showNotif(t('enterPseudo'), 'warn'); return; }
  if (pseudo === getPseudo()) {
    showNotif(t('cantAddSelf'), 'warn');
    return;
  }
  var dejaAmi = mesAmis.some(function(a) { return a.pseudo === pseudo; });
  if (dejaAmi) {
    showNotif(t('alreadyFriend'), 'warn');
    return;
  }
  // Chercher le joueur cible par pseudo
  db.collection('players').where('pseudo', '==', pseudo).limit(1).get().then(function(snap) {
    if (snap.empty) { showNotif(t('pseudoNotFound'), 'error'); return; }
    var target = snap.docs[0].data();
    if (target.playerId === monPlayerId) { showNotif(t('cantAddSelf'), 'warn'); return; }
    // Verifier si deja amis
    return db.collection('friends').where('playerId', '==', monPlayerId).where('friendPlayerId', '==', target.playerId).limit(1).get().then(function(friendSnap) {
      if (!friendSnap.empty) { showNotif(t('alreadyFriend'), 'warn'); return; }
      // Verifier si demande deja envoyee
      return db.collection('friendRequests').where('fromPlayerId', '==', monPlayerId).where('toPlayerId', '==', target.playerId).limit(1).get().then(function(reqSnap) {
        if (!reqSnap.empty) { showNotif(t('requestAlreadySent'), 'warn'); return; }
        // Envoyer la demande
        return db.collection('friendRequests').add({
          fromPlayerId: monPlayerId,
          fromPseudo: getPseudo(),
          toPlayerId: target.playerId,
          toPseudo: pseudo,
          status: 'pending'
        }).then(function() {
          showNotif(t('requestSentTo', pseudo), 'info');
          input.value = '';
        });
      });
    });
  }).catch(function() {
    showNotif(t('connectionError'), 'error');
  });
}

function accepterDemande(requestId, fromPlayerId, fromPseudo) {
  db.collection('friendRequests').doc(requestId).update({ status: 'accepted' }).then(function() {
    // Creer la relation bidirectionnelle
    var myPseudo = getPseudo();
    db.collection('friends').add({ playerId: monPlayerId, friendPlayerId: fromPlayerId, friendPseudo: fromPseudo });
    db.collection('friends').add({ playerId: fromPlayerId, friendPlayerId: monPlayerId, friendPseudo: myPseudo });
    showNotif(t('nowYourFriend', fromPseudo), 'info');
  }).catch(function() {});
}

function refuserDemande(requestId) {
  db.collection('friendRequests').doc(requestId).delete().then(function() {
    showNotif(t('requestRefused'), 'warn');
  }).catch(function() {});
}

function chargerStatutAmis() {
  if (panelAmisOuvert && tabAmiActif !== 'demandes') {
    afficherAmis();
  }
}

// ============================
// SYSTEME D'AMIS - Listeners Firebase
// ============================

var amisUnsubscribers = [];

function initAmisListeners() {
  // Nettoyer les anciens listeners
  amisUnsubscribers.forEach(function(unsub) { if (unsub) unsub(); });
  amisUnsubscribers = [];

  // Demandes d'amis entrantes
  amisUnsubscribers.push(
    db.collection('friendRequests').where('toPlayerId', '==', monPlayerId).where('status', '==', 'pending').onSnapshot(function(snapshot) {
      demandesEnAttente = [];
      snapshot.forEach(function(doc) {
        var r = doc.data();
        demandesEnAttente.push({ id: doc.id, from: r.fromPlayerId, fromPseudo: r.fromPseudo, to: r.toPlayerId, toPseudo: r.toPseudo, status: r.status });
      });
      updateBadgeAmis();
      if (panelAmisOuvert && tabAmiActif === 'demandes') afficherDemandes();
      if (demandesEnAttente.length > ancienNbDemandes && !panelAmisOuvert) {
        var derniere = demandesEnAttente[demandesEnAttente.length - 1];
        showNotif(t('friendRequestFrom', derniere.fromPseudo), 'info');
      }
      ancienNbDemandes = demandesEnAttente.length;
    })
  );

  // Liste d'amis
  amisUnsubscribers.push(
    db.collection('friends').where('playerId', '==', monPlayerId).onSnapshot(function(snapshot) {
      mesAmis = [];
      var friendIds = [];
      snapshot.forEach(function(doc) {
        var f = doc.data();
        mesAmis.push({ uid: f.friendPlayerId, pseudo: f.friendPseudo, online: false });
        friendIds.push(f.friendPlayerId);
      });
      // Charger les statuts en ligne
      friendIds.forEach(function(fid) {
        db.collection('players').doc(fid).get().then(function(pDoc) {
          if (pDoc.exists) {
            var pData = pDoc.data();
            var ami = mesAmis.find(function(a) { return a.uid === fid; });
            if (ami) ami.online = pData.online || false;
            amisStatuts[fid] = { online: pData.online || false, pseudo: pData.pseudo };
          }
          if (panelAmisOuvert && tabAmiActif !== 'demandes') afficherAmis();
        });
      });
      if (friendIds.length === 0 && panelAmisOuvert && tabAmiActif !== 'demandes') afficherAmis();
    })
  );

  // Invitations de partie
  amisUnsubscribers.push(
    db.collection('gameInvites').where('toPlayerId', '==', monPlayerId).where('status', '==', 'pending').onSnapshot(function(snapshot) {
      snapshot.forEach(function(doc) {
        var inv = doc.data();
        if (!invitationsAffichees[doc.id]) {
          invitationsAffichees[doc.id] = true;
          afficherInvitation(doc.id, inv.fromPseudo, inv.partyId);
        }
      });
    })
  );
}

// ============================
// SYSTEME D'INVITATION EN PARTIE
// ============================
var invitationActuelle = null;

function inviterAmi(amiPlayerId, amiPseudo) {
  if (!partieActuelleId) {
    showNotif(t('mustBeInGame'), 'warn');
    return;
  }
  db.collection('gameInvites').add({
    fromPlayerId: monPlayerId,
    fromPseudo: getPseudo(),
    toPlayerId: amiPlayerId,
    partyId: partieActuelleId,
    status: 'pending'
  }).then(function() {
    showNotif(t('inviteSentTo', amiPseudo), 'info');
  }).catch(function() {});
}

function afficherInvitation(inviteId, fromPseudo, partyId) {
  invitationActuelle = { id: inviteId, partyId: partyId };
  var popup = document.getElementById('popup-invitation');
  var texte = document.getElementById('invitation-texte');
  if (popup && texte) {
    texte.textContent = t('inviteToJoin', fromPseudo);
    popup.style.display = 'block';
  }
}

function accepterInvitation() {
  if (!invitationActuelle) return;
  db.collection('gameInvites').doc(invitationActuelle.id).update({ status: 'accepted' }).then(function() {
    rejoindrePartie(invitationActuelle.partyId);
  }).catch(function() {});
  document.getElementById('popup-invitation').style.display = 'none';
  invitationActuelle = null;
}

function refuserInvitation() {
  if (!invitationActuelle) return;
  db.collection('gameInvites').doc(invitationActuelle.id).update({ status: 'declined' }).catch(function() {});
  document.getElementById('popup-invitation').style.display = 'none';
  invitationActuelle = null;
}
