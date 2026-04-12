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
      var amiPfp = (amisStatuts[ami.uid] && amisStatuts[ami.uid].pfp) || PFP_DE_BASE;
      html += '<img class="ami-pfp" src="' + amiPfp + '" alt="pfp">';
      var amiAdminClass = isAdmin(ami.pseudo) ? ' pseudo-admin-text' : '';
      html += '<span class="ami-pseudo ' + (isOnline ? '' : 'offline-text') + amiAdminClass + '">' + escapeHtml(ami.pseudo) + '</span>';
      if (!isOnline && amisStatuts[ami.uid] && amisStatuts[ami.uid].lastSeen) {
        var dernierVu = formatDernierVu(amisStatuts[ami.uid].lastSeen);
        if (dernierVu) {
          html += '<span class="ami-last-seen">' + escapeHtml(dernierVu) + '</span>';
        }
      }
      html += '<button class="ami-btn-profil" onclick="ouvrirProfil(\'' + escapeOnclick(ami.uid) + '\')" title="Voir le profil">&#128100;</button>';
      if (isOnline) {
        html += '<button class="ami-btn-echange" onclick="proposerEchange(\'' + escapeOnclick(ami.uid) + '\', \'' + escapeOnclick(ami.pseudo) + '\')" title="Echanger un skin">&#128260;</button>';
      }
      // Bouton REJOINDRE si l'ami est dans un lobby
      var amiPartyId = (amisStatuts[ami.uid] && amisStatuts[ami.uid].currentPartyId) || '';
      if (isOnline && amiPartyId) {
        html += '<button class="ami-btn-rejoindre" onclick="rejoindrePartiAmi(\'' + escapeOnclick(ami.uid) + '\', \'' + escapeOnclick(amiPartyId) + '\')" title="Rejoindre la partie">REJOINDRE</button>';
      }
      if (isOnline) {
        html += '<button class="ami-btn-inviter" onclick="inviterAmi(\'' + escapeOnclick(ami.uid) + '\', \'' + escapeOnclick(ami.pseudo) + '\')">' + t('invite') + '</button>';
      }
      html += '<button class="ami-btn-supprimer" onclick="supprimerAmi(\'' + escapeOnclick(ami.uid) + '\', \'' + escapeOnclick(ami.pseudo) + '\')">&#10005;</button>';
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

function formatDernierVu(lastSeen) {
  if (!lastSeen) return '';
  var lastDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
  var diff = Date.now() - lastDate.getTime();
  // Plus de 3 semaines : juste "hors ligne"
  if (diff > 21 * 24 * 60 * 60 * 1000) return '';
  var minutes = Math.floor(diff / 60000);
  var heures = Math.floor(diff / 3600000);
  var jours = Math.floor(diff / 86400000);
  var semaines = Math.floor(diff / (7 * 86400000));
  if (semaines > 0) return t('lastSeenWeeks', semaines);
  if (jours > 0) return t('lastSeenDays', jours);
  if (heures > 0) return t('lastSeenHours', heures);
  if (minutes > 1) return t('lastSeenMinutes', minutes);
  return t('lastSeenMinutes', 1);
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
  // Verifier localement si deja ami
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
    // Envoyer la demande directement (verification locale deja faite)
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
  }).catch(function(err) {
    console.error('Erreur envoi demande ami:', err);
    showNotif(t('connectionError'), 'error');
  });
}

function accepterDemande(requestId, fromPlayerId, fromPseudo) {
  // Verifier si deja ami pour eviter les doublons
  var dejaAmi = mesAmis.some(function(a) { return a.uid === fromPlayerId; });
  if (dejaAmi) {
    // Juste supprimer la demande, on est deja amis
    db.collection('friendRequests').doc(requestId).update({ status: 'accepted' }).catch(function() {});
    showNotif(t('alreadyFriend'), 'warn');
    return;
  }
  // Batch write pour garantir l'atomicite
  var batch = db.batch();
  batch.update(db.collection('friendRequests').doc(requestId), { status: 'accepted' });
  var ref1 = db.collection('friends').doc();
  var ref2 = db.collection('friends').doc();
  var myPseudo = getPseudo();
  batch.set(ref1, { playerId: monPlayerId, friendPlayerId: fromPlayerId, friendPseudo: fromPseudo });
  batch.set(ref2, { playerId: fromPlayerId, friendPlayerId: monPlayerId, friendPseudo: myPseudo });
  batch.commit().then(function() {
    showNotif(t('nowYourFriend', fromPseudo), 'info');
  }).catch(function() {
    showNotif(t('connectionError'), 'error');
  });
}

function refuserDemande(requestId) {
  db.collection('friendRequests').doc(requestId).delete().then(function() {
    showNotif(t('requestRefused'), 'warn');
  }).catch(function() {});
}

function supprimerAmi(amiPlayerId, amiPseudo) {
  if (!confirm(t('confirmRemoveFriend', amiPseudo))) return;
  // Supprimer les deux enregistrements d'amitie (mon cote et le cote de l'ami)
  var batch = db.batch();
  var deleted = 0;
  // Mon enregistrement (playerId == moi, friendPlayerId == ami)
  db.collection('friends').where('playerId', '==', monPlayerId).where('friendPlayerId', '==', amiPlayerId).get().then(function(snap) {
    snap.forEach(function(doc) { batch.delete(doc.ref); deleted++; });
    // L'enregistrement de l'ami (playerId == ami, friendPlayerId == moi)
    return db.collection('friends').where('playerId', '==', amiPlayerId).where('friendPlayerId', '==', monPlayerId).get();
  }).then(function(snap) {
    snap.forEach(function(doc) { batch.delete(doc.ref); deleted++; });
    if (deleted > 0) return batch.commit();
  }).then(function() {
    showNotif(t('friendRemoved', amiPseudo), 'info');
  }).catch(function(err) {
    console.error('Erreur suppression ami:', err);
    showNotif(t('connectionError'), 'error');
  });
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
  if (window._amisStatutUnsubs) {
    window._amisStatutUnsubs.forEach(function(u) { if (u) u(); });
    window._amisStatutUnsubs = [];
  }

  // Demandes d'amis entrantes (un seul where, filtre status en JS)
  amisUnsubscribers.push(
    db.collection('friendRequests').where('toPlayerId', '==', monPlayerId).onSnapshot(function(snapshot) {
      demandesEnAttente = [];
      snapshot.forEach(function(doc) {
        var r = doc.data();
        if (r.status !== 'pending') return;
        demandesEnAttente.push({ id: doc.id, from: r.fromPlayerId, fromPseudo: r.fromPseudo, to: r.toPlayerId, toPseudo: r.toPseudo, status: r.status });
      });
      updateBadgeAmis();
      if (panelAmisOuvert && tabAmiActif === 'demandes') afficherDemandes();
      if (demandesEnAttente.length > ancienNbDemandes && !panelAmisOuvert) {
        var derniere = demandesEnAttente[demandesEnAttente.length - 1];
        showNotif(t('friendRequestFrom', derniere.fromPseudo), 'info');
      }
      ancienNbDemandes = demandesEnAttente.length;
    }, function(err) {
      console.error('Erreur listener demandes amis:', err);
    })
  );

  // Liste d'amis
  amisUnsubscribers.push(
    db.collection('friends').where('playerId', '==', monPlayerId).onSnapshot(function(snapshot) {
      mesAmis = [];
      var friendIds = [];
      var seen = {};
      snapshot.forEach(function(doc) {
        var f = doc.data();
        // Deduplication : ignorer les doublons par friendPlayerId
        if (seen[f.friendPlayerId]) return;
        seen[f.friendPlayerId] = true;
        mesAmis.push({ uid: f.friendPlayerId, pseudo: f.friendPseudo, online: false });
        friendIds.push(f.friendPlayerId);
      });
      // Nettoyer les anciens listeners de statut
      if (window._amisStatutUnsubs) {
        window._amisStatutUnsubs.forEach(function(u) { if (u) u(); });
      }
      window._amisStatutUnsubs = [];
      // Ecouter le statut en ligne de chaque ami en temps reel
      friendIds.forEach(function(fid) {
        var unsub = db.collection('players').doc(fid).onSnapshot(function(pDoc) {
          if (pDoc.exists) {
            var pData = pDoc.data();
            var ami = mesAmis.find(function(a) { return a.uid === fid; });
            // Verifier si lastSeen date de moins de 2 minutes
            var estEnLigne = pData.online || false;
            if (estEnLigne && pData.lastSeen && pData.lastSeen.toDate) {
              var diff = Date.now() - pData.lastSeen.toDate().getTime();
              if (diff > 2 * 60 * 1000) estEnLigne = false;
            }
            if (ami) ami.online = estEnLigne;
            amisStatuts[fid] = { online: estEnLigne, pseudo: pData.pseudo, lastSeen: pData.lastSeen || null, pfp: pData.pfp || '', currentPartyId: pData.currentPartyId || '', joinMode: pData.joinMode || 'demande' };
          }
          if (panelAmisOuvert && tabAmiActif !== 'demandes') afficherAmis();
        });
        window._amisStatutUnsubs.push(unsub);
      });
      if (friendIds.length === 0 && panelAmisOuvert && tabAmiActif !== 'demandes') afficherAmis();
    }, function(err) {
      console.error('Erreur listener amis:', err);
    })
  );

  // Invitations de partie (un seul where, filtre status en JS)
  amisUnsubscribers.push(
    db.collection('gameInvites').where('toPlayerId', '==', monPlayerId).onSnapshot(function(snapshot) {
      snapshot.forEach(function(doc) {
        var inv = doc.data();
        if (inv.status !== 'pending') return;
        if (!invitationsAffichees[doc.id]) {
          invitationsAffichees[doc.id] = true;
          afficherInvitation(doc.id, inv.fromPseudo, inv.partyId);
        }
      });
    }, function(err) {
      console.error('Erreur listener invitations:', err);
    })
  );
}

// ============================
// REJOINDRE LA PARTIE D'UN AMI
// ============================
function rejoindrePartiAmi(amiUid, partyId) {
  if (!partyId) { showNotif('Cet ami n\'est pas dans une partie.', 'warn'); return; }
  // Verifier le mode de join de l'ami (demande ou sans demande)
  var amiStatut = amisStatuts[amiUid];
  var joinMode = (amiStatut && amiStatut.joinMode) || 'demande';
  if (joinMode === 'libre') {
    // Rejoindre directement
    if (typeof rejoindrePartie === 'function') rejoindrePartie(partyId);
  } else {
    // Envoyer une demande de join
    db.collection('gameInvites').add({
      fromPlayerId: monPlayerId,
      fromPseudo: getPseudo(),
      toPlayerId: amiUid,
      partyId: partyId,
      type: 'joinRequest',
      status: 'pending',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      showNotif('Demande envoyee !', 'info');
    }).catch(function() {
      showNotif('Erreur', 'warn');
    });
  }
}

// ============================
// SYSTEME D'INVITATION EN PARTIE
// ============================
var invitationActuelle = null;
var fileInvitations = [];

var _lastInviteTime = 0;
function inviterAmi(amiPlayerId, amiPseudo) {
  if (!partieActuelleId) {
    showNotif(t('mustBeInGame'), 'warn');
    return;
  }
  var now = Date.now();
  var cooldown = 15000; // 15 secondes
  if (now - _lastInviteTime < cooldown) {
    var reste = Math.ceil((cooldown - (now - _lastInviteTime)) / 1000);
    showNotif('Attends ' + reste + 's avant de reinviter', 'warn');
    return;
  }
  _lastInviteTime = now;
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
  // Si une invitation est deja affichee, mettre en file d'attente
  if (invitationActuelle) {
    fileInvitations.push({ id: inviteId, fromPseudo: fromPseudo, partyId: partyId });
    return;
  }
  invitationActuelle = { id: inviteId, partyId: partyId };
  var popup = document.getElementById('popup-invitation');
  var texte = document.getElementById('invitation-texte');
  if (popup && texte) {
    texte.textContent = t('inviteToJoin', fromPseudo);
    popup.style.display = 'block';
  }
}

function afficherProchaineInvitation() {
  if (fileInvitations.length === 0) return;
  var next = fileInvitations.shift();
  invitationActuelle = { id: next.id, partyId: next.partyId };
  var popup = document.getElementById('popup-invitation');
  var texte = document.getElementById('invitation-texte');
  if (popup && texte) {
    texte.textContent = t('inviteToJoin', next.fromPseudo);
    popup.style.display = 'block';
  }
}

function accepterInvitation() {
  if (!invitationActuelle) return;
  var partyId = invitationActuelle.partyId;
  var inviteId = invitationActuelle.id;
  document.getElementById('popup-invitation').style.display = 'none';
  invitationActuelle = null;
  rejoindrePartie(partyId);
  db.collection('gameInvites').doc(inviteId).update({ status: 'accepted' }).catch(function() {});
  afficherProchaineInvitation();
}

function refuserInvitation() {
  if (!invitationActuelle) return;
  db.collection('gameInvites').doc(invitationActuelle.id).update({ status: 'declined' }).catch(function() {});
  document.getElementById('popup-invitation').style.display = 'none';
  invitationActuelle = null;
  afficherProchaineInvitation();
}
