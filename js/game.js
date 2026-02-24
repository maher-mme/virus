// ============================
// CONFIG HORS LIGNE
// ============================
var hlConfigJournaliste = 0;
var hlConfigFanatique = 0;
var hlConfigEspion = 0;

function majConfigHL() {
  var nbTotal = parseInt(document.getElementById('hl-nb-joueurs').value);
  var nbVirus = parseInt(document.getElementById('hl-nb-virus').value);
  var nbBots = nbTotal - 1; // total - joueur

  // Regles : 1 virus par defaut, 2 virus a partir de 7 joueurs, 3 virus a partir de 10
  var maxVirus = 1;
  if (nbTotal >= 10) maxVirus = 3;
  else if (nbTotal >= 7) maxVirus = 2;

  var sliderVirus = document.getElementById('hl-nb-virus');
  sliderVirus.max = maxVirus;
  if (nbVirus > maxVirus) {
    nbVirus = maxVirus;
    sliderVirus.value = nbVirus;
  }

  // Contrainte : minimum 7 joueurs pour journaliste/fanatique/espion
  if (nbTotal < 7) {
    if (hlConfigEspion === 1) {
      hlConfigEspion = 0;
      var tE = document.getElementById('hl-toggle-espion');
      var tEL = document.getElementById('hl-toggle-espion-label');
      tE.classList.remove('active'); tEL.classList.remove('active');
      tEL.textContent = t('zeroSpy');
    }
    if (hlConfigFanatique === 1) {
      hlConfigFanatique = 0;
      var tF = document.getElementById('hl-toggle-fanatique');
      var tFL = document.getElementById('hl-toggle-fanatique-label');
      tF.classList.remove('active'); tFL.classList.remove('active');
      tFL.textContent = t('zeroFanatic');
    }
    if (hlConfigJournaliste === 1) {
      hlConfigJournaliste = 0;
      var tJ = document.getElementById('hl-toggle-journaliste');
      var tJL = document.getElementById('hl-toggle-journaliste-label');
      tJ.classList.remove('active'); tJL.classList.remove('active');
      tJL.textContent = t('zeroJournalist');
    }
  }

  // Contrainte : virus + journaliste + fanatique + espion ne doit pas depasser nbTotal
  var rolesSpeciaux = nbVirus + hlConfigJournaliste + hlConfigFanatique + hlConfigEspion;
  if (rolesSpeciaux >= nbTotal) {
    // Desactiver espion d'abord, puis fanatique, puis journaliste si necessaire
    if (hlConfigEspion === 1 && nbVirus + hlConfigJournaliste + hlConfigFanatique >= nbTotal) {
      hlConfigEspion = 0;
      var toggleE = document.getElementById('hl-toggle-espion');
      var toggleELabel = document.getElementById('hl-toggle-espion-label');
      toggleE.classList.remove('active');
      toggleELabel.classList.remove('active');
      toggleELabel.textContent = t('zeroSpy');
    }
    if (hlConfigFanatique === 1 && nbVirus + hlConfigJournaliste + hlConfigEspion >= nbTotal) {
      hlConfigFanatique = 0;
      var toggleF = document.getElementById('hl-toggle-fanatique');
      var toggleFLabel = document.getElementById('hl-toggle-fanatique-label');
      toggleF.classList.remove('active');
      toggleFLabel.classList.remove('active');
      toggleFLabel.textContent = t('zeroFanatic');
    }
    if (nbVirus + hlConfigJournaliste + hlConfigEspion >= nbTotal && hlConfigJournaliste === 1) {
      hlConfigJournaliste = 0;
      var toggle = document.getElementById('hl-toggle-journaliste');
      var toggleLabel = document.getElementById('hl-toggle-journaliste-label');
      toggle.classList.remove('active');
      toggleLabel.classList.remove('active');
      toggleLabel.textContent = t('zeroJournalist');
    }
  }

  // Mettre a jour les affichages
  document.getElementById('hl-nb-joueurs-val').textContent = nbTotal;
  document.getElementById('hl-nb-virus-val').textContent = nbVirus;

  var nbInnocents = nbTotal - nbVirus - hlConfigJournaliste - hlConfigFanatique - hlConfigEspion;
  document.getElementById('hl-resume-total').textContent = nbTotal;
  document.getElementById('hl-resume-innocents').textContent = nbInnocents;
  document.getElementById('hl-resume-virus').textContent = nbVirus;
  document.getElementById('hl-resume-journaliste').textContent = hlConfigJournaliste;
  document.getElementById('hl-resume-fanatique').textContent = hlConfigFanatique;
  document.getElementById('hl-resume-espion').textContent = hlConfigEspion;
}

function toggleJournalisteHL() {
  var toggle = document.getElementById('hl-toggle-journaliste');
  var toggleLabel = document.getElementById('hl-toggle-journaliste-label');
  var nbTotal = parseInt(document.getElementById('hl-nb-joueurs').value);
  var nbVirus = parseInt(document.getElementById('hl-nb-virus').value);

  if (hlConfigJournaliste === 1) {
    hlConfigJournaliste = 0;
    toggle.classList.remove('active');
    toggleLabel.classList.remove('active');
    toggleLabel.textContent = t('zeroJournalist');
  } else {
    if (nbTotal < 7) {
      showNotif(t('notEnoughJournalist'), 'warn');
      return;
    }
    if (nbVirus + 1 >= nbTotal) {
      showNotif(t('notEnoughJournalist'), 'warn');
      return;
    }
    hlConfigJournaliste = 1;
    toggle.classList.add('active');
    toggleLabel.classList.add('active');
    toggleLabel.textContent = t('oneJournalist');
  }
  majConfigHL();
}

function toggleFanatiqueHL() {
  var toggle = document.getElementById('hl-toggle-fanatique');
  var toggleLabel = document.getElementById('hl-toggle-fanatique-label');
  var nbTotal = parseInt(document.getElementById('hl-nb-joueurs').value);
  var nbVirus = parseInt(document.getElementById('hl-nb-virus').value);

  if (hlConfigFanatique === 1) {
    hlConfigFanatique = 0;
    toggle.classList.remove('active');
    toggleLabel.classList.remove('active');
    toggleLabel.textContent = t('zeroFanatic');
  } else {
    if (nbTotal < 7) {
      showNotif(t('notEnoughFanatic'), 'warn');
      return;
    }
    if (nbVirus + hlConfigJournaliste + 1 >= nbTotal) {
      showNotif(t('notEnoughFanatic'), 'warn');
      return;
    }
    hlConfigFanatique = 1;
    toggle.classList.add('active');
    toggleLabel.classList.add('active');
    toggleLabel.textContent = t('oneFanatic');
  }
  majConfigHL();
}

function toggleEspionHL() {
  var toggle = document.getElementById('hl-toggle-espion');
  var toggleLabel = document.getElementById('hl-toggle-espion-label');
  var nbTotal = parseInt(document.getElementById('hl-nb-joueurs').value);
  var nbVirus = parseInt(document.getElementById('hl-nb-virus').value);

  if (hlConfigEspion === 1) {
    hlConfigEspion = 0;
    toggle.classList.remove('active');
    toggleLabel.classList.remove('active');
    toggleLabel.textContent = t('zeroSpy');
  } else {
    if (nbTotal < 7) {
      showNotif(t('notEnoughSpy'), 'warn');
      return;
    }
    if (nbVirus + hlConfigJournaliste + hlConfigFanatique + 1 >= nbTotal) {
      showNotif(t('notEnoughSpy'), 'warn');
      return;
    }
    hlConfigEspion = 1;
    toggle.classList.add('active');
    toggleLabel.classList.add('active');
    toggleLabel.textContent = t('oneSpy');
  }
  majConfigHL();
}

function validerConfigHL() {
  var nbTotal = parseInt(document.getElementById('hl-nb-joueurs').value);
  var nbBots = nbTotal - 1;
  var nbVirus = parseInt(document.getElementById('hl-nb-virus').value);
  var nbJournaliste = hlConfigJournaliste;
  var nbFanatique = hlConfigFanatique;
  var nbEspion = hlConfigEspion;
  lancerHorsLigne(nbBots, nbVirus, nbJournaliste, nbFanatique, nbEspion);
}

function lancerHorsLigne(nbBots, nbVirus, nbJournaliste, nbFanatique, nbEspion) {
  nbBots = nbBots || 3;
  nbVirus = nbVirus || 1;
  nbJournaliste = (nbJournaliste !== undefined) ? nbJournaliste : 1;
  nbFanatique = (nbFanatique !== undefined) ? nbFanatique : 1;
  nbEspion = (nbEspion !== undefined) ? nbEspion : 1;

  modeHorsLigne = true;
  partieActuelleId = null;

  showScreen('jeu');
  jeuActif = true;

  // Reset position
  joueurX = 3800;
  joueurY = 3050;

  // Pseudo
  var pseudo = getPseudo() || t('player');
  var pseudoLabel = document.getElementById('joueur-pseudo-label');
  if (pseudoLabel) {
    pseudoLabel.textContent = pseudo;
    if (isAdmin()) {
      pseudoLabel.classList.add('pseudo-admin');
    } else {
      pseudoLabel.classList.remove('pseudo-admin');
    }
  }

  // Appliquer skin
  appliquerSkinPartout();
  updateJoueur();

  // Build collision
  requestAnimationFrame(function() {
    buildCollisionData();
  });

  // Creer les bots
  initBots(nbBots);

  // Attribution des roles
  var nbTotal = nbBots + 1; // bots + joueur
  var roles = [];
  for (var i = 0; i < nbTotal; i++) roles.push('innocent');

  // Placer les virus aleatoirement
  var indicesDisponibles = [];
  for (var i = 0; i < nbTotal; i++) indicesDisponibles.push(i);
  for (var v = 0; v < nbVirus; v++) {
    var pick = Math.floor(Math.random() * indicesDisponibles.length);
    roles[indicesDisponibles[pick]] = 'virus';
    indicesDisponibles.splice(pick, 1);
  }

  // Placer le(s) journaliste(s)
  for (var j = 0; j < nbJournaliste; j++) {
    if (indicesDisponibles.length === 0) break;
    var pick = Math.floor(Math.random() * indicesDisponibles.length);
    roles[indicesDisponibles[pick]] = 'journaliste';
    indicesDisponibles.splice(pick, 1);
  }

  // Placer le(s) fanatique(s) (role neutre)
  for (var f = 0; f < nbFanatique; f++) {
    if (indicesDisponibles.length === 0) break;
    var pickF = Math.floor(Math.random() * indicesDisponibles.length);
    roles[indicesDisponibles[pickF]] = 'fanatique';
    indicesDisponibles.splice(pickF, 1);
  }

  // Placer le(s) espion(s) (role neutre)
  for (var es = 0; es < nbEspion; es++) {
    if (indicesDisponibles.length === 0) break;
    var pickE = Math.floor(Math.random() * indicesDisponibles.length);
    roles[indicesDisponibles[pickE]] = 'espion';
    indicesDisponibles.splice(pickE, 1);
  }

  // Le joueur est l'index 0
  monRole = roles[0];
  // Attribuer les roles aux bots
  for (var b = 0; b < bots.length; b++) {
    bots[b].role = roles[b + 1];
  }

  // Les bots espion choisissent aleatoirement un camp (avant coloration)
  for (var be0 = 0; be0 < bots.length; be0++) {
    if (bots[be0].role === 'espion') {
      bots[be0].espionCamp = Math.random() < 0.5 ? 'virus' : 'innocent';
    }
  }

  // Si le joueur est virus, colorer les pseudos des allies virus en rouge
  if (monRole === 'virus') {
    for (var bv = 0; bv < bots.length; bv++) {
      if (bots[bv].role === 'virus') {
        var pseudoEl = bots[bv].element.querySelector('.joueur-pseudo');
        if (pseudoEl) pseudoEl.style.color = '#e74c3c';
      }
    }
    // Si le joueur est virus, colorer les espions (camp virus) en violet
    for (var be2 = 0; be2 < bots.length; be2++) {
      if (bots[be2].role === 'espion' && bots[be2].espionCamp === 'virus') {
        var pseudoElE = bots[be2].element.querySelector('.joueur-pseudo');
        if (pseudoElE) pseudoElE.style.color = '#8e44ad';
      }
    }
  }

  // Afficher le role dans le HUD
  var roleEl = document.getElementById('hud-role');
  if (roleEl) {
    roleEl.className = 'hud-role hud-role-' + monRole;
    if (monRole === 'virus') { roleEl.textContent = t('roleVirus'); }
    else if (monRole === 'journaliste') { roleEl.textContent = t('roleJournalist'); }
    else if (monRole === 'fanatique') { roleEl.textContent = t('roleFanatic'); }
    else if (monRole === 'espion') { roleEl.textContent = t('roleSpy'); }
    else { roleEl.textContent = t('roleInnocent'); }
  }

  // Sauvegarder tous les joueurs pour l'ecran de fin
  tousLesJoueursPartie = [];
  tousLesJoueursPartie.push({ pseudo: pseudo, skin: getSkinFichier(getSkin()), role: monRole, estBot: false });
  for (var tj = 0; tj < bots.length; tj++) {
    tousLesJoueursPartie.push({ pseudo: bots[tj].pseudo, skin: bots[tj].skin, role: bots[tj].role, estBot: true });
  }

  // Notification role
  if (monRole === 'virus') {
    var aliesVirus = [];
    for (var av = 0; av < bots.length; av++) {
      if (bots[av].role === 'virus') aliesVirus.push(bots[av].pseudo);
    }
    if (aliesVirus.length > 0) {
      showNotif(t('youAreVirusAllies', aliesVirus.join(', ')), 'warn');
    } else {
      showNotif(t('youAreOnlyVirus'), 'warn');
    }
  } else if (monRole === 'journaliste') {
    showNotif(t('youAreJournalist', nbVirus), 'info');
    botsEnquetes = [];
    enquetesRestantes = nbVirus;
  } else if (monRole === 'fanatique') {
    showNotif(t('youAreFanatic'), 'info');
  } else if (monRole === 'espion') {
    showNotif(t('youAreSpy'), 'info');
    var overlay = document.getElementById('espion-choix-overlay');
    if (overlay) overlay.style.display = 'flex';
  } else {
    showNotif(t('youAreInnocent'), 'info');
  }

  // Reset eliminations
  joueursElimines = [];
  botsMorts = [];
  for (var ci = 0; ci < cadavres.length; ci++) {
    if (cadavres[ci].element && cadavres[ci].element.parentNode) cadavres[ci].element.parentNode.removeChild(cadavres[ci].element);
  }
  cadavres = [];
  killCooldown = false;
  if (killCountdownInterval) { clearInterval(killCountdownInterval); killCountdownInterval = null; }
  var cdElReset = document.getElementById('kill-countdown');
  if (cdElReset) cdElReset.style.display = 'none';
  botKillCooldowns = {};
  botSignaleCooldown = false;
  botsEnquetes = [];
  reunionEnCours = false;
  reunionCooldown = false;
  voteTermine = false;
  voteChoisi = -1;
  joueurAVote = false;
  if (reunionTimer) { clearInterval(reunionTimer); reunionTimer = null; }
  // Retirer le visuel fantome du joueur (si mort dans la partie precedente)
  var joueurEl = document.getElementById('joueur');
  if (joueurEl) joueurEl.classList.remove('bot-mort');

  // Protection de 7 secondes au debut
  activerKillProtection();

  // Missions
  initMissions();

  // Game loop
  gameLoop();
}

function lancerJeu() {
  // Mode en ligne : demarrer la partie (host assigne les roles)
  if (partieActuelleId && !modeHorsLigne) {
    if (!estHost) { showNotif(t('mjHostOnly'), 'warn'); return; }
    if (firebasePartyPlayers.length < 4) { showNotif(t('need4Players'), 'warn'); return; }

    // Assigner les roles cote client (host)
    var partyData = firebaseParties.find(function(p) { return p._id === partieActuelleId; });
    var nbVirus = partyData ? partyData.mechants : 1;
    var hasJournaliste = partyData ? partyData.journaliste : false;
    var hasFanatique = partyData ? partyData.fanatique : false;
    var hasEspion = partyData ? partyData.espion : false;

    var roles = [];
    for (var v = 0; v < nbVirus; v++) roles.push('virus');
    if (hasJournaliste) roles.push('journaliste');
    if (hasFanatique) roles.push('fanatique');
    if (hasEspion) roles.push('espion');
    while (roles.length < firebasePartyPlayers.length) roles.push('innocent');

    // Melanger les roles
    for (var i = roles.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = roles[i]; roles[i] = roles[j]; roles[j] = tmp;
    }

    // Assigner a chaque joueur
    var batch = db.batch();
    firebasePartyPlayers.forEach(function(p, idx) {
      if (p._docId) {
        batch.update(db.collection('partyPlayers').doc(p._docId), {
          role: roles[idx], alive: true, x: 3800, y: 3050
        });
      }
    });
    batch.update(db.collection('parties').doc(partieActuelleId), { phase: 'playing' });
    batch.commit().catch(function() { showNotif(t('mjConnError'), 'warn'); });
    return;
  }

  // Mode hors ligne : demarrage local (inchange)

  showScreen('jeu');
  jeuActif = true;
  // Reset UI reunion au demarrage
  var skipBtn = document.getElementById('reunion-btn-skip');
  if (skipBtn) skipBtn.classList.remove('visible');
  var bandeauR = document.getElementById('reunion-bandeau');
  if (bandeauR) bandeauR.classList.remove('visible');
  var chatR = document.getElementById('reunion-chat');
  if (chatR) chatR.classList.remove('visible');
  var resultatR = document.getElementById('reunion-resultat');
  if (resultatR) { resultatR.classList.remove('visible'); resultatR.style.display = 'none'; }

  // Attribution des roles
  var nbMechants = 1;
  if (partieActuelleId) {
    var pp = getParties();
    for (var ri = 0; ri < pp.length; ri++) {
      if (pp[ri].id === partieActuelleId) { nbMechants = pp[ri].mechants || 1; break; }
    }
  }
  // Creer la liste des roles : X virus, 1 journaliste, reste innocents
  var nbTotal = 4; // simule un minimum de 4 joueurs
  if (partieActuelleId) {
    var pt = getParties();
    for (var ti = 0; ti < pt.length; ti++) {
      if (pt[ti].id === partieActuelleId) { nbTotal = pt[ti].joueurs || 4; break; }
    }
  }
  if (nbTotal < 4) nbTotal = 4;
  var roleEl = document.getElementById('hud-role');

  // Reset position
  joueurX = 3800;
  joueurY = 3050;
  // Afficher le pseudo au-dessus du joueur
  var pseudo = getPseudo() || t('player');
  var pseudoLabel = document.getElementById('joueur-pseudo-label');
  if (pseudoLabel) {
    pseudoLabel.textContent = pseudo;
    if (isAdmin()) {
      pseudoLabel.classList.add('pseudo-admin');
    } else {
      pseudoLabel.classList.remove('pseudo-admin');
    }
  }
  // Appliquer le skin
  appliquerSkinPartout();
  updateJoueur();
  // Build collision data after render
  requestAnimationFrame(function() {
    buildCollisionData();
  });
  // Reset eliminations
  joueursElimines = [];
  botsMorts = [];
  for (var ci = 0; ci < cadavres.length; ci++) {
    if (cadavres[ci].element && cadavres[ci].element.parentNode) cadavres[ci].element.parentNode.removeChild(cadavres[ci].element);
  }
  cadavres = [];
  killCooldown = false;
  if (killCountdownInterval) { clearInterval(killCountdownInterval); killCountdownInterval = null; }
  botKillCooldowns = {};
  botSignaleCooldown = false;
  reunionEnCours = false;
  reunionCooldown = false;
  voteTermine = false;
  voteChoisi = -1;
  joueurAVote = false;
  if (reunionTimer) { clearInterval(reunionTimer); reunionTimer = null; }

  // Creer des bots pour simuler les autres joueurs en ligne
  initBots(nbTotal - 1);
  // Attribuer les roles aux bots
  var rolesOnline = [];
  for (var ro = 0; ro < nbTotal; ro++) rolesOnline.push('innocent');
  var indicesOnline = [];
  for (var io = 0; io < nbTotal; io++) indicesOnline.push(io);
  // Placer les virus
  for (var vo = 0; vo < nbMechants; vo++) {
    if (indicesOnline.length === 0) break;
    var pickV = Math.floor(Math.random() * indicesOnline.length);
    rolesOnline[indicesOnline[pickV]] = 'virus';
    indicesOnline.splice(pickV, 1);
  }
  // Placer 1 journaliste
  if (indicesOnline.length > 0) {
    var pickJ = Math.floor(Math.random() * indicesOnline.length);
    rolesOnline[indicesOnline[pickJ]] = 'journaliste';
    indicesOnline.splice(pickJ, 1);
  }
  // Placer 1 fanatique (role neutre)
  if (indicesOnline.length > 0) {
    var pickF = Math.floor(Math.random() * indicesOnline.length);
    rolesOnline[indicesOnline[pickF]] = 'fanatique';
    indicesOnline.splice(pickF, 1);
  }
  // Placer 1 espion (role neutre)
  if (indicesOnline.length > 0) {
    var pickE = Math.floor(Math.random() * indicesOnline.length);
    rolesOnline[indicesOnline[pickE]] = 'espion';
    indicesOnline.splice(pickE, 1);
  }
  // Index 0 = joueur, reste = bots
  monRole = rolesOnline[0];
  for (var bo = 0; bo < bots.length; bo++) {
    bots[bo].role = rolesOnline[bo + 1];
  }

  // Les bots espion choisissent aleatoirement un camp (avant coloration)
  for (var be0 = 0; be0 < bots.length; be0++) {
    if (bots[be0].role === 'espion') {
      bots[be0].espionCamp = Math.random() < 0.5 ? 'virus' : 'innocent';
    }
  }

  // Mettre a jour le HUD du role
  if (roleEl) {
    roleEl.className = 'hud-role hud-role-' + monRole;
    if (monRole === 'virus') { roleEl.textContent = t('roleVirus'); }
    else if (monRole === 'journaliste') { roleEl.textContent = t('roleJournalist'); }
    else if (monRole === 'fanatique') { roleEl.textContent = t('roleFanatic'); }
    else if (monRole === 'espion') { roleEl.textContent = t('roleSpy'); }
    else { roleEl.textContent = t('roleInnocent'); }
  }
  // Si virus, colorer les allies
  if (monRole === 'virus') {
    for (var bvo = 0; bvo < bots.length; bvo++) {
      if (bots[bvo].role === 'virus') {
        var pseudoElV = bots[bvo].element.querySelector('.joueur-pseudo');
        if (pseudoElV) pseudoElV.style.color = '#e74c3c';
      }
    }
    // Si le joueur est virus, colorer les espions (camp virus) en violet
    for (var be2 = 0; be2 < bots.length; be2++) {
      if (bots[be2].role === 'espion' && bots[be2].espionCamp === 'virus') {
        var pseudoElE = bots[be2].element.querySelector('.joueur-pseudo');
        if (pseudoElE) pseudoElE.style.color = '#8e44ad';
      }
    }
  }
  // Notification role
  if (monRole === 'virus') {
    showNotif(t('youAreTheVirus'), 'warn');
  } else if (monRole === 'journaliste') {
    showNotif(t('youAreJournalist', nbMechants), 'info');
    botsEnquetes = [];
    enquetesRestantes = nbMechants;
    setTimeout(function() { ouvrirPouvoirJournaliste(nbTotal); }, 1500);
  } else if (monRole === 'fanatique') {
    showNotif(t('youAreFanatic'), 'info');
  } else if (monRole === 'espion') {
    showNotif(t('youAreSpy'), 'info');
    var overlayE = document.getElementById('espion-choix-overlay');
    if (overlayE) overlayE.style.display = 'flex';
  } else {
    showNotif(t('youAreInnocent'), 'info');
  }

  // Sauvegarder tous les joueurs
  tousLesJoueursPartie = [];
  var pseudoJoueur = getPseudo() || t('player');
  tousLesJoueursPartie.push({ pseudo: pseudoJoueur, skin: getSkinFichier(getSkin()), role: monRole, estBot: false });
  for (var tjo = 0; tjo < bots.length; tjo++) {
    tousLesJoueursPartie.push({ pseudo: bots[tjo].pseudo, skin: bots[tjo].skin, role: bots[tjo].role, estBot: true });
  }

  // Initialiser les missions (4 aleatoires)
  initMissions();
  // Jauge collective de missions (mode en ligne)
  totalMissionsCollectives = nbTotal * 4;
  missionsCollectivesCompletees = 0;
  updateJaugeMissions();
  demarrerSimulationMissions(nbTotal - 1);
  gameLoop();
}

var reunionCooldown = false;
var REUNION_COOLDOWN_MS = 10000; // 10 secondes entre reunions
var reunionCreateur = ''; // pseudo de celui qui a declenche la reunion

function demanderReunion() {
  if (reunionEnCours) return;
  var pseudo = getPseudo() || t('player');
  if (joueursElimines.indexOf(pseudo) >= 0) {
    showNotif(t('ghostsCantMeet'), 'warn');
    return;
  }
  if (reunionCooldown) {
    showNotif(t('waitBeforeMeeting'), 'warn');
    return;
  }

  // Mode multiplayer : creer une reunion sur Firebase
  if (partieActuelleId && !modeHorsLigne) {
    db.collection('meetings').add({
      partyId: partieActuelleId,
      initiatorPlayerId: monPlayerId,
      reason: 'emergency',
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      db.collection('parties').doc(partieActuelleId).update({ phase: 'meeting' });
    }).catch(function() {});
    return;
  }

  // Mode hors ligne : logique locale
  showNotif(t('emergencyMeetingNotif'), 'warn');
  reunionCreateur = pseudo;
  if (camerasOuvertes) fermerCameras();
  jeuActif = false;
  setTimeout(function() {
    try { ouvrirReunion(); } catch(e) { jeuActif = true; reunionEnCours = false; gameLoop(); }
  }, 500);
}

function gameLoop() {
  if (!jeuActif) return;

  var moved = false;
  var dx = 0, dy = 0;

  // Bloquer le mouvement joueur si cameras ouvertes ou mini-jeu ouvert
  var cachedSkinImg = document.getElementById('joueur-skin-img');
  if (!camerasOuvertes && !miniJeuOuvert) {
    // ZQSD + Fleches
    if (keys['z'] || keys['Z'] || keys['ArrowUp']) { dy -= vitesse; }
    if (keys['s'] || keys['S'] || keys['ArrowDown']) { dy += vitesse; }
    if (keys['q'] || keys['Q'] || keys['ArrowLeft']) {
      dx -= vitesse;
      if (cachedSkinImg) cachedSkinImg.style.transform = 'scaleX(-1)';
    }
    if (keys['d'] || keys['D'] || keys['ArrowRight']) {
      dx += vitesse;
      if (cachedSkinImg) cachedSkinImg.style.transform = 'scaleX(1)';
    }
    // Deplacement mobile : vers le doigt
    if (touchActif) {
      var tdx = touchTargetX - joueurX;
      var tdy = touchTargetY - joueurY;
      var tdist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tdist > 8) {
        dx += (tdx / tdist) * vitesse;
        dy += (tdy / tdist) * vitesse;
        if (tdx < -0.5) {
          if (cachedSkinImg) cachedSkinImg.style.transform = 'scaleX(-1)';
        } else if (tdx > 0.5) {
          if (cachedSkinImg) cachedSkinImg.style.transform = 'scaleX(1)';
        }
      }
    }
  }

  // Fantomes se deplacent 1.5x plus vite
  var estFantome = joueursElimines.indexOf(getPseudo() || t('player')) >= 0;
  if (estFantome) { dx *= 1.5; dy *= 1.5; }

  if (dx !== 0 || dy !== 0) moved = true;
  if (dx !== 0) {
    var newX = joueurX + dx;
    if (estFantome || collisionRects.length === 0 || !checkCollision(newX, joueurY)) {
      joueurX = newX;
    }
  }
  // Collision Y
  if (dy !== 0) {
    var newY = joueurY + dy;
    if (estFantome || collisionRects.length === 0 || !checkCollision(joueurX, newY)) {
      joueurY = newY;
    }
  }

  // Limites de la map
  if (joueurX < 25) joueurX = 25;
  if (joueurX > MAP_W - 40) joueurX = MAP_W - 40;
  if (joueurY < 25) joueurY = 25;
  if (joueurY > MAP_H - 40) joueurY = MAP_H - 40;

  if (moved) {
    updateJoueur();
    // Envoyer position via Firebase en mode multijoueur (throttle 200ms)
    if (partieActuelleId && !modeHorsLigne && myPartyPlayerDocId && Date.now() - lastPositionSend > 200) {
      lastPositionSend = Date.now();
      var dir = cachedSkinImg && cachedSkinImg.style.transform === 'scaleX(-1)' ? -1 : 1;
      db.collection('partyPlayers').doc(myPartyPlayerDocId).update({
        x: joueurX, y: joueurY, direction: dir
      }).catch(function() {});
    }
  }

  // Mettre a jour les joueurs distants en mode multiplayer
  if (!modeHorsLigne && partieActuelleId) {
    updateRemotePlayers();
  }

  // Proximite fontaine -> bouton reunion
  var fontCX = 3800, fontCY = 2800;
  var distFontaine = Math.sqrt((joueurX - fontCX) * (joueurX - fontCX) + (joueurY - fontCY) * (joueurY - fontCY));
  var btnReunion = document.getElementById('btn-reunion');
  if (btnReunion) {
    btnReunion.style.display = (distFontaine < 200 && !killProtection && !reunionCooldown) ? 'block' : 'none';
  }

  // Proximite mission -> bouton faire la tache (distance a la caisse)
  var btnMission = document.getElementById('btn-mission');
  var ancienMissionProche = missionProche;
  missionProche = -1;
  if (btnMission) {
    var distSeuil = 80;
    for (var mi = 0; mi < mesMissions.length; mi++) {
      if (mesMissions[mi].faite) continue;
      var dcx = joueurX - mesMissions[mi].caisseX;
      var dcy = joueurY - mesMissions[mi].caisseY;
      var distCaisse = Math.sqrt(dcx * dcx + dcy * dcy);
      if (distCaisse < distSeuil) {
        missionProche = mi;
        break;
      }
    }
    if (!missionEnCours) {
      btnMission.style.display = (missionProche >= 0) ? 'block' : 'none';
    } else if (missionProche < 0 && !miniJeuOuvert) {
      // Le joueur s'est eloigne pendant le timer -> annuler
      if (missionTimer) { clearTimeout(missionTimer); missionTimer = null; }
      missionEnCours = false;
      resetBtnMission(btnMission);
      btnMission.style.display = 'none';
    }
  }

  // Proximite poste de securite -> bouton cameras
  var btnCam = document.getElementById('btn-cameras');
  if (btnCam) {
    var sr = SECURITE_RECT;
    var margeCam = 80;
    var dansSecurite = joueurX >= sr.x - margeCam && joueurX <= sr.x + sr.w + margeCam &&
                       joueurY >= sr.y - margeCam && joueurY <= sr.y + sr.h + margeCam;
    btnCam.style.display = (dansSecurite && !camerasOuvertes && !reunionEnCours) ? 'block' : 'none';
  }

  // Mise a jour des bots
  if (bots.length > 0) {
    updateBots();
    botsVirusTuent();
    botsDetectentCadavres();
  }

  // Fantomes se voient entre eux
  if (botsMorts.length > 0) {
    var joueurEstMort = joueursElimines.indexOf(getPseudo() || t('player')) >= 0;
    for (var fm = 0; fm < botsMorts.length; fm++) {
      if (botsMorts[fm].element) {
        if (joueurEstMort) {
          botsMorts[fm].element.classList.add('fantome-visible');
        } else {
          botsMorts[fm].element.classList.remove('fantome-visible');
        }
      }
    }
  }

  // Detection allies virus proches
  if (bots.length > 0 && monRole === 'virus') {
    detecterVirusProches();
  }

  // Bouton KILL pour le joueur virus
  if (bots.length > 0 && monRole === 'virus') {
    detecterCibleKill();
    var btnKill = document.getElementById('btn-kill');
    if (btnKill) {
      btnKill.style.display = (killCiblePseudo && !killCooldown && !killProtection) ? 'block' : 'none';
    }
  }

  // Bouton SIGNALER pour cadavres
  if (bots.length > 0) {
    detecterCadavreProche();
    var btnSignaler = document.getElementById('btn-signaler');
    if (btnSignaler) {
      btnSignaler.style.display = (cadavreProche >= 0) ? 'block' : 'none';
    }
  }

  // Bouton ENQUETER pour le journaliste
  if (bots.length > 0 && monRole === 'journaliste') {
    detecterCibleEnquete();
    var btnEnqueter = document.getElementById('btn-enqueter');
    if (btnEnqueter) {
      btnEnqueter.style.display = (enqueteCiblePseudo) ? 'block' : 'none';
    }
  }

  requestAnimationFrame(gameLoop);
}

function updateJoueur() {
  var joueur = document.getElementById('joueur');
  if (!joueur) return;
  joueur.style.left = joueurX + 'px';
  joueur.style.top = joueurY + 'px';

  // Camera - centrer la vue sur le joueur
  var viewport = document.getElementById('jeu-viewport');
  if (!viewport) return;
  var vw = viewport.clientWidth;
  var vh = viewport.clientHeight;

  var camX = joueurX - vw / 2 + 14;
  var camY = joueurY - vh / 2 + 14;

  // Limiter la camera aux bords de la map
  if (camX < 0) camX = 0;
  if (camY < 0) camY = 0;
  if (camX > MAP_W - vw) camX = MAP_W - vw;
  if (camY > MAP_H - vh) camY = MAP_H - vh;

  var map = document.getElementById('mall-map');
  map.style.left = -camX + 'px';
  map.style.top = -camY + 'px';

  // Minimap
  var miniPt = document.getElementById('minimap-point');
  if (miniPt) {
    miniPt.style.left = (joueurX / MAP_W * 100) + '%';
    miniPt.style.top = (joueurY / MAP_H * 100) + '%';
  }
}

// Quitter le jeu
function quitterJeu() {
  jeuActif = false;
  keys = {};
  touchActif = false;
  if (miniJeuOuvert) fermerMiniJeu();
  if (camerasOuvertes) fermerCameras();
  // Retirer le visuel fantome du joueur
  var joueurEl = document.getElementById('joueur');
  if (joueurEl) joueurEl.classList.remove('bot-mort');
  // Nettoyer les timers de reunion (si quitter pendant une reunion)
  if (reunionTimer) { clearInterval(reunionTimer); reunionTimer = null; }
  for (var ct = 0; ct < botsChatTimers.length; ct++) clearTimeout(botsChatTimers[ct]);
  botsChatTimers = [];
  reunionEnCours = false;
  // Nettoyer cadavres du DOM
  for (var ci = 0; ci < cadavres.length; ci++) {
    if (cadavres[ci].element && cadavres[ci].element.parentNode) {
      cadavres[ci].element.parentNode.removeChild(cadavres[ci].element);
    }
  }
  cadavres = [];
  // Reset kill state
  killCooldown = false;
  botKillCooldowns = {};
  if (killCountdownInterval) { clearInterval(killCountdownInterval); killCountdownInterval = null; }
  // Reset mission en cours
  if (missionTimer) { clearTimeout(missionTimer); missionTimer = null; }
  missionEnCours = false;
  var btnM = document.getElementById('btn-mission');
  if (btnM) { resetBtnMission(btnM); btnM.style.display = 'none'; }
  // Retirer highlights caisse
  document.querySelectorAll('.caisse-cible').forEach(function(c) { c.classList.remove('caisse-cible'); });
  // Arreter la simulation de missions
  arreterSimulationMissions();
  if (modeHorsLigne) {
    nettoyerBots();
    modeHorsLigne = false;
    showScreen('menu-principal');
  } else {
    // En mode online, le joueur qui quitte est considere comme mort
    var pseudoQuitte = getPseudo() || t('player');
    if (joueursElimines.indexOf(pseudoQuitte) < 0) {
      joueursElimines.push(pseudoQuitte);
    }
    nettoyerBots();
    showScreen('salle-attente');
  }
}

// ============================
// DEPLACEMENT SALLE D'ATTENTE
// ============================
var saJoueurX = 50; // % depuis la gauche
var saJoueurY = 70; // % depuis le haut
var salleActif = false;
var SA_VITESSE = 0.5;
var saDirection = 1; // 1 = droite, -1 = gauche
var salleAnimFrame = null;

function updateSallePosition() {
  var avatar = document.getElementById('sa-mon-avatar');
  if (!avatar) return;
  avatar.style.left = saJoueurX + '%';
  avatar.style.top = saJoueurY + '%';
  avatar.style.bottom = 'auto';
  // Retourner le skin selon la direction
  var skinImg = document.getElementById('sa-avatar-skin-img');
  if (skinImg) {
    skinImg.style.transform = saDirection === -1 ? 'scaleX(-1)' : 'scaleX(1)';
  }
}

function salleLoop() {
  if (!salleActif) { salleAnimFrame = null; return; }

  var moved = false;
  // Clavier
  if (keys['z'] || keys['Z'] || keys['ArrowUp']) { saJoueurY -= SA_VITESSE; moved = true; }
  if (keys['s'] || keys['S'] || keys['ArrowDown']) { saJoueurY += SA_VITESSE; moved = true; }
  if (keys['q'] || keys['Q'] || keys['ArrowLeft']) { saJoueurX -= SA_VITESSE; moved = true; saDirection = -1; }
  if (keys['d'] || keys['D'] || keys['ArrowRight']) { saJoueurX += SA_VITESSE; moved = true; saDirection = 1; }

  // Tactile mobile : se diriger vers le doigt
  if (saTouchActif) {
    var dx = saTouchTargetX - saJoueurX;
    var dy = saTouchTargetY - saJoueurY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      saJoueurX += (dx / dist) * SA_VITESSE;
      saJoueurY += (dy / dist) * SA_VITESSE;
      if (dx < 0) saDirection = -1;
      if (dx > 0) saDirection = 1;
      moved = true;
    }
  }

  // Limites
  if (saJoueurX < 2) saJoueurX = 2;
  if (saJoueurX > 95) saJoueurX = 95;
  if (saJoueurY < 10) saJoueurY = 10;
  if (saJoueurY > 85) saJoueurY = 85;

  if (moved) {
    updateSallePosition();
    // Envoyer la position via Firebase (throttle 200ms)
    if (partieActuelleId && !modeHorsLigne && myPartyPlayerDocId && Date.now() - lastSaPositionSend > 200) {
      lastSaPositionSend = Date.now();
      db.collection('partyPlayers').doc(myPartyPlayerDocId).update({
        saX: saJoueurX, saY: saJoueurY
      }).catch(function() {});
    }
  }
  salleAnimFrame = requestAnimationFrame(salleLoop);
}

// Deplacement tactile dans la salle d'attente (mobile)
var saTouchActif = false;
var saTouchTargetX = 50, saTouchTargetY = 70;

if (isMobile) {
  var salleEl = document.getElementById('salle-attente');
  if (salleEl) {
    salleEl.addEventListener('touchstart', function(e) {
      if (!salleActif) return;
      // Ne pas intercepter les clics sur les boutons/chat/panneaux
      var el = e.target.closest('button, input, .sa-chat, .sa-panneau-joueurs, .sa-droite, .sa-gauche, .panel-amis, #btn-amis');
      if (el) return;
      e.preventDefault();
      saTouchActif = true;
      updateSaTouchTarget(e);
    }, { passive: false });
    salleEl.addEventListener('touchmove', function(e) {
      if (!saTouchActif) return;
      e.preventDefault();
      updateSaTouchTarget(e);
    }, { passive: false });
    salleEl.addEventListener('touchend', function() {
      saTouchActif = false;
    }, { passive: false });
    salleEl.addEventListener('touchcancel', function() {
      saTouchActif = false;
    }, { passive: false });
  }
}

function updateSaTouchTarget(e) {
  var touch = e.touches[0];
  if (!touch) return;
  var salleEl = document.getElementById('salle-attente');
  if (!salleEl) return;
  var rect = salleEl.getBoundingClientRect();
  // Convertir en pourcentage
  saTouchTargetX = ((touch.clientX - rect.left) / rect.width) * 100;
  saTouchTargetY = ((touch.clientY - rect.top) / rect.height) * 100;
  // Limites
  if (saTouchTargetX < 2) saTouchTargetX = 2;
  if (saTouchTargetX > 95) saTouchTargetX = 95;
  if (saTouchTargetY < 10) saTouchTargetY = 10;
  if (saTouchTargetY > 85) saTouchTargetY = 85;
}

// Son SELECT sur les boutons de menu
document.addEventListener('click', function(e) {
  var el = e.target.closest('button, .btn, .btn-retour, .lang-btn, .boutique-tab, .toggle-role, .btn-rejoindre, .btn-demarrer, .skin-carte-btn');
  if (!el) return;
  // Ne pas jouer dans le jeu (sauf reunion)
  var ecranJeu = document.getElementById('jeu');
  if (ecranJeu && ecranJeu.classList.contains('active') && !reunionEnCours) return;
  try { var sSelect = new Audio('Audio/SELECT.mp3'); sSelect.volume = 0.35; sSelect.play(); } catch(e) {}
});
