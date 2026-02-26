// ============================
// SYSTEME DE REUNION
// ============================
var joueursReunion = [];
var joueursElimines = [];
var tousLesJoueursPartie = []; // sauvegarde de tous les joueurs au debut de la partie
var positionsAvantReunion = {}; // sauvegarder les positions avant teleportation
var joueurAVote = false;
var nbVotesTotal = 0;
var votesParJoueur = []; // votes[i] = nombre de votes recus par joueur i

function ouvrirReunion() {
  if (reunionEnCours) return;
  if (miniJeuOuvert) pauserMiniJeu();
  reunionEnCours = true;
  voteChoisi = -1;
  joueurAVote = false;
  nbVotesTotal = 0;
  voteTermine = false;

  // Son reunion d'urgence
  try { var sReunion = new Audio("Audio/reunion-urgence.mp3"); sReunion.volume = 0.6; sReunion.play(); } catch(e) {}

  // Stopper le deplacement tactile pendant la reunion
  touchActif = false;
  // Fermer les cameras si elles sont ouvertes
  if (camerasOuvertes) fermerCameras();

  // Supprimer tous les cadavres de la map AVANT teleportation
  for (var ci = 0; ci < cadavres.length; ci++) {
    if (cadavres[ci].element && cadavres[ci].element.parentNode) {
      cadavres[ci].element.parentNode.removeChild(cadavres[ci].element);
    }
  }
  cadavres = [];

  // Construire la liste des joueurs
  joueursReunion = [];
  var pseudo = getPseudo() || t('player');
  joueursReunion.push({
    pseudo: pseudo,
    skin: getSkinFichier(getSkin()),
    role: monRole,
    estBot: false,
    elimine: joueursElimines.indexOf(pseudo) >= 0,
    elementId: 'joueur'
  });
  if (bots.length > 0) {
    for (var i = 0; i < bots.length; i++) {
      joueursReunion.push({
        pseudo: bots[i].pseudo,
        skin: bots[i].skin,
        role: bots[i].role,
        estBot: true,
        elimine: joueursElimines.indexOf(bots[i].pseudo) >= 0,
        elementId: bots[i].id
      });
    }
  }

  // Init votes
  votesParJoueur = [];
  for (var vi = 0; vi < joueursReunion.length; vi++) {
    votesParJoueur.push(0);
  }

  // Sauvegarder positions et teleporter autour de la fontaine
  var fontCX = 3800, fontCY = 2800;
  var rayon = isMobile ? 180 : 220;
  var nbJoueurs = joueursReunion.length;

  // Sauvegarder position joueur
  positionsAvantReunion.joueurX = joueurX;
  positionsAvantReunion.joueurY = joueurY;

  for (var j = 0; j < nbJoueurs; j++) {
    var angle = (j / nbJoueurs) * 2 * Math.PI - Math.PI / 2;
    var px = fontCX + Math.cos(angle) * rayon;
    var py = fontCY + Math.sin(angle) * rayon;

    if (j === 0) {
      // Teleporter le joueur
      joueurX = px;
      joueurY = py;
      updateJoueur();
    } else {
      // Teleporter les bots
      var botData = bots[j - 1];
      if (botData) {
        positionsAvantReunion[botData.id] = { x: botData.x, y: botData.y };
        botData.x = px;
        botData.y = py;
        botData.element.style.left = px + 'px';
        botData.element.style.top = py + 'px';
      }
    }
  }

  // Centrer la camera sur la fontaine
  var viewport = document.getElementById('jeu-viewport');
  var vw = viewport.clientWidth;
  var vh = viewport.clientHeight;
  var camOffsetY = isMobile ? 0 : -40;
  var camX = fontCX - vw / 2;
  var camY = fontCY - vh / 2 + camOffsetY;
  if (camX < 0) camX = 0;
  if (camY < 0) camY = 0;
  if (camX > MAP_W - vw) camX = MAP_W - vw;
  if (camY > MAP_H - vh) camY = MAP_H - vh;
  var map = document.getElementById('mall-map');
  map.style.left = -camX + 'px';
  map.style.top = -camY + 'px';

  // Le joueur est-il un fantome ?
  var joueurEstFantome = joueursElimines.indexOf(pseudo) >= 0;

  // Ajouter bulles de vote et rendre les bots cliquables
  for (var k = 0; k < joueursReunion.length; k++) {
    var el = document.getElementById(joueursReunion[k].elementId);
    if (!el) continue;

    // Ajouter bulle de vote
    var bulle = document.createElement('div');
    bulle.className = 'vote-bulle';
    bulle.id = 'vote-bulle-' + k;
    bulle.textContent = '0';
    el.appendChild(bulle);

    // Rendre cliquable (sauf si le joueur est fantome) - tout joueur peut s'auto-voter
    if (!joueurEstFantome) {
      el.classList.add('reunion-cliquable');
      el.setAttribute('data-reunion-idx', k);
      el.onclick = (function(idx) {
        return function() { voterPour(idx); };
      })(k);
    }
  }

  // Ajouter badge createur de reunion
  for (var cr = 0; cr < joueursReunion.length; cr++) {
    if (joueursReunion[cr].pseudo === reunionCreateur) {
      var elCr = document.getElementById(joueursReunion[cr].elementId);
      if (elCr) {
        var badgeCr = document.createElement('div');
        badgeCr.className = 'reunion-createur-badge';
        badgeCr.id = 'reunion-createur-badge';
        badgeCr.innerHTML = '&#128227;';
        elCr.appendChild(badgeCr);
      }
      break;
    }
  }

  // Afficher HUD reunion
  document.getElementById('reunion-bandeau').classList.add('visible');
  document.getElementById('reunion-chat').classList.add('visible');
  // Afficher le bouton toggle chat sur mobile (deplacer vers body)
  var reunionToggle = document.getElementById('reunion-chat-toggle');
  if (reunionToggle) {
    reunionToggle.classList.add('visible');
    if (typeof ouvrirReunionChatMobile === 'function') ouvrirReunionChatMobile();
  }
  // Masquer le skip si le joueur est fantome
  if (!joueurEstFantome) {
    document.getElementById('reunion-btn-skip').classList.add('visible');
  }
  document.getElementById('reunion-resultat').classList.remove('visible');
  document.getElementById('reunion-resultat').style.display = 'none';
  document.getElementById('reunion-chat-messages').innerHTML = '';

  // Masquer boutons de jeu et HUD inutile pendant la reunion
  var btnReunion = document.getElementById('btn-reunion');
  if (btnReunion) btnReunion.style.display = 'none';
  var btnMission = document.getElementById('btn-mission');
  if (btnMission) btnMission.style.display = 'none';
  var btnKillR = document.getElementById('btn-kill');
  if (btnKillR) btnKillR.style.display = 'none';
  var btnSignalerR = document.getElementById('btn-signaler');
  if (btnSignalerR) btnSignalerR.style.display = 'none';
  var cdElR = document.getElementById('kill-countdown');
  if (cdElR) cdElR.style.display = 'none';
  // Masquer missions et minimap pendant la reunion sur mobile
  var hudMissions = document.querySelector('.hud-missions');
  if (hudMissions) hudMissions.style.display = 'none';
  var minimap = document.querySelector('.minimap');
  if (minimap) minimap.style.display = 'none';
  if (killCountdownInterval) { clearInterval(killCountdownInterval); killCountdownInterval = null; }

  // Cadavres deja supprimes au debut de ouvrirReunion()

  // Afficher la liste des morts
  if (joueursElimines.length > 0) {
    ajouterMsgReunion(t('system'), t('meetDead', joueursElimines.join(', ')), '#e74c3c');
  }

  // Timer 60 secondes
  var tempsRestant = 60;
  document.getElementById('reunion-timer').textContent = tempsRestant;
  reunionTimer = setInterval(function() {
    tempsRestant--;
    document.getElementById('reunion-timer').textContent = tempsRestant;
    if (tempsRestant <= 10) {
      document.getElementById('reunion-timer').style.color = '#e74c3c';
    }
    if (tempsRestant <= 0) {
      clearInterval(reunionTimer);
      reunionTimer = null;
      if (!voteTermine) terminerVote();
    }
  }, 1000);

  // Bots votent apres un delai
  if (modeHorsLigne) {
    for (var bi = 0; bi < bots.length; bi++) {
      (function(botIndex) {
        var delai = 5000 + Math.floor(Math.random() * 30000);
        setTimeout(function() {
          if (!reunionEnCours) return;
          botVoter(botIndex);
          verifierTousOntVote();
        }, delai);
      })(bi);
    }
  }

  if (joueurEstFantome) {
    joueurAVote = true;
    nbVotesTotal++;
    ajouterMsgReunion(t('system'), t('meetYouAreGhost'), '#7f8c8d');
  }

  ajouterMsgReunion(t('system'), t('meetEmergency'), '#f39c12');

  // Lancer le chat IA des bots
  if (bots.length > 0) lancerChatBotsIA();
}

var botsChatTimers = [];

function lancerChatBotsIA() {
  // Nettoyer les anciens timers
  for (var ti = 0; ti < botsChatTimers.length; ti++) clearTimeout(botsChatTimers[ti]);
  botsChatTimers = [];

  var phrasesAccusation = t('botAccusation');
  var phrasesDefense = t('botDefense');
  var phrasesReaction = t('botReaction');
  var phrasesVirus = t('botVirus');
  var phrasesJournaliste = t('botJournalist');
  var phrasesFanatique = t('botFanatic');
  var phrasesEspion = t('botSpy');
  var phrasesCommentaire = t('botComment');

  var pseudoJoueur = getPseudo() || t('player');

  // Creer une file de messages : chaque bot parle a tour de role, 3-10s entre chaque
  var botsActifs = [];
  for (var b = 0; b < bots.length; b++) {
    if (joueursElimines.indexOf(bots[b].pseudo) >= 0) continue;
    botsActifs.push(bots[b]);
  }
  if (botsActifs.length === 0) return;

  var delaiCumule = 2000; // Premier message apres 2s
  // 3-5 messages par bot, melanges aleatoirement
  var fileMessages = [];
  for (var fb = 0; fb < botsActifs.length; fb++) {
    var nbMsg = 3 + Math.floor(Math.random() * 3); // 3-5 messages par bot
    for (var fm = 0; fm < nbMsg; fm++) fileMessages.push(botsActifs[fb]);
  }
  // Melanger l'ordre des messages
  for (var sh = fileMessages.length - 1; sh > 0; sh--) {
    var rIdx = Math.floor(Math.random() * (sh + 1));
    var tmp = fileMessages[sh]; fileMessages[sh] = fileMessages[rIdx]; fileMessages[rIdx] = tmp;
  }
  for (var m = 0; m < fileMessages.length; m++) {
    (function(msgIdx) {
      var bot = fileMessages[msgIdx];
      var timer = setTimeout(function() {
        if (!reunionEnCours) return;
        var msg;
        var rand = Math.random();

        // Cibles pour accusations/enquetes
        var cibles = [];
        for (var j = 0; j < bots.length; j++) {
          if (bots[j].pseudo !== bot.pseudo && joueursElimines.indexOf(bots[j].pseudo) < 0) cibles.push(bots[j].pseudo);
        }
        if (pseudoJoueur && joueursElimines.indexOf(pseudoJoueur) < 0) cibles.push(pseudoJoueur);
        var cible = cibles.length > 0 ? cibles[Math.floor(Math.random() * cibles.length)] : '';

        // Les virus essaient de devier l'attention
        if (bot.role === 'virus' && rand < 0.5) {
          msg = phrasesVirus[Math.floor(Math.random() * phrasesVirus.length)];
        } else if (bot.role === 'journaliste' && rand < 0.5) {
          msg = phrasesJournaliste[Math.floor(Math.random() * phrasesJournaliste.length)].replace('{c}', cible);
        } else if (bot.role === 'fanatique' && rand < 0.5) {
          msg = phrasesFanatique[Math.floor(Math.random() * phrasesFanatique.length)];
        } else if (bot.role === 'espion' && rand < 0.5) {
          msg = phrasesEspion[Math.floor(Math.random() * phrasesEspion.length)].replace('{c}', cible);
        } else if (rand < 0.4) {
          if (cibles.length > 0) {
            msg = phrasesAccusation[Math.floor(Math.random() * phrasesAccusation.length)].replace('{c}', cible);
          } else {
            msg = phrasesReaction[Math.floor(Math.random() * phrasesReaction.length)];
          }
        } else if (rand < 0.65) {
          msg = phrasesDefense[Math.floor(Math.random() * phrasesDefense.length)];
        } else if (phrasesCommentaire.length > 0 && Math.random() < 0.3) {
          msg = phrasesCommentaire[Math.floor(Math.random() * phrasesCommentaire.length)].replace('{c}', cible);
        } else {
          msg = phrasesReaction[Math.floor(Math.random() * phrasesReaction.length)];
        }

        ajouterMsgReunion(bot.pseudo, msg, '#95a5a6');
      }, delaiCumule);
      botsChatTimers.push(timer);
      delaiCumule += 3000 + Math.floor(Math.random() * 7000); // 3-10s entre chaque message
    })(m);
  }
}

function voterPour(index) {
  if (!reunionEnCours || joueurAVote) return;
  if (joueursReunion[index].elimine) return;
  // Les fantomes ne peuvent pas voter
  var pseudo = getPseudo() || t('player');
  if (joueursElimines.indexOf(pseudo) >= 0) {
    showNotif(t('ghostsCantVote'), 'warn');
    return;
  }

  // Deselectionner l'ancien
  if (voteChoisi >= 0) {
    var oldEl = document.getElementById(joueursReunion[voteChoisi].elementId);
    if (oldEl) oldEl.classList.remove('reunion-vote-selection');
  }

  // Selectionner le nouveau
  voteChoisi = index;
  var el = document.getElementById(joueursReunion[index].elementId);
  if (el) el.classList.add('reunion-vote-selection');

  // Son de vote
  try { new Audio('Audio/i-voted.mp3').play(); } catch(e) {}

  // Confirmer le vote immediatement
  joueurAVote = true;
  nbVotesTotal++;
  votesParJoueur[index]++;

  // Mettre a jour la bulle
  var bulle = document.getElementById('vote-bulle-' + index);
  if (bulle) {
    bulle.textContent = votesParJoueur[index];
    bulle.classList.add('has-votes');
  }

  // Masquer le skip
  document.getElementById('reunion-btn-skip').classList.remove('visible');

  ajouterMsgReunion(getPseudo() || t('player'), t('meetVoted'), '#e74c3c');

  // Retirer cliquable
  for (var i = 0; i < joueursReunion.length; i++) {
    var elem = document.getElementById(joueursReunion[i].elementId);
    if (elem) {
      elem.classList.remove('reunion-cliquable');
      elem.onclick = null;
    }
  }

  verifierTousOntVote();
}

function skipVote() {
  if (!reunionEnCours || joueurAVote) return;
  var pseudo = getPseudo() || t('player');
  if (joueursElimines.indexOf(pseudo) >= 0) {
    showNotif(t('ghostsCantVote'), 'warn');
    return;
  }
  // Son de vote
  try { new Audio('Audio/i-voted.mp3').play(); } catch(e) {}
  joueurAVote = true;
  nbVotesTotal++;

  document.getElementById('reunion-btn-skip').classList.remove('visible');
  ajouterMsgReunion(getPseudo() || t('player'), t('meetSkipped'), '#95a5a6');

  // Retirer cliquable
  for (var i = 0; i < joueursReunion.length; i++) {
    var elem = document.getElementById(joueursReunion[i].elementId);
    if (elem) {
      elem.classList.remove('reunion-cliquable');
      elem.onclick = null;
    }
  }

  verifierTousOntVote();
}

function botVoter(botIdx) {
  if (!reunionEnCours) return;
  var bot = bots[botIdx];
  if (!bot) return;

  var cibles = [];
  for (var i = 0; i < joueursReunion.length; i++) {
    if (!joueursReunion[i].elimine && joueursReunion[i].pseudo !== bot.pseudo) {
      cibles.push(i);
    }
  }
  if (cibles.length === 0) return;

  var cibleIdx;
  if (bot.role === 'fanatique') {
    // Le fanatique vote pour lui-meme (il veut etre elimine)
    for (var fi = 0; fi < joueursReunion.length; fi++) {
      if (joueursReunion[fi].pseudo === bot.pseudo && !joueursReunion[fi].elimine) { cibleIdx = fi; break; }
    }
    if (cibleIdx === undefined || cibleIdx === null) cibleIdx = cibles[Math.floor(Math.random() * cibles.length)];
  } else if (bot.role === 'virus') {
    var innocentCibles = cibles.filter(function(ci) { return joueursReunion[ci].role !== 'virus'; });
    cibleIdx = innocentCibles.length > 0 ? innocentCibles[Math.floor(Math.random() * innocentCibles.length)] : cibles[Math.floor(Math.random() * cibles.length)];
  } else {
    cibleIdx = cibles[Math.floor(Math.random() * cibles.length)];
  }

  if (cibleIdx === undefined || cibleIdx === null || cibleIdx < 0 || cibleIdx >= joueursReunion.length) return;
  nbVotesTotal++;
  votesParJoueur[cibleIdx]++;

  var bulle = document.getElementById('vote-bulle-' + cibleIdx);
  if (bulle) {
    bulle.textContent = votesParJoueur[cibleIdx];
    bulle.classList.add('has-votes');
  }
  ajouterMsgReunion(bot.pseudo, t('meetBotVoted'), '#95a5a6');
}

function verifierTousOntVote() {
  var nbJoueursActifs = 0;
  for (var i = 0; i < joueursReunion.length; i++) {
    if (!joueursReunion[i].elimine) nbJoueursActifs++;
  }
  if (nbVotesTotal >= nbJoueursActifs && !voteTermine) {
    clearInterval(reunionTimer);
    reunionTimer = null;
    setTimeout(function() { if (!voteTermine) terminerVote(); }, 1000);
  }
}

var voteTermine = false;
function terminerVote() {
  if (voteTermine) return;
  voteTermine = true;
  clearInterval(reunionTimer);
  reunionTimer = null;

  // Masquer skip
  document.getElementById('reunion-btn-skip').classList.remove('visible');

  // Compter les votes
  var maxVotes = 0;
  var maxIdx = -1;
  var egalite = false;
  for (var i = 0; i < votesParJoueur.length; i++) {
    if (votesParJoueur[i] > maxVotes) {
      maxVotes = votesParJoueur[i];
      maxIdx = i;
      egalite = false;
    } else if (votesParJoueur[i] === maxVotes && votesParJoueur[i] > 0) {
      egalite = true;
    }
  }

  var resultatDiv = document.getElementById('reunion-resultat');
  var texteEl = document.getElementById('reunion-resultat-texte');
  var roleEl = document.getElementById('reunion-resultat-role');

  if (maxVotes === 0 || egalite) {
    texteEl.textContent = t('meetNobodyElim');
    roleEl.textContent = '';
    roleEl.style.display = 'none';
    ajouterMsgReunion(t('system'), t('meetNoElim'), '#f39c12');
  } else {
    var elimine = joueursReunion[maxIdx];
    joueursElimines.push(elimine.pseudo);
    texteEl.textContent = t('wasEliminated', elimine.pseudo);
    roleEl.style.display = 'inline-block';

    if (elimine.role === 'virus') {
      roleEl.textContent = t('meetWasVirusRole');
      roleEl.style.background = '#e74c3c';
      roleEl.style.color = 'white';
      ajouterMsgReunion(t('system'), t('meetWasVirus', elimine.pseudo), '#e74c3c');
    } else if (elimine.role === 'journaliste') {
      roleEl.textContent = t('meetWasJournalistRole');
      roleEl.style.background = '#3498db';
      roleEl.style.color = 'white';
      ajouterMsgReunion(t('system'), t('meetWasJournalist', elimine.pseudo), '#3498db');
    } else if (elimine.role === 'fanatique') {
      roleEl.textContent = t('meetWasFanaticRole');
      roleEl.style.background = '#8e44ad';
      roleEl.style.color = 'white';
      ajouterMsgReunion(t('system'), t('meetWasFanatic', elimine.pseudo), '#8e44ad');
      showNotif(t('wasTheFanatic', elimine.pseudo), 'info');
    } else if (elimine.role === 'espion') {
      roleEl.textContent = t('meetWasSpyRole');
      roleEl.style.background = '#9b59b6';
      roleEl.style.color = 'white';
      ajouterMsgReunion(t('system'), t('meetWasSpy', elimine.pseudo), '#9b59b6');
    } else {
      roleEl.textContent = t('meetWasInnocentRole');
      roleEl.style.background = '#27ae60';
      roleEl.style.color = 'white';
      ajouterMsgReunion(t('system'), t('meetWasInnocent', elimine.pseudo), '#27ae60');
    }

    // Si c'est le joueur qui est elimine, appliquer le visuel fantome
    if (!elimine.estBot) {
      if (monRole === 'fanatique') {
        showNotif(t('youEliminatedFanatic'), 'info');
      }
      var joueurEl = document.getElementById('joueur');
      if (joueurEl) joueurEl.classList.add('bot-mort');
    }

    // Eliminer le bot (garder comme fantome)
    if (elimine.estBot) {
      for (var b = 0; b < bots.length; b++) {
        if (bots[b].pseudo === elimine.pseudo) {
          if (bots[b].element) {
            bots[b].element.classList.add('bot-fantome');
          }
          botsMorts.push(bots[b]);
          bots.splice(b, 1);
          break;
        }
      }
    }
  }

  resultatDiv.style.display = 'block';
  resultatDiv.classList.add('visible');
}

