// ============================
// SALON GROUP : groupes d'amis dans le salon (style Fortnite)
// ============================
// Permet d'inviter des amis dans son salon pour qu'ils apparaissent
// cote-a-cote en attendant de lancer une partie ensemble.
//
// Structure Firestore :
//   salonGroups/{groupId}
//     - hostId: string
//     - members: array of { playerId, pseudo, skin, pet, joinedAt }
//     - maxSize: 6
//     - createdAt: serverTimestamp

var SALON_GROUP_MAX = 6;
var _monGroupeId = null;
var _monGroupeListenerUnsub = null;
var _monGroupeData = null;

// === Crée un nouveau groupe avec moi comme host (et envoie l'invitation a un ami) ===
function inviterAmiAuSalonGroup(amiPlayerId, amiPseudo) {
  if (typeof db === 'undefined' || !monPlayerId) return;
  // Si je suis deja dans un groupe, juste envoyer l'invite a l'ami
  if (_monGroupeId) {
    envoyerInvitationGroupe(_monGroupeId, amiPlayerId, amiPseudo);
    return;
  }
  // Sinon, creer un groupe avec moi comme host
  var monMember = {
    playerId: monPlayerId,
    pseudo: getPseudo() || '',
    skin: (typeof getSkinFichier === 'function' && typeof getSkin === 'function') ? getSkinFichier(getSkin()) : '',
    pet: (typeof getPetEquipe === 'function') ? getPetEquipe() : '',
    joinedAt: Date.now()
  };
  db.collection('salonGroups').add({
    hostId: monPlayerId,
    members: [monMember],
    maxSize: SALON_GROUP_MAX,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(docRef) {
    _monGroupeId = docRef.id;
    listenMonGroupe(_monGroupeId);
    envoyerInvitationGroupe(_monGroupeId, amiPlayerId, amiPseudo);
  }).catch(function(err) {
    console.error('Erreur creation groupe', err);
    showNotif('Erreur creation du groupe', 'error');
  });
}

// === Envoie l'invitation Firestore ===
function envoyerInvitationGroupe(groupId, amiPlayerId, amiPseudo) {
  db.collection('salonGroupInvites').add({
    fromPlayerId: monPlayerId,
    fromPseudo: getPseudo(),
    toPlayerId: amiPlayerId,
    groupId: groupId,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    showNotif('Invitation envoyee a ' + amiPseudo, 'info');
  }).catch(function() {
    showNotif('Erreur invitation', 'error');
  });
}

// === Listener pour mon groupe (rafraichir UI si change) ===
function listenMonGroupe(groupId) {
  if (_monGroupeListenerUnsub) { try { _monGroupeListenerUnsub(); } catch(e) {} }
  _monGroupeListenerUnsub = db.collection('salonGroups').doc(groupId).onSnapshot(function(doc) {
    if (!doc.exists) {
      _monGroupeId = null;
      _monGroupeData = null;
      if (typeof salonRafraichir === 'function') salonRafraichir();
      return;
    }
    _monGroupeData = doc.data();
    // Si je ne suis plus dans la liste des membres, sortir
    var stillIn = (_monGroupeData.members || []).some(function(m) { return m.playerId === monPlayerId; });
    if (!stillIn) {
      _monGroupeId = null;
      _monGroupeData = null;
    }
    if (typeof salonRafraichir === 'function') salonRafraichir();
  }, function() {});
}

// === Toggle prêt/pas prêt pour moi ===
function toggleMaPrete() {
  if (!_monGroupeId || !_monGroupeData || typeof db === 'undefined') return;
  var groupId = _monGroupeId;
  db.runTransaction(function(transaction) {
    var ref = db.collection('salonGroups').doc(groupId);
    return transaction.get(ref).then(function(doc) {
      if (!doc.exists) return;
      var data = doc.data();
      var newMembers = (data.members || []).map(function(m) {
        if (m.playerId === monPlayerId) {
          return Object.assign({}, m, { ready: !m.ready });
        }
        return m;
      });
      transaction.update(ref, { members: newMembers });
    });
  }).catch(function() {
    showNotif('Erreur changement etat', 'error');
  });
}

// === Verifier si tous les membres sont prets ===
function tousLesMembresPrets() {
  if (!_monGroupeData || !_monGroupeData.members) return true;
  return _monGroupeData.members.every(function(m) { return !!m.ready; });
}

// === Quitter le groupe (bouton rouge) ===
function quitterSalonGroup() {
  if (!_monGroupeId || typeof db === 'undefined') return;
  var groupId = _monGroupeId;
  db.runTransaction(function(transaction) {
    var ref = db.collection('salonGroups').doc(groupId);
    return transaction.get(ref).then(function(doc) {
      if (!doc.exists) return;
      var data = doc.data();
      var newMembers = (data.members || []).filter(function(m) { return m.playerId !== monPlayerId; });
      if (newMembers.length <= 1) {
        // Si <=1 membre restant, supprimer le groupe
        transaction.delete(ref);
      } else {
        // Sinon, retirer juste moi (et eventuellement changer de host)
        var update = { members: newMembers };
        if (data.hostId === monPlayerId) {
          update.hostId = newMembers[0].playerId;
        }
        transaction.update(ref, update);
      }
    });
  }).then(function() {
    if (_monGroupeListenerUnsub) { try { _monGroupeListenerUnsub(); } catch(e) {} _monGroupeListenerUnsub = null; }
    _monGroupeId = null;
    _monGroupeData = null;
    if (typeof salonRafraichir === 'function') salonRafraichir();
    showNotif('Tu as quitte le groupe', 'info');
  }).catch(function() {
    showNotif('Erreur en quittant', 'error');
  });
}

// === Accepter une invitation a un groupe ===
function accepterInvitationSalonGroup(inviteId, groupId) {
  if (typeof db === 'undefined' || !monPlayerId) return;
  // Quitter mon groupe actuel si j'en avais un
  if (_monGroupeId && _monGroupeId !== groupId) {
    quitterSalonGroup();
  }
  // Ajouter aux membres du nouveau groupe
  var monMember = {
    playerId: monPlayerId,
    pseudo: getPseudo() || '',
    skin: (typeof getSkinFichier === 'function' && typeof getSkin === 'function') ? getSkinFichier(getSkin()) : '',
    pet: (typeof getPetEquipe === 'function') ? getPetEquipe() : '',
    joinedAt: Date.now()
  };
  db.collection('salonGroups').doc(groupId).update({
    members: firebase.firestore.FieldValue.arrayUnion(monMember)
  }).then(function() {
    _monGroupeId = groupId;
    listenMonGroupe(groupId);
    // Supprimer l'invitation
    db.collection('salonGroupInvites').doc(inviteId).delete().catch(function() {});
    showNotif('Tu as rejoint le groupe', 'success');
  }).catch(function() {
    showNotif('Erreur en rejoignant', 'error');
  });
}

function refuserInvitationSalonGroup(inviteId) {
  if (!inviteId || typeof db === 'undefined') return;
  db.collection('salonGroupInvites').doc(inviteId).delete().catch(function() {});
}

// === Listener pour les invitations entrantes ===
var _salonGroupInvitesListenerUnsub = null;
function initListenerInvitationsSalonGroup() {
  if (typeof db === 'undefined' || !monPlayerId) return;
  if (_salonGroupInvitesListenerUnsub) return; // deja initialise
  _salonGroupInvitesListenerUnsub = db.collection('salonGroupInvites')
    .where('toPlayerId', '==', monPlayerId)
    .where('status', '==', 'pending')
    .onSnapshot(function(snap) {
      snap.docChanges().forEach(function(change) {
        if (change.type === 'added') {
          var data = change.doc.data();
          afficherInvitationSalonGroup(change.doc.id, data.fromPseudo, data.groupId);
        }
      });
    }, function() {});
}

// === Popup d'invitation (simple notif avec boutons) ===
function afficherInvitationSalonGroup(inviteId, fromPseudo, groupId) {
  var pop = document.createElement('div');
  pop.id = 'invite-salon-' + inviteId;
  pop.style.cssText = 'position:fixed;top:80px;right:20px;background:#1a252f;border:2px solid #f39c12;border-radius:12px;padding:14px;z-index:100000;box-shadow:0 6px 20px rgba(0,0,0,0.6);max-width:300px;font-family:Arial,sans-serif;';
  pop.innerHTML =
    '<div style="font-weight:bold;color:#f39c12;font-size:13px;letter-spacing:1px;margin-bottom:6px;">&#128101; INVITATION GROUPE</div>' +
    '<div style="color:#ecf0f1;font-size:13px;margin-bottom:10px;"><strong>' + escapeHtml(fromPseudo) + '</strong> t\'invite dans son salon</div>' +
    '<div style="display:flex;gap:6px;">' +
      '<button onclick="accepterInvitationSalonGroup(\'' + inviteId + '\',\'' + groupId + '\');this.parentNode.parentNode.remove();" style="flex:1;background:#2ecc71;color:white;border:none;border-radius:6px;padding:8px;font-weight:bold;cursor:pointer;">ACCEPTER</button>' +
      '<button onclick="refuserInvitationSalonGroup(\'' + inviteId + '\');this.parentNode.parentNode.remove();" style="flex:1;background:#e74c3c;color:white;border:none;border-radius:6px;padding:8px;font-weight:bold;cursor:pointer;">REFUSER</button>' +
    '</div>';
  document.body.appendChild(pop);
  // Auto-remove apres 30s
  setTimeout(function() { var el = document.getElementById('invite-salon-' + inviteId); if (el) el.remove(); }, 30000);
}

// Démarrer le listener au boot
setTimeout(initListenerInvitationsSalonGroup, 3000);
