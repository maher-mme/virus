// ============================
// GESTION DES PARTIES (Firebase)
// ============================
const COULEURS_PARTIES = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50'];
var estHost = false;
var partieActuelleId = null;
var firebaseParties = [];
var firebasePartyPlayers = [];

// Listener temps reel sur la liste des parties
db.collection('parties').orderBy('createdAt', 'desc').onSnapshot(function(snapshot) {
  firebaseParties = [];
  snapshot.forEach(function(doc) {
    var data = doc.data();
    data._id = doc.id;
    data.enCours = (data.phase !== 'lobby');
    firebaseParties.push(data);
  });
  var ecranListe = document.getElementById('liste-parties');
  if (ecranListe && ecranListe.classList.contains('active')) {
    rafraichirListeParties();
  }
});

function getParties() {
  return firebaseParties;
}

function sauvegarderParties() {
  // Plus necessaire avec Firebase (les donnees sont sur le cloud)
}

// Notification salle d'attente (bas gauche)
function ajouterNotifSalle(texte, type) {
  var container = document.getElementById('sa-notifs');
  if (!container) return;
  var div = document.createElement('div');
  div.className = 'sa-notif ' + (type || 'join');
  div.textContent = texte;
  container.appendChild(div);
  setTimeout(function() {
    div.classList.add('fade-out');
    setTimeout(function() { div.remove(); }, 400);
  }, 4000);
}

// Sons de la salle d'attente (join/quit)
function jouerSonSalle(fichier) {
  try {
    var son = new Audio(fichier);
    son.volume = 0.5;
    son.play();
  } catch(e) {}
}

// Met a jour la salle d'attente selon si on est host ou pas
function updateSalleAttente() {
  var btnDemarrer = document.getElementById('btn-demarrer');
  var msgAttente = document.getElementById('msg-attente-host');

  if (estHost) {
    btnDemarrer.style.display = 'flex';
    msgAttente.style.display = 'none';
  } else {
    btnDemarrer.style.display = 'none';
    msgAttente.style.display = 'block';
  }
}

function quitterPartie() {
  jouerSonSalle('Audio/quitter.mp3');
  if (partieActuelleId) {
    // Supprimer le joueur de la partie
    if (myPartyPlayerDocId) {
      db.collection('partyPlayers').doc(myPartyPlayerDocId).delete().catch(function() {});
      myPartyPlayerDocId = null;
    }
    // Mettre a jour le compteur et la liste de joueurs
    var pseudo = getPseudo();
    db.collection('parties').doc(partieActuelleId).update({
      joueurs: firebase.firestore.FieldValue.increment(-1),
      listeJoueurs: firebase.firestore.FieldValue.arrayRemove(pseudo)
    }).catch(function() {});
    // Transferer host si necessaire
    db.collection('partyPlayers').where('partyId', '==', partieActuelleId).limit(1).get().then(function(snap) {
      if (!snap.empty) {
        var newHost = snap.docs[0];
        newHost.ref.update({ isHost: true });
        db.collection('parties').doc(partieActuelleId).update({ hostPlayerId: newHost.data().playerId, hostPseudo: newHost.data().pseudo });
      } else {
        // Plus personne -> supprimer la partie
        db.collection('parties').doc(partieActuelleId).delete().catch(function() {});
      }
    }).catch(function() {});
    unsubscribeFromParty();
    partieActuelleId = null;
  }
  estHost = false;
  showScreen('menu-online');
}

// Fonction commune pour etre ejecte de la partie (kick, suppression, etc.)
function ejecterDeLaPartie(raison) {
  showNotif(raison || t('partyDeleted') || 'La partie a ete supprimee', 'warn');
  unsubscribeFromParty();
  partieActuelleId = null;
  myPartyPlayerDocId = null;
  estHost = false;
  jeuActif = false;
  reunionEnCours = false;
  showScreen('menu-online');
}

// S'abonner aux mises a jour d'une partie (joueurs, chat)
function subscribeToParty(partyId) {
  unsubscribeFromParty();

  // Detecter suppression de la partie
  firebaseUnsubscribers.push(
    db.collection('parties').doc(partyId).onSnapshot(function(doc) {
      if (!doc.exists && partieActuelleId === partyId) {
        ejecterDeLaPartie(t('partyDeleted'));
      }
    }, function(err) {
      console.error('Erreur listener partie:', err);
    })
  );

  // Joueurs de la partie (temps reel)
  firebaseUnsubscribers.push(
    db.collection('partyPlayers').where('partyId', '==', partyId).onSnapshot(function(snapshot) {
      var oldCount = firebasePartyPlayers.length;
      var oldPlayers = firebasePartyPlayers.slice();
      firebasePartyPlayers = [];
      snapshot.forEach(function(doc) {
        var data = doc.data();
        data._docId = doc.id;
        firebasePartyPlayers.push(data);
      });

      // Verifier si MOI je suis encore dans la liste (sinon j'ai ete kick)
      if (partieActuelleId === partyId && myPartyPlayerDocId) {
        var meTrouve = false;
        for (var i = 0; i < firebasePartyPlayers.length; i++) {
          if (firebasePartyPlayers[i].playerId === monPlayerId) { meTrouve = true; break; }
        }
        if (!meTrouve && oldCount > 0) {
          ejecterDeLaPartie(t('partyDeleted'));
          return;
        }
      }

      updateSalleAttenteUI(firebasePartyPlayers);

      if (oldCount > 0 && firebasePartyPlayers.length > oldCount) {
        jouerSonSalle('Audio/join.mp3');
        var newPlayer = firebasePartyPlayers[firebasePartyPlayers.length - 1];
        if (newPlayer && newPlayer.playerId !== monPlayerId) {
          ajouterNotifSalle(t('playerJoined', newPlayer.pseudo), 'join');
        }
      } else if (oldCount > 0 && firebasePartyPlayers.length < oldCount) {
        jouerSonSalle('Audio/quitter.mp3');
        // Trouver qui a quitte et afficher la notification
        var currentIds = {};
        firebasePartyPlayers.forEach(function(p) { currentIds[p.playerId] = true; });
        oldPlayers.forEach(function(p) {
          if (!currentIds[p.playerId] && p.playerId !== monPlayerId) {
            ajouterNotifSalle(t('playerLeft', p.pseudo), 'leave');
          }
        });
      }
    }, function(err) {
      console.error('Erreur listener joueurs:', err);
    })
  );

  // Chat (un seul where sur partyId, filtre lobby/meeting en JS)
  firebaseUnsubscribers.push(
    db.collection('chatMessages').where('partyId', '==', partyId).onSnapshot(function(snapshot) {
      var lobbyMsgs = [];
      var meetingMsgs = [];
      snapshot.forEach(function(doc) {
        var data = doc.data();
        if (data.context === 'lobby') lobbyMsgs.push(data);
        else if (data.context === 'meeting') meetingMsgs.push(data);
      });
      lobbyMsgs.sort(function(a, b) {
        var ta = a.timestamp ? a.timestamp.toMillis() : 0;
        var tb = b.timestamp ? b.timestamp.toMillis() : 0;
        return ta - tb;
      });
      updateChatUI(lobbyMsgs, 'lobby');
      if (reunionEnCours && meetingMsgs.length > 0) {
        meetingMsgs.sort(function(a, b) {
          var ta = a.timestamp ? a.timestamp.toMillis() : 0;
          var tb = b.timestamp ? b.timestamp.toMillis() : 0;
          return ta - tb;
        });
        updateChatUI(meetingMsgs, 'meeting');
      }
    }, function(err) {
      console.error('Erreur listener chat:', err);
    })
  );
}

function unsubscribeFromParty() {
  firebaseUnsubscribers.forEach(function(unsub) { if (unsub) unsub(); });
  firebaseUnsubscribers = [];
  gameUnsubscribers.forEach(function(unsub) { if (unsub) unsub(); });
  gameUnsubscribers = [];
  firebasePartyPlayers = [];
  // Nettoyer les elements DOM des joueurs distants
  for (var pid in remotePlayers) {
    var el = document.getElementById('remote-' + pid);
    if (el) el.remove();
  }
  remotePlayers = {};
}

// S'abonner a l'etat du jeu en temps reel (positions, kills, reunions)
function subscribeToGameState(partyId) {
  // Etat de la partie (phase, etc.)
  gameUnsubscribers.push(
    db.collection('parties').doc(partyId).onSnapshot(function(doc) {
      if (!doc.exists) {
        if (partieActuelleId === partyId) {
          ejecterDeLaPartie(t('partyDeleted'));
        }
        return;
      }
      var state = doc.data();
      state._id = doc.id;
      handleGameStateUpdate(state);
    }, function(err) {
      console.error('Erreur listener etat jeu:', err);
    })
  );
  // Positions des joueurs (partyPlayers) - utiliser docChanges pour ne traiter que les modifies
  gameUnsubscribers.push(
    db.collection('partyPlayers').where('partyId', '==', partyId).onSnapshot(function(snapshot) {
      snapshot.docChanges().forEach(function(change) {
        if (change.type === 'added' || change.type === 'modified') {
          var data = change.doc.data();
          data._docId = change.doc.id;
          handleSinglePlayerUpdate(data);
        } else if (change.type === 'removed') {
          var removedData = change.doc.data();
          if (removedData.playerId && remotePlayers[removedData.playerId]) {
            var el = document.getElementById('remote-' + removedData.playerId);
            if (el) el.remove();
            delete remotePlayers[removedData.playerId];
          }
        }
      });
    }, function(err) {
      console.error('Erreur listener positions:', err);
    })
  );
  // Cadavres
  gameUnsubscribers.push(
    db.collection('cadavres').where('partyId', '==', partyId).onSnapshot(function(snapshot) {
      var cadavres = [];
      snapshot.forEach(function(d) {
        var data = d.data();
        data._id = d.id;
        cadavres.push(data);
      });
      if (lastGamePhase === 'playing') updateCadavresMultiplayer(cadavres);
    })
  );
  // Chat reunion gere par le listener unique dans subscribeToParty
  // Reunions actives
  gameUnsubscribers.push(
    db.collection('meetings').where('partyId', '==', partyId).where('active', '==', true).onSnapshot(function(snapshot) {
      if (!snapshot.empty) {
        var meeting = snapshot.docs[0].data();
        meeting._id = snapshot.docs[0].id;
        if (!reunionEnCours) {
          ouvrirReunionMultiplayer(meeting);
        }
        // Mettre a jour le compteur de votes
        db.collection('votes').where('meetingId', '==', meeting._id).get().then(function(voteSnap) {
          var voteInfo = document.getElementById('reunion-vote-info');
          var aliveCount = firebasePartyPlayers.filter(function(p) { return p.alive; }).length;
          if (voteInfo) voteInfo.textContent = voteSnap.size + '/' + aliveCount;
        });
      }
    })
  );
}

// Gestion des mises a jour de l'etat du jeu
var lastGamePhase = null;
function handleGameStateUpdate(state) {
  // Phase a change
  if (state.phase !== lastGamePhase) {
    if (state.phase === 'playing' && lastGamePhase === 'lobby') {
      lancerJeuMultiplayer(state);
    } else if (state.phase === 'meeting' && !reunionEnCours) {
      // Reunion geree par le listener meetings
    } else if (state.phase === 'playing' && reunionEnCours) {
      fermerReunionMultiplayer(state);
    } else if (state.phase === 'finished') {
      afficherFinPartieMultiplayer(state);
    }
    lastGamePhase = state.phase;
  }
}

// Lancer le jeu en mode multiplayer
function lancerJeuMultiplayer(state) {
  // Trouver mon role depuis les partyPlayers
  var myPlayer = firebasePartyPlayers.find(function(p) { return p.playerId === monPlayerId; });
  monRole = (myPlayer && myPlayer.role) || 'innocent';
  modeHorsLigne = false;
  showScreen('jeu');
  jeuActif = true;
  joueurX = 3800;
  joueurY = 3050;
  joueursElimines = [];
  killProtection = true;
  setTimeout(function() { killProtection = false; }, 10000);
  reunionCooldown = true;
  setTimeout(function() { reunionCooldown = false; }, 15000);
  voteTermine = false;
  voteChoisi = -1;
  joueurAVote = false;

  // Afficher le role
  if (monRole === 'virus') {
    var allies = firebasePartyPlayers.filter(function(p) { return p.role === 'virus' && p.playerId !== monPlayerId; }).map(function(p) { return p.pseudo; });
    if (allies.length > 0) {
      showNotif(t('youAreVirusAllies', allies.join(', ')), 'warn');
    } else {
      showNotif(t('youAreOnlyVirus'), 'warn');
    }
  } else if (monRole === 'journaliste') {
    showNotif(t('youAreJournalist'), 'info');
  } else if (monRole === 'fanatique') {
    showNotif(t('youAreFanatic'), 'warn');
  } else if (monRole === 'espion') {
    showNotif(t('youAreSpy'), 'info');
    var overlay = document.getElementById('espion-choix-overlay');
    if (overlay) overlay.style.display = 'flex';
  } else {
    showNotif(t('youAreInnocent'), 'info');
  }

  // Initialiser les missions
  initMissions();

  // Souscrire a l'etat du jeu
  subscribeToGameState(partieActuelleId);
  lastGamePhase = 'playing';
  gameLoop();
}

// Gestion d'un joueur distant individuel (velocite + lissage)
function handleSinglePlayerUpdate(p) {
  if (p.playerId === monPlayerId) return;
  var now = Date.now();
  if (!remotePlayers[p.playerId]) {
    remotePlayers[p.playerId] = {
      x: p.x, y: p.y,
      targetX: p.x, targetY: p.y,
      velocityX: 0, velocityY: 0,
      direction: p.direction, lastUpdate: now,
      alive: p.alive, pseudo: p.pseudo, skin: p.skin
    };
    createRemotePlayerElement(p);
  } else {
    var rp = remotePlayers[p.playerId];
    // Ignorer si la position n'a pas change (evite d'ecraser la velocite)
    var movedX = Math.abs(p.x - rp.targetX);
    var movedY = Math.abs(p.y - rp.targetY);
    if (movedX > 0.1 || movedY > 0.1) {
      var dt = (now - rp.lastUpdate) / 1000;
      if (dt > 0.01 && dt < 2) {
        // Lisser la velocite (blend 70% nouvelle, 30% ancienne)
        var newVx = (p.x - rp.targetX) / dt;
        var newVy = (p.y - rp.targetY) / dt;
        rp.velocityX = rp.velocityX * 0.3 + newVx * 0.7;
        rp.velocityY = rp.velocityY * 0.3 + newVy * 0.7;
      }
      rp.targetX = p.x;
      rp.targetY = p.y;
      rp.lastUpdate = now;
    }
    rp.direction = p.direction;
    rp.alive = p.alive;
  }
}

// Creer un element DOM pour un joueur distant
function createRemotePlayerElement(p) {
  var container = document.getElementById('mall-map');
  if (!container) return;
  var div = document.createElement('div');
  div.id = 'remote-' + p.playerId;
  div.className = 'bot';
  div.style.position = 'absolute';
  div.style.left = p.x + 'px';
  div.style.top = p.y + 'px';
  var adminClass = isAdmin(p.pseudo) ? ' pseudo-admin' : '';
  div.innerHTML = '<div class="bot-pseudo' + adminClass + '">' + p.pseudo.replace(/</g, '&lt;') + '</div>' +
    '<img src="' + (p.skin || 'skin/gratuit/skin-de-base-garcon.svg') +
    '" class="bot-skin" style="width:60px;height:60px;">';
  container.appendChild(div);
}

// Mettre a jour les joueurs distants (prediction + lerp frame-rate independent)
var _lastRemoteTime = 0;
function updateRemotePlayers() {
  var now = Date.now();
  var dt = _lastRemoteTime ? (now - _lastRemoteTime) / 1000 : 0.016;
  _lastRemoteTime = now;
  // Limiter dt pour eviter les sauts apres pause/onglet inactif
  if (dt > 0.1) dt = 0.016;

  for (var pid in remotePlayers) {
    var rp = remotePlayers[pid];
    var timeSinceUpdate = (now - rp.lastUpdate) / 1000;

    // Predire la position future basee sur la velocite
    // Limiter la prediction a 150ms pour eviter l'overshoot
    var predictAhead = Math.min(timeSinceUpdate, 0.15);
    var predictedX = rp.targetX + rp.velocityX * predictAhead;
    var predictedY = rp.targetY + rp.velocityY * predictAhead;

    // Lerp frame-rate independent (lerpSpeed 20 = tres reactif)
    var lerpSpeed = 20;
    var factor = 1 - Math.exp(-lerpSpeed * dt);

    var dx = predictedX - rp.x;
    var dy = predictedY - rp.y;
    if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
      rp.x += dx * factor;
      rp.y += dy * factor;
    } else {
      rp.x = predictedX;
      rp.y = predictedY;
    }

    // Reduire la velocite progressivement si pas de mise a jour recente
    if (timeSinceUpdate > 0.3) {
      var decay = Math.max(0, 1 - (timeSinceUpdate - 0.3) * 2);
      rp.velocityX *= decay;
      rp.velocityY *= decay;
    }

    var el = document.getElementById('remote-' + pid);
    if (el) {
      el.style.left = rp.x + 'px';
      el.style.top = rp.y + 'px';
      var img = el.querySelector('img');
      if (img) img.style.transform = 'scaleX(' + rp.direction + ')';
      if (!rp.alive) el.style.opacity = '0.3';
    }
  }
}

// Mettre a jour les cadavres en multiplayer
function updateCadavresMultiplayer(cadavres) {
  if (!cadavres) return;
  var container = document.getElementById('mall-map');
  if (!container) return;
  container.querySelectorAll('.cadavre-mp').forEach(function(el) { el.remove(); });
  cadavres.forEach(function(c) {
    var div = document.createElement('div');
    div.className = 'cadavre-mp';
    div.style.position = 'absolute';
    div.style.left = c.x + 'px';
    div.style.top = c.y + 'px';
    div.style.opacity = '0.5';
    div.innerHTML = '<img src="' + (c.victimSkin || 'skin/gratuit/skin-de-base-garcon.svg') +
      '" style="width:60px;height:60px;filter:grayscale(100%);transform:rotate(90deg);">';
    div.onclick = function() {
      if (!c.reported && !reunionEnCours) {
        // Verifier en temps reel que le cadavre n'a pas deja ete signale
        db.collection('cadavres').doc(c._id).get().then(function(doc) {
          if (!doc.exists || doc.data().reported) return;
          return db.collection('cadavres').doc(c._id).update({ reported: true }).then(function() {
            db.collection('meetings').add({
              partyId: partieActuelleId,
              initiatorPlayerId: monPlayerId,
              reason: 'report',
              active: true,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            db.collection('parties').doc(partieActuelleId).update({ phase: 'meeting' });
          });
        }).catch(function() {});
      }
    };
    container.appendChild(div);
  });
}

// Reunion en multiplayer
function ouvrirReunionMultiplayer(meeting) {
  if (miniJeuOuvert) pauserMiniJeu();
  reunionEnCours = true;
  jeuActif = false;
  try { var sReunion = new Audio("Audio/reunion-urgence.mp3"); sReunion.volume = 0.6; sReunion.play(); } catch(e) {}
  var popup = document.getElementById('popup-reunion');
  if (popup) popup.style.display = 'flex';
  // Afficher le bouton toggle chat sur mobile (deplacer vers body)
  var reunionToggle = document.getElementById('reunion-chat-toggle');
  if (reunionToggle) {
    reunionToggle.classList.add('visible');
    if (typeof ouvrirReunionChatMobile === 'function') ouvrirReunionChatMobile();
  }
  // Afficher les joueurs vivants dans la liste de vote
  var voteList = document.getElementById('reunion-vote-liste');
  if (voteList) {
    voteList.innerHTML = '';
    firebasePartyPlayers.forEach(function(j) {
      if (!j.alive || j.playerId === monPlayerId) return;
      var btn = document.createElement('button');
      btn.className = 'reunion-vote-btn';
      if (isAdmin(j.pseudo)) btn.classList.add('pseudo-admin-text');
      btn.textContent = j.pseudo;
      btn.onclick = function() {
        db.collection('votes').add({
          meetingId: meeting._id,
          partyId: partieActuelleId,
          voterPlayerId: monPlayerId,
          targetPlayerId: j.playerId,
          isSkip: false
        }).catch(function() {});
        try { var sVote = new Audio('Audio/i-voted.mp3'); sVote.volume = 0.5; sVote.play(); } catch(e) {}
        voteList.querySelectorAll('.reunion-vote-btn').forEach(function(b) { b.disabled = true; });
        // Host verifie si tous ont vote
        if (estHost) checkVotesComplete(meeting._id);
      };
      voteList.appendChild(btn);
    });
  }
}

// Host verifie si tous les joueurs vivants ont vote
function checkVotesComplete(meetingId) {
  setTimeout(function() {
    var aliveCount = firebasePartyPlayers.filter(function(p) { return p.alive; }).length;
    db.collection('votes').where('meetingId', '==', meetingId).get().then(function(snap) {
      if (snap.size >= aliveCount) {
        concludeVote(meetingId);
      }
    });
  }, 1000);
}

// Host conclut le vote
function concludeVote(meetingId) {
  if (!partieActuelleId || !meetingId) return;
  db.collection('votes').where('meetingId', '==', meetingId).get().then(function(snap) {
    var voteCounts = {};
    var skipCount = 0;
    snap.forEach(function(doc) {
      var v = doc.data();
      if (v.isSkip) { skipCount++; }
      else { voteCounts[v.targetPlayerId] = (voteCounts[v.targetPlayerId] || 0) + 1; }
    });
    // Trouver le plus vote
    var maxVotes = skipCount;
    var eliminated = null;
    for (var pid in voteCounts) {
      if (voteCounts[pid] > maxVotes) {
        maxVotes = voteCounts[pid];
        eliminated = pid;
      }
    }
    // Eliminer le joueur vote
    if (eliminated) {
      firebasePartyPlayers.forEach(function(p) {
        if (p.playerId === eliminated && p._docId) {
          db.collection('partyPlayers').doc(p._docId).update({ alive: false });
        }
      });
    }
    // Fermer la reunion
    db.collection('meetings').doc(meetingId).update({ active: false });
    db.collection('parties').doc(partieActuelleId).update({ phase: 'playing' });
    // Verifier fin de partie
    checkEndGame();
  });
}

// Verifier si la partie est terminee
function checkEndGame() {
  if (!estHost) return;
  setTimeout(function() {
    var virusAlive = firebasePartyPlayers.filter(function(p) { return p.alive && p.role === 'virus'; }).length;
    var innocentsAlive = firebasePartyPlayers.filter(function(p) { return p.alive && p.role !== 'virus'; }).length;
    if (virusAlive === 0 || virusAlive >= innocentsAlive) {
      db.collection('parties').doc(partieActuelleId).update({
        phase: 'finished',
        winner: virusAlive === 0 ? 'innocents' : 'virus'
      });
    }
  }, 500);
}

function fermerReunionMultiplayer(state) {
  reunionEnCours = false;
  jeuActif = true;
  var popup = document.getElementById('popup-reunion');
  if (popup) popup.style.display = 'none';
  // Remettre le chat et le toggle dans #jeu puis nettoyer
  if (typeof fermerReunionChatMobile === 'function') fermerReunionChatMobile();
  var elChatM = document.getElementById('reunion-chat');
  if (elChatM) { elChatM.classList.remove('visible', 'chat-visible', 'chat-mobile-open'); elChatM.style.cssText = ''; }
  var elToggleM = document.getElementById('reunion-chat-toggle');
  if (elToggleM) { elToggleM.classList.remove('visible', 'active'); elToggleM.style.cssText = ''; }
  reunionCooldown = true;
  setTimeout(function() { reunionCooldown = false; }, 15000);
  killProtection = true;
  setTimeout(function() { killProtection = false; }, 10000);
  gameLoop();
  // Reprendre le mini-jeu si un etait en pause
  if (miniJeuPause) reprendreMiniJeu();
}

function afficherFinPartieMultiplayer(state) {
  jeuActif = false;
  if (miniJeuOuvert) fermerMiniJeu();
  reunionEnCours = false;
  var popup = document.getElementById('popup-reunion');
  if (popup) popup.style.display = 'none';
  if (state.winner === 'innocents') {
    showNotif(t('innocentsVictory'), 'info');
  } else {
    showNotif(t('virusVictory'), 'warn');
  }
  setTimeout(function() {
    unsubscribeFromParty();
    partieActuelleId = null;
    lastGamePhase = null;
    showScreen('menu-online');
  }, 5000);
}

// Mettre a jour l'UI de la salle d'attente
function updateSalleAttenteUI(players) {
  if (!players) return;
  var currentParty = firebaseParties.find(function(p) { return p._id === partieActuelleId; });
  var maxJ = currentParty ? currentParty.maxJoueurs : 10;

  // Compteur
  var compteur = document.querySelector('.compteur');
  if (compteur) compteur.textContent = players.length + '/' + maxJ;

  // Liste joueurs
  var liste = document.querySelector('.sa-joueurs-liste');
  if (liste) {
    var html = '';
    players.forEach(function(p) {
      var hostLabel = p.isHost ? ' (Host)' : '';
      var listAdminClass = isAdmin(p.pseudo) ? ' pseudo-admin-text' : '';
      html += '<div class="sa-joueur-item connecte">&#9679; <span class="' + listAdminClass.trim() + '">' +
        p.pseudo.replace(/</g, '&lt;') + '</span>' + hostLabel + '</div>';
    });
    for (var i = players.length; i < maxJ; i++) {
      html += '<div class="sa-joueur-item attente">&#9675; ' + t('waiting') + '</div>';
    }
    liste.innerHTML = html;
  }

  // Verifier si on est host
  var me = players.find(function(p) { return p.playerId === monPlayerId; });
  estHost = me ? me.isHost : false;
  updateSalleAttente();

  // Afficher les avatars des autres joueurs dans la salle
  renderWaitingRoomPlayers(players);
}

// Afficher les avatars des autres joueurs dans la salle d'attente
function renderWaitingRoomPlayers(players) {
  var container = document.querySelector('.sa-content');
  if (!container) return;
  // IDs des joueurs actuels (sauf moi)
  var currentIds = {};
  players.forEach(function(p) {
    if (p.playerId === monPlayerId) return;
    currentIds[p.playerId] = true;
    var existing = document.getElementById('sa-remote-' + p.playerId);
    if (existing) {
      // Mettre a jour la position avec transition CSS (mouvement fluide)
      existing.style.left = (p.saX || 50) + '%';
      existing.style.top = (p.saY || 70) + '%';
      // Mettre a jour la direction du skin
      var img = existing.querySelector('img');
      if (img) {
        img.style.transform = p.saDirection === -1 ? 'scaleX(-1)' : 'scaleX(1)';
      }
    } else {
      // Creer un nouvel avatar
      var div = document.createElement('div');
      div.id = 'sa-remote-' + p.playerId;
      div.className = 'sa-joueur-avatar sa-remote-avatar';
      div.style.position = 'absolute';
      div.style.left = (p.saX || 50) + '%';
      div.style.top = (p.saY || 70) + '%';
      div.style.transform = 'translate(-50%, -50%)';
      div.style.textAlign = 'center';
      div.style.zIndex = '5';
      div.style.transition = 'left 0.15s linear, top 0.15s linear';
      var saAdminClass = isAdmin(p.pseudo) ? ' pseudo-admin-text' : '';
      var saDir = p.saDirection === -1 ? 'scaleX(-1)' : 'scaleX(1)';
      div.innerHTML = '<div class="' + saAdminClass.trim() + '" style="font-size:10px;color:#fff;margin-bottom:2px;">' +
        p.pseudo.replace(/</g, '&lt;') + '</div>' +
        '<img src="' + (p.skin || 'skin/gratuit/skin-de-base-garcon.svg') +
        '" style="width:48px;height:48px;transform:' + saDir + ';" alt="skin">';
      container.appendChild(div);
    }
  });
  // Supprimer les avatars des joueurs qui ont quitte
  container.querySelectorAll('.sa-remote-avatar').forEach(function(el) {
    var pid = el.id.replace('sa-remote-', '');
    if (!currentIds[pid]) el.remove();
  });
}

// Mettre a jour le chat depuis Firebase
function updateChatUI(messages, context) {
  var chatId = context === 'lobby' ? 'chat-messages' : 'reunion-chat-messages';
  var chatDiv = document.getElementById(chatId);
  if (!chatDiv) return;
  chatDiv.innerHTML = '';
  if (!messages) return;
  messages.forEach(function(msg) {
    var div = document.createElement('div');
    div.className = 'chat-message' + (msg.isSystem ? ' system' : '');
    var chatAdminClass = isAdmin(msg.pseudo) ? ' pseudo-admin-text' : '';
    div.innerHTML = '<strong class="' + chatAdminClass.trim() + '">' + msg.pseudo.replace(/</g, '&lt;') + ':</strong> ' +
      msg.message.replace(/</g, '&lt;');
    chatDiv.appendChild(div);
  });
  chatDiv.scrollTop = chatDiv.scrollHeight;
  // Son chat
  if (messages.length > 0) {
    try { var sChat = new Audio(Math.random() < 0.5 ? 'Audio/chat1.mp3' : 'Audio/chat2.mp3'); sChat.volume = 0.4; sChat.play(); } catch(e) {}
  }
}

function mettreAJourOptionsVirus() {
  var maxJ = parseInt(document.getElementById('cp-max-joueurs').value);
  var selectMechants = document.getElementById('cp-mechants');
  var options = selectMechants.querySelectorAll('option');
  options.forEach(function(opt) {
    var val = parseInt(opt.value);
    if (val >= 3 && maxJ < 10) {
      opt.disabled = true;
      opt.title = t('need10For3VirusTip');
    } else if (val >= 2 && maxJ < 7) {
      opt.disabled = true;
      opt.title = t('need7For2VirusTip');
    } else {
      opt.disabled = false;
      opt.title = '';
    }
  });
  // Si l'option selectionnee est desactivee, revenir a 1
  if (selectMechants.selectedOptions[0] && selectMechants.selectedOptions[0].disabled) {
    selectMechants.value = '1';
  }
}

// Toggles creer-partie online
var cpJournaliste = false;
var cpFanatique = false;
var cpEspion = false;
var cpLang = 'fr';

function toggleCpJournaliste() {
  cpJournaliste = !cpJournaliste;
  var el = document.getElementById('cp-toggle-journaliste');
  var lbl = document.getElementById('cp-toggle-journaliste-label');
  if (cpJournaliste) {
    el.classList.add('active'); lbl.classList.add('active');
    lbl.textContent = t('oneJournalist');
  } else {
    el.classList.remove('active'); lbl.classList.remove('active');
    lbl.textContent = t('zeroJournalist');
  }
}
function toggleCpFanatique() {
  cpFanatique = !cpFanatique;
  var el = document.getElementById('cp-toggle-fanatique');
  var lbl = document.getElementById('cp-toggle-fanatique-label');
  if (cpFanatique) {
    el.classList.add('active'); lbl.classList.add('active');
    lbl.textContent = t('oneFanatic');
  } else {
    el.classList.remove('active'); lbl.classList.remove('active');
    lbl.textContent = t('zeroFanatic');
  }
}
function toggleCpEspion() {
  cpEspion = !cpEspion;
  var el = document.getElementById('cp-toggle-espion');
  var lbl = document.getElementById('cp-toggle-espion-label');
  if (cpEspion) {
    el.classList.add('active'); lbl.classList.add('active');
    lbl.textContent = t('oneSpy');
  } else {
    el.classList.remove('active'); lbl.classList.remove('active');
    lbl.textContent = t('zeroSpy');
  }
}
function setCpLang(lang) {
  cpLang = lang;
  document.querySelectorAll('#creer-partie .lang-btn').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.getElementById('cp-lang-' + lang);
  if (btn) btn.classList.add('active');
}

function creerPartie() {
  const nom = document.getElementById('cp-nom').value.trim();
  const pseudo = getPseudo();
  const maxJoueurs = parseInt(document.getElementById('cp-max-joueurs').value);
  const mechants = parseInt(document.getElementById('cp-mechants').value);

  if (!nom) { alert(t('vGiveGameName')); return; }
  if (mechants >= 2 && maxJoueurs < 7) {
    showNotif(t('need7For2Virus'), 'warn');
    return;
  }
  if (mechants >= 3 && maxJoueurs < 10) {
    showNotif(t('need10For3Virus'), 'warn');
    return;
  }
  if (maxJoueurs < 7 && (cpJournaliste || cpFanatique || cpEspion)) {
    if (cpJournaliste) { showNotif(t('notEnoughJournalist'), 'warn'); return; }
    if (cpFanatique) { showNotif(t('notEnoughFanatic'), 'warn'); return; }
    if (cpEspion) { showNotif(t('notEnoughSpy'), 'warn'); return; }
  }

  // Enregistrer le joueur sur Firebase
  var skin = getSkinFichier(getSkin());
  db.collection('players').doc(monPlayerId).set({
    playerId: monPlayerId, pseudo: pseudo, skin: skin,
    online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(function() {
    // Creer la partie
    return db.collection('parties').add({
      nom: nom, hostPlayerId: monPlayerId, hostPseudo: pseudo,
      maxJoueurs: maxJoueurs, mechants: mechants,
      journaliste: cpJournaliste, fanatique: cpFanatique, espion: cpEspion,
      langue: cpLang, couleur: COULEURS_PARTIES[Math.floor(Math.random() * COULEURS_PARTIES.length)],
      phase: 'lobby', joueurs: 1, listeJoueurs: [pseudo],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(function(docRef) {
    var partyId = docRef.id;
    // Ajouter le joueur host
    return db.collection('partyPlayers').add({
      partyId: partyId, playerId: monPlayerId, pseudo: pseudo, skin: skin,
      isHost: true, role: '', alive: true, x: 0, y: 0, direction: 1, saX: 50, saY: 70, saDirection: 1,
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(ppDoc) {
      myPartyPlayerDocId = ppDoc.id;
      document.getElementById('cp-nom').value = '';
      modeHorsLigne = false;
      estHost = true;
      partieActuelleId = partyId;
      showScreen('salle-attente');
      subscribeToParty(partyId);
      updateSalleAttente();
    });
  }).catch(function(err) {
    showNotif(t('mjConnError'), 'warn');
  });
}

function rejoindrePartie(partieId) {
  var pseudo = getPseudo() || 'Joueur';
  var skin = getSkinFichier(getSkin());
  // Verifier que la partie est disponible
  db.collection('parties').doc(partieId).get().then(function(doc) {
    if (!doc.exists) { showNotif(t('mjPartyNotFound'), 'warn'); return; }
    var party = doc.data();
    if (party.phase !== 'lobby') { showNotif(t('gameAlreadyStarted'), 'warn'); return; }
    if (party.joueurs >= party.maxJoueurs) { showNotif(t('gameFull'), 'warn'); return; }
    // Enregistrer le joueur
    return db.collection('players').doc(monPlayerId).set({
      playerId: monPlayerId, pseudo: pseudo, skin: skin,
      online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
      // Ajouter a la partie
      return db.collection('partyPlayers').add({
        partyId: partieId, playerId: monPlayerId, pseudo: pseudo, skin: skin,
        isHost: false, role: '', alive: true, x: 0, y: 0, direction: 1, saX: 50, saY: 70, saDirection: 1,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(function(ppDoc) {
      myPartyPlayerDocId = ppDoc.id;
      // Mettre a jour le compteur
      return db.collection('parties').doc(partieId).update({
        joueurs: firebase.firestore.FieldValue.increment(1),
        listeJoueurs: firebase.firestore.FieldValue.arrayUnion(pseudo)
      });
    }).then(function() {
      modeHorsLigne = false;
      estHost = false;
      partieActuelleId = partieId;
      showScreen('salle-attente');
      subscribeToParty(partieId);
      updateSalleAttente();
    });
  }).catch(function(err) {
    showNotif(t('mjConnError'), 'warn');
  });
}

// Nettoyer les parties fantomes (0 joueurs ou host absent)
function nettoyerPartiesFantomes() {
  var parties = getParties();
  parties.forEach(function(p) {
    if (p.joueurs <= 0 || !p.listeJoueurs || p.listeJoueurs.length === 0) {
      db.collection('parties').doc(p._id).delete().catch(function() {});
      // Supprimer aussi les partyPlayers orphelins
      db.collection('partyPlayers').where('partyId', '==', p._id).get().then(function(snap) {
        snap.forEach(function(doc) { doc.ref.delete(); });
      }).catch(function() {});
    }
  });
}

// Supprimer UNE partie (admin)
function supprimerPartie(partyId) {
  db.collection('parties').doc(partyId).delete().catch(function() {});
  db.collection('partyPlayers').where('partyId', '==', partyId).get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  }).catch(function() {});
  db.collection('chatMessages').where('partyId', '==', partyId).get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  }).catch(function() {});
  db.collection('cadavres').where('partyId', '==', partyId).get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  }).catch(function() {});
  db.collection('meetings').where('partyId', '==', partyId).get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  }).catch(function() {});
  db.collection('votes').where('partyId', '==', partyId).get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  }).catch(function() {});
}

// Purger TOUTES les parties (admin)
function purgerToutesLesParties() {
  db.collection('parties').get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  });
  db.collection('partyPlayers').get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  });
  db.collection('chatMessages').get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  });
  db.collection('cadavres').get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  });
  db.collection('meetings').get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  });
  db.collection('votes').get().then(function(snap) {
    snap.forEach(function(doc) { doc.ref.delete(); });
  });
  showNotif('Toutes les parties ont ete supprimees', 'success');
}

function rafraichirListeParties() {
  // Auto-nettoyage des parties fantomes
  nettoyerPartiesFantomes();

  const parties = getParties();
  const tbody = document.getElementById('lp-tbody');
  const vide = document.getElementById('lp-vide');
  const total = document.getElementById('lp-total');

  tbody.innerHTML = '';

  if (parties.length === 0) {
    vide.style.display = 'block';
    total.textContent = t('noGamesAvailable');
    return;
  }

  vide.style.display = 'none';
  total.textContent = t('gamesAvailable', parties.length, parties.length > 1 ? 's' : '', parties.length > 1 ? 's' : '');

  parties.forEach(function(p) {
    var pourcent = Math.round((p.joueurs / p.maxJoueurs) * 100);
    var couleurBarre = pourcent < 50 ? '#2ecc71' : pourcent < 80 ? '#f39c12' : '#e74c3c';

    var estPlein = p.joueurs >= p.maxJoueurs;
    var partyIdStr = p._id; // Firebase doc ID
    var hostPseudo = p.listeJoueurs && p.listeJoueurs.length > 0 ? p.listeJoueurs[0] : '?';
    var tr = document.createElement('tr');
    if (!p.enCours && !estPlein) {
      (function(pid) {
        tr.onclick = function() { rejoindrePartie(pid); };
      })(partyIdStr);
      tr.style.cursor = 'pointer';
    } else {
      tr.style.opacity = '0.6';
      tr.style.cursor = 'not-allowed';
    }
    var adminDeleteBtn = isAdmin() ? '<button class="btn-admin-delete" data-deleteid="' + partyIdStr + '" title="Supprimer cette partie">&#10005;</button>' : '';

    tr.innerHTML =
      '<td>' +
        '<div class="lp-nom-partie">' +
          adminDeleteBtn +
          '<div class="lp-icone-partie" style="border:2px solid ' + p.couleur + '">&#128367;</div>' +
          '<div class="lp-nom-texte">' +
            '<span class="nom">' + p.nom.replace(/</g, '&lt;') + '</span>' +
            '<span class="host">' + t('hostLabel') + ' ' + hostPseudo.replace(/</g, '&lt;') + '</span>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<div class="lp-joueurs">' +
          '<div class="lp-barre-joueurs">' +
            '<div class="lp-barre-remplissage" style="width:' + pourcent + '%; background:' + couleurBarre + ';"></div>' +
          '</div>' +
          '<span class="lp-joueurs-texte">' + p.joueurs + '/' + p.maxJoueurs + '</span>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<div class="lp-mechants">' +
          '<div class="lp-virus-icone">&#9763;</div>' +
          '<span class="lp-mechants-texte">' + p.mechants + ' virus</span>' +
        '</div>' +
      '</td>' +
      '<td style="text-align:center">' +
        (p.enCours
          ? '<button class="btn-rejoindre" style="opacity:0.4;cursor:not-allowed;" disabled>' + t('inProgress') + '</button>'
          : estPlein
            ? '<button class="btn-rejoindre" style="opacity:0.4;cursor:not-allowed;background:#e74c3c;" disabled>' + t('gameFull') + '</button>'
            : '<button class="btn-rejoindre" data-partyid="' + partyIdStr + '">' + t('joinBtn') + '</button>') +
      '</td>';

    // Attacher le click handler au bouton rejoindre
    var btnRejoindre = tr.querySelector('.btn-rejoindre[data-partyid]');
    if (btnRejoindre) {
      (function(pid) {
        btnRejoindre.onclick = function(e) { e.stopPropagation(); rejoindrePartie(pid); };
      })(partyIdStr);
    }

    // Bouton supprimer admin
    var btnDelete = tr.querySelector('.btn-admin-delete[data-deleteid]');
    if (btnDelete) {
      (function(pid) {
        btnDelete.onclick = function(e) { e.stopPropagation(); supprimerPartie(pid); };
      })(partyIdStr);
    }

    tbody.appendChild(tr);
  });
}

