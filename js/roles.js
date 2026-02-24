// ============================
// POUVOIR DU JOURNALISTE
// ============================
var FAUX_PSEUDOS = [
  'DarkShadow', 'xXKillerXx', 'ProGamer99', 'NinjaFurtif', 'LoupSolitaire',
  'FlashMcQueen', 'CaptainMal', 'ViperNoir', 'FoxRuse', 'TigreBlanc',
  'PhantomX', 'AceSniper', 'StormRider', 'BlazeFire', 'IceWolf',
  'ThunderBolt', 'SilverArrow', 'GhostRecon', 'RedFalcon', 'BlueDragon'
];
var joueursSimules = [];

function ouvrirPouvoirJournaliste(nbJoueurs) {
  var popup = document.getElementById('popup-journaliste');
  var choixDiv = document.getElementById('journaliste-choix');
  var resultatsDiv = document.getElementById('journaliste-resultats');
  var fermerBtn = document.getElementById('journaliste-fermer');

  // Reset
  resultatsDiv.className = 'journaliste-resultats';
  resultatsDiv.innerHTML = '';
  fermerBtn.style.display = 'none';

  // Generer les joueurs simules (sauf le journaliste)
  var pool = FAUX_PSEUDOS.slice();
  joueursSimules = [];
  for (var i = 0; i < nbJoueurs - 1 && pool.length > 0; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    joueursSimules.push({ pseudo: pool[idx], role: 'innocent' });
    pool.splice(idx, 1);
  }

  // Max virus possible
  var maxVirus = Math.min(3, Math.floor((nbJoueurs - 1) / 2));
  if (maxVirus < 1) maxVirus = 1;

  // Generer les boutons de choix
  var html = '';
  for (var v = 1; v <= maxVirus; v++) {
    html += '<button class="journaliste-choix-btn" onclick="choisirNbVirus(' + v + ')">' + v + '</button>';
  }
  choixDiv.innerHTML = html;

  popup.classList.add('visible');
}

function choisirNbVirus(nb) {
  var choixDiv = document.getElementById('journaliste-choix');
  var resultatsDiv = document.getElementById('journaliste-resultats');
  var fermerBtn = document.getElementById('journaliste-fermer');

  // Masquer les boutons de choix
  choixDiv.innerHTML = '<span style="color:#3498db; font-size:14px;">' + t('youChoseVirus', nb) + '</span>';

  // En mode hors ligne, garder les vrais roles des bots
  // En mode online, assigner les virus aleatoirement
  if (!modeHorsLigne) {
    var indices = [];
    for (var i = 0; i < joueursSimules.length; i++) {
      joueursSimules[i].role = 'innocent';
      indices.push(i);
    }
    for (var v = 0; v < nb && indices.length > 0; v++) {
      var ri = Math.floor(Math.random() * indices.length);
      joueursSimules[indices[ri]].role = 'virus';
      indices.splice(ri, 1);
    }
  }

  // Afficher les resultats
  var html = '<div style="color:#3498db; font-size:13px; margin-bottom:10px; letter-spacing:1px;">' + t('playerRoles') + '</div>';
  // Ajouter le journaliste (le joueur)
  html += '<div class="journaliste-resultat-item">';
  html += '<span class="journaliste-resultat-nom">' + (getPseudo() || t('player')) + ' ' + t('youLabel') + '</span>';
  html += '<span class="journaliste-resultat-role" style="background:#3498db;color:white;">JOURNALISTE</span>';
  html += '</div>';
  // Ajouter les autres joueurs
  for (var j = 0; j < joueursSimules.length; j++) {
    var p = joueursSimules[j];
    var tagClass = p.role === 'virus' ? 'role-tag-virus' : 'role-tag-innocent';
    var tagText = p.role === 'virus' ? 'VIRUS' : 'INNOCENT';
    html += '<div class="journaliste-resultat-item">';
    html += '<span class="journaliste-resultat-nom">' + p.pseudo + '</span>';
    html += '<span class="journaliste-resultat-role ' + tagClass + '">' + tagText + '</span>';
    html += '</div>';
  }

  resultatsDiv.innerHTML = html;
  resultatsDiv.classList.add('visible');
  fermerBtn.style.display = 'inline-block';
}

function fermerPouvoirJournaliste() {
  var popup = document.getElementById('popup-journaliste');
  popup.classList.remove('visible');
  showNotif(t('useInfoWisely'), 'info');
}

// ============================
// SYSTEME DE KILL (VIRUS)
// ============================
var killCooldown = false; // cooldown de 15 secondes apres un kill
var killCiblePseudo = null; // pseudo du bot le plus proche pour kill
var KILL_DISTANCE = 80; // distance pour pouvoir tuer
var KILL_COOLDOWN_MS = 15000; // 15 secondes de cooldown

var VIRUS_VISION_DISTANCE = 150; // distance pour voir les allies virus

function detecterVirusProches() {
  if (bots.length === 0 || monRole !== 'virus' || reunionEnCours) return;
  for (var i = 0; i < bots.length; i++) {
    var badge = bots[i].element ? bots[i].element.querySelector('.virus-allie-badge') : null;
    if (!badge) continue;
    if (bots[i].role !== 'virus' || joueursElimines.indexOf(bots[i].pseudo) >= 0) {
      badge.style.display = 'none';
      continue;
    }
    var dx = joueurX - bots[i].x;
    var dy = joueurY - bots[i].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    badge.style.display = (dist < VIRUS_VISION_DISTANCE) ? 'block' : 'none';
  }
}

function detecterCibleKill() {
  var pseudo = getPseudo() || t('player');
  if (bots.length === 0 || monRole !== 'virus' || killCooldown || reunionEnCours || joueursElimines.indexOf(pseudo) >= 0) {
    killCiblePseudo = null;
    return;
  }
  var minDist = Infinity;
  killCiblePseudo = null;
  for (var i = 0; i < bots.length; i++) {
    if (joueursElimines.indexOf(bots[i].pseudo) >= 0) continue;
    if (bots[i].role === 'virus') continue; // ne pas tuer un autre virus
    if (bots[i].role === 'espion' && bots[i].espionCamp === 'virus') continue; // ne pas tuer l'espion allie
    var dx = joueurX - bots[i].x;
    var dy = joueurY - bots[i].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < KILL_DISTANCE && dist < minDist) {
      minDist = dist;
      killCiblePseudo = bots[i].pseudo;
    }
  }
}

// POUVOIR JOURNALISTE - enquete par proximite
var ENQUETE_DISTANCE = 100;
var enqueteCiblePseudo = null;
var botsEnquetes = []; // pseudos deja enquetes
var enquetesRestantes = 1; // nombre d'enquetes restantes (= nombre de virus)

function detecterCibleEnquete() {
  var pseudo = getPseudo() || t('player');
  if (bots.length === 0 || monRole !== 'journaliste' || reunionEnCours || joueursElimines.indexOf(pseudo) >= 0 || enquetesRestantes <= 0) {
    enqueteCiblePseudo = null;
    return;
  }
  var minDist = Infinity;
  enqueteCiblePseudo = null;
  for (var i = 0; i < bots.length; i++) {
    if (joueursElimines.indexOf(bots[i].pseudo) >= 0) continue;
    if (botsEnquetes.indexOf(bots[i].pseudo) >= 0) continue;
    var dx = joueurX - bots[i].x;
    var dy = joueurY - bots[i].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ENQUETE_DISTANCE && dist < minDist) {
      minDist = dist;
      enqueteCiblePseudo = bots[i].pseudo;
    }
  }
}

function enqueterCible() {
  if (!enqueteCiblePseudo || enquetesRestantes <= 0) return;
  var bot = null;
  for (var ei = 0; ei < bots.length; ei++) {
    if (bots[ei].pseudo === enqueteCiblePseudo) { bot = bots[ei]; break; }
  }
  if (!bot || joueursElimines.indexOf(enqueteCiblePseudo) >= 0) return;
  botsEnquetes.push(bot.pseudo);
  enquetesRestantes--;
  var roleText = bot.role.toUpperCase();
  var couleur = bot.role === 'virus' ? '#e74c3c' : (bot.role === 'journaliste' ? '#3498db' : '#2ecc71');
  showNotif(t('playerIs', bot.pseudo, roleText), bot.role === 'virus' ? 'warn' : 'info');
  // Changer la couleur du pseudo du bot pour indiquer qu'il a ete enquete
  var pseudoEl = bot.element ? bot.element.querySelector('.joueur-pseudo') : null;
  if (pseudoEl) pseudoEl.style.color = couleur;
  enqueteCiblePseudo = null;
  // Notifier si plus d'enquetes
  if (enquetesRestantes <= 0) {
    showNotif(t('allInvestigationsUsed'), 'warn');
    var btnEnq = document.getElementById('btn-enqueter');
    if (btnEnq) btnEnq.style.display = 'none';
  }
}

var cadavres = []; // {x, y, pseudo, skin, element}
var SIGNALER_DISTANCE = 120;
var cadavreProche = -1; // index du cadavre le plus proche
var killProtection = false; // protection de 7s au debut et apres reunion

function creerCadavre(x, y, pseudo, skin) {
  var mallMap = document.getElementById('mall-map');
  var div = document.createElement('div');
  div.className = 'cadavre';
  div.style.left = x + 'px';
  div.style.top = y + 'px';
  div.innerHTML = '<span class="cadavre-x">X</span><img src="' + skin + '" alt="cadavre">';
  mallMap.appendChild(div);
  cadavres.push({ x: x, y: y, pseudo: pseudo, skin: skin, element: div });
  // Si reunion en cours, supprimer immediatement le cadavre
  if (reunionEnCours) {
    if (div.parentNode) div.parentNode.removeChild(div);
    cadavres.pop();
  }
}

function eliminerBot(pseudoVictime) {
  if (joueursElimines.indexOf(pseudoVictime) >= 0) return;
  // Verifier si c'est un fanatique (victoire personnelle, la partie continue)
  var estFanatique = false;
  for (var bf = 0; bf < bots.length; bf++) {
    if (bots[bf].pseudo === pseudoVictime && bots[bf].role === 'fanatique') {
      estFanatique = true;
      break;
    }
  }
  joueursElimines.push(pseudoVictime);
  for (var b = 0; b < bots.length; b++) {
    if (bots[b].pseudo === pseudoVictime) {
      var bx = bots[b].x;
      var by = bots[b].y;
      var bskin = bots[b].skin;
      // Garder l'element comme fantome au lieu de le supprimer
      if (bots[b].element) {
        bots[b].element.classList.add('bot-fantome');
      }
      botsMorts.push(bots[b]);
      bots.splice(b, 1);
      creerCadavre(bx, by, pseudoVictime, bskin);
      break;
    }
  }
  if (estFanatique) {
    showNotif(t('wasTheFanatic', pseudoVictime), 'info');
  }
  var gagnant = verifierVictoire();
  if (gagnant) afficherFinPartie(gagnant);
}

function tuerVictime() {
  if (!killCiblePseudo || killCooldown || killProtection) return;
  var pseudoVictime = killCiblePseudo;
  // Verifier que la victime existe encore et est vivante
  var victime = null;
  for (var vi = 0; vi < bots.length; vi++) {
    if (bots[vi].pseudo === pseudoVictime) { victime = bots[vi]; break; }
  }
  if (!victime || joueursElimines.indexOf(pseudoVictime) >= 0) return;

  killCooldown = true;

  showNotif(t('youInfected', pseudoVictime), 'warn');

  setTimeout(function() {
    eliminerBot(pseudoVictime);
    showNotif(t('playerDied', pseudoVictime), 'warn');
  }, 5000);

  var btnKill = document.getElementById('btn-kill');
  if (btnKill) btnKill.style.display = 'none';

  // Compte a rebours cooldown 15s visible pour le virus
  var cdEl = document.getElementById('kill-countdown');
  if (cdEl) {
    var secCd = Math.ceil(KILL_COOLDOWN_MS / 1000);
    cdEl.textContent = secCd;
    cdEl.style.display = 'flex';
    if (killCountdownInterval) clearInterval(killCountdownInterval);
    killCountdownInterval = setInterval(function() {
      secCd--;
      if (secCd <= 0) {
        clearInterval(killCountdownInterval);
        killCountdownInterval = null;
        cdEl.style.display = 'none';
        killCooldown = false;
      } else {
        cdEl.textContent = secCd;
      }
    }, 1000);
  } else {
    setTimeout(function() { killCooldown = false; }, KILL_COOLDOWN_MS);
  }
}

function detecterCadavreProche() {
  if (bots.length === 0 || reunionEnCours) { cadavreProche = -1; return; }
  // Les fantomes ne peuvent pas signaler
  var pseudo = getPseudo() || t('player');
  if (joueursElimines.indexOf(pseudo) >= 0) { cadavreProche = -1; return; }

  var minDist = Infinity;
  cadavreProche = -1;
  for (var i = 0; i < cadavres.length; i++) {
    var dx = joueurX - cadavres[i].x;
    var dy = joueurY - cadavres[i].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < SIGNALER_DISTANCE && dist < minDist) {
      minDist = dist;
      cadavreProche = i;
    }
  }
}

function signalerCadavre() {
  if (cadavreProche < 0 || reunionEnCours) return;
  var c = cadavres[cadavreProche];
  showNotif(t('bodyReported', c.pseudo), 'warn');
  reunionCreateur = getPseudo() || t('player');
  // Supprimer le cadavre signale
  if (c.element && c.element.parentNode) c.element.parentNode.removeChild(c.element);
  cadavres.splice(cadavreProche, 1);
  cadavreProche = -1;
  document.getElementById('btn-signaler').style.display = 'none';
  // Declencher reunion
  jeuActif = false;
  setTimeout(function() { try { ouvrirReunion(); } catch(e) { jeuActif = true; reunionEnCours = false; gameLoop(); } }, 500);
}

var killCountdownInterval = null;

function activerKillProtection() {
  killProtection = true;
  killCooldown = false; // Reset le cooldown (la protection le remplace)
  // Afficher le compte a rebours seulement pour le virus
  var cdEl = document.getElementById('kill-countdown');
  if (cdEl && monRole === 'virus') {
    var secondes = 15;
    cdEl.textContent = secondes;
    cdEl.style.display = 'flex';
    if (killCountdownInterval) clearInterval(killCountdownInterval);
    killCountdownInterval = setInterval(function() {
      secondes--;
      if (secondes <= 0) {
        clearInterval(killCountdownInterval);
        killCountdownInterval = null;
        cdEl.style.display = 'none';
        killProtection = false;
      } else {
        cdEl.textContent = secondes;
      }
    }, 1000);
  } else {
    setTimeout(function() { killProtection = false; }, 15000);
  }
}

// Bots virus tuent des innocents proches automatiquement
var botKillCooldowns = {};

function botsVirusTuent() {
  if (bots.length === 0 || reunionEnCours || killProtection) return;
  for (var v = 0; v < bots.length; v++) {
    if (bots[v].role !== 'virus') continue;
    if (botKillCooldowns[bots[v].id]) continue;

    var virusBot = bots[v];

    // Verifier si le joueur est proche et innocent (pas virus, pas espion camp virus)
    if (monRole !== 'virus' && !(monRole === 'espion' && espionCamp === 'virus') && joueursElimines.indexOf(getPseudo() || t('player')) < 0) {
      var dx = virusBot.x - joueurX;
      var dy = virusBot.y - joueurY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < KILL_DISTANCE) {
        botKillCooldowns[virusBot.id] = true;
        showNotif(t('virusInfectedYou'), 'warn');
        try { var sInfect = new Audio('Audio/infectation.mp3'); sInfect.volume = 0.6; sInfect.play(); } catch(e) {}
        (function(botId) {
          setTimeout(function() {
            var pseudo = getPseudo() || t('player');
            if (joueursElimines.indexOf(pseudo) >= 0) return;
            joueursElimines.push(pseudo);
            if (monRole === 'fanatique') {
              showNotif(t('diedAsFanatic'), 'info');
            } else {
              showNotif(t('youDiedGhost'), 'warn');
            }
            var joueurEl = document.getElementById('joueur');
            if (joueurEl) joueurEl.classList.add('bot-mort');
            // Creer cadavre joueur
            creerCadavre(joueurX, joueurY, pseudo, getSkinFichier(getSkin()));
            var gagnant = verifierVictoire();
            if (gagnant) afficherFinPartie(gagnant);
          }, 5000);
          setTimeout(function() { botKillCooldowns[botId] = false; }, KILL_COOLDOWN_MS);
        })(virusBot.id);
        continue;
      }
    }

    // Chercher un bot innocent proche
    for (var bt = 0; bt < bots.length; bt++) {
      if (bt === v) continue;
      if (bots[bt].role === 'virus') continue;
      if (bots[bt].role === 'espion' && bots[bt].espionCamp === 'virus') continue; // ne pas tuer l'espion allie
      if (joueursElimines.indexOf(bots[bt].pseudo) >= 0) continue;
      var dx2 = virusBot.x - bots[bt].x;
      var dy2 = virusBot.y - bots[bt].y;
      var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (dist2 < KILL_DISTANCE) {
        botKillCooldowns[virusBot.id] = true;
        var victimePseudo = bots[bt].pseudo;
        var selfReport = Math.random() < 0.10;
        var virusPseudoSR = virusBot.pseudo;
        (function(bp, botId, doSelfReport, virusNom) {
          setTimeout(function() {
            eliminerBot(bp);
            // 10% de chance que le bot virus signale lui-meme le cadavre
            if (doSelfReport && !reunionEnCours && cadavres.length > 0) {
              setTimeout(function() {
                if (reunionEnCours) return;
                showNotif(t('foundBodyOf', virusNom, bp), 'warn');
                reunionCreateur = virusNom;
                jeuActif = false;
                setTimeout(function() { try { ouvrirReunion(); } catch(e) { jeuActif = true; reunionEnCours = false; gameLoop(); } }, 500);
              }, 1000 + Math.floor(Math.random() * 2000));
            }
          }, 5000);
          setTimeout(function() { botKillCooldowns[botId] = false; }, KILL_COOLDOWN_MS);
        })(victimePseudo, virusBot.id, selfReport, virusPseudoSR);
        break;
      }
    }
  }
}

var botSignaleCooldown = false;
var BOT_SIGNALE_DISTANCE = 150;

function botsDetectentCadavres() {
  if (bots.length === 0 || reunionEnCours || cadavres.length === 0 || botSignaleCooldown) return;
  for (var b = 0; b < bots.length; b++) {
    if (joueursElimines.indexOf(bots[b].pseudo) >= 0) continue;
    for (var c = 0; c < cadavres.length; c++) {
      var dx = bots[b].x - cadavres[c].x;
      var dy = bots[b].y - cadavres[c].y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < BOT_SIGNALE_DISTANCE) {
        botSignaleCooldown = true;
        var nomBot = bots[b].pseudo;
        var nomCadavre = cadavres[c].pseudo;
        showNotif(t('foundBodyOf', nomBot, nomCadavre), 'warn');
        reunionCreateur = nomBot;
        // Supprimer le cadavre signale
        if (cadavres[c].element && cadavres[c].element.parentNode) {
          cadavres[c].element.parentNode.removeChild(cadavres[c].element);
        }
        cadavres.splice(c, 1);
        // Declencher reunion
        jeuActif = false;
        setTimeout(function() { try { ouvrirReunion(); } catch(e) { jeuActif = true; reunionEnCours = false; gameLoop(); } }, 500);
        setTimeout(function() { botSignaleCooldown = false; }, 5000);
        return;
      }
    }
  }
}

// ============================
// VERIFICATION VICTOIRE
// ============================
function compterRolesRestants() {
  var nbVirus = 0;
  var nbGentils = 0;
  var pseudo = getPseudo() || t('player');
  if (joueursElimines.indexOf(pseudo) < 0) {
    if (monRole === 'virus') nbVirus++;
    else if (monRole !== 'fanatique' && monRole !== 'espion') nbGentils++;
  }
  for (var i = 0; i < bots.length; i++) {
    if (joueursElimines.indexOf(bots[i].pseudo) < 0) {
      if (bots[i].role === 'virus') nbVirus++;
      else if (bots[i].role !== 'fanatique' && bots[i].role !== 'espion') nbGentils++;
    }
  }
  return { virus: nbVirus, gentils: nbGentils };
}

function verifierVictoire() {
  // Verifier si un fanatique a ete elimine → victoire du fanatique (la partie se termine)
  for (var vf = 0; vf < tousLesJoueursPartie.length; vf++) {
    if (tousLesJoueursPartie[vf].role === 'fanatique' && joueursElimines.indexOf(tousLesJoueursPartie[vf].pseudo) >= 0) {
      return 'fanatique';
    }
  }
  if (!modeHorsLigne) {
    // Mode en ligne : victoire quand TOUTES les missions collectives sont faites
    if (totalMissionsCollectives > 0 && missionsCollectivesCompletees >= totalMissionsCollectives) return 'missions';
    return null;
  }
  // Mode hors ligne : victoire quand le joueur a fini ses missions
  var toutesMissionsFaites = true;
  for (var vm = 0; vm < mesMissions.length; vm++) {
    if (!mesMissions[vm].faite) { toutesMissionsFaites = false; break; }
  }
  if (toutesMissionsFaites && mesMissions.length > 0) return 'missions';
  // Conditions avec bots (hors ligne uniquement)
  var compte = compterRolesRestants();
  if (compte.gentils <= compte.virus && compte.virus > 0) return 'virus';
  if (compte.virus === 0) return 'innocents';
  return null;
}

function afficherFinPartie(gagnant) {
  jeuActif = false;
  touchActif = false;
  if (miniJeuOuvert) fermerMiniJeu();
  if (camerasOuvertes) fermerCameras();
  if (simulationMissionsTimer) { clearInterval(simulationMissionsTimer); simulationMissionsTimer = null; }
  var overlay = document.getElementById('fin-partie-overlay');
  var titreEl = document.getElementById('fin-partie-titre');
  var sousTitreEl = document.getElementById('fin-partie-sous-titre');
  var rolesDiv = document.getElementById('fin-partie-roles');
  if (gagnant === 'virus') {
    titreEl.textContent = t('virusVictory');
    titreEl.className = 'fin-partie-titre virus';
    sousTitreEl.textContent = t('virusVictoryDesc');
  } else if (gagnant === 'fanatique') {
    // Trouver le pseudo du fanatique
    var pseudoFanatique = '';
    for (var pf = 0; pf < tousLesJoueursPartie.length; pf++) {
      if (tousLesJoueursPartie[pf].role === 'fanatique') { pseudoFanatique = tousLesJoueursPartie[pf].pseudo; break; }
    }
    titreEl.textContent = t('fanaticVictory');
    titreEl.className = 'fin-partie-titre fanatique';
    sousTitreEl.textContent = t('fanaticWonWith', pseudoFanatique);
  } else if (gagnant === 'missions') {
    titreEl.textContent = t('innocentsVictory');
    titreEl.className = 'fin-partie-titre innocents';
    sousTitreEl.textContent = t('missionsVictoryDesc');
  } else {
    titreEl.textContent = t('innocentsVictory');
    titreEl.className = 'fin-partie-titre innocents';
    sousTitreEl.textContent = t('virusEliminatedDesc');
  }
  var html = '';
  var pseudo = getPseudo() || t('player');
  var skinFichier = getSkinFichier(getSkin());
  var elimJoueur = joueursElimines.indexOf(pseudo) >= 0;
  html += '<div class="fin-partie-joueur" style="opacity:' + (elimJoueur ? '0.4' : '1') + '">';
  html += '<img src="' + skinFichier + '" alt="skin">';
  html += '<span class="fp-pseudo">' + pseudo.replace(/</g, '&lt;') + '</span>';
  html += '<span class="fp-role fp-role-' + monRole + '">' + monRole.toUpperCase() + '</span>';
  html += '</div>';
  // Utiliser tousLesJoueursPartie (sauvegarde complete) au lieu de joueursReunion (potentiellement incomplet)
  for (var i = 0; i < tousLesJoueursPartie.length; i++) {
    if (tousLesJoueursPartie[i].estBot) {
      var jr = tousLesJoueursPartie[i];
      var estElim = joueursElimines.indexOf(jr.pseudo) >= 0;
      html += '<div class="fin-partie-joueur" style="opacity:' + (estElim ? '0.4' : '1') + '">';
      html += '<img src="' + jr.skin + '" alt="skin">';
      html += '<span class="fp-pseudo">' + jr.pseudo.replace(/</g, '&lt;') + '</span>';
      html += '<span class="fp-role fp-role-' + jr.role + '">' + jr.role.toUpperCase() + '</span>';
      html += '</div>';
    }
  }
  // Verifier si le joueur a gagne et donner 50 golds
  var joueurAGagne = false;
  if (gagnant === 'fanatique') {
    if (monRole === 'fanatique') joueurAGagne = true;
    if (monRole === 'espion') joueurAGagne = true; // L'espion gagne toujours avec le fanatique
  } else {
    if (gagnant === 'virus' && (monRole === 'virus' || (monRole === 'espion' && espionCamp === 'virus'))) joueurAGagne = true;
    if ((gagnant === 'innocents' || gagnant === 'missions') && (monRole === 'innocent' || monRole === 'journaliste' || (monRole === 'espion' && espionCamp === 'innocent'))) joueurAGagne = true;
  }
  if (joueurAGagne) {
    var recompense = 50;
    gagnerGold(recompense);
    html += '<div class="fin-partie-gold">+' + recompense + ' GOLDS !</div>';
  }

  rolesDiv.innerHTML = html;
  overlay.classList.add('visible');
}

function retourMenuFinPartie() {
  document.getElementById('fin-partie-overlay').classList.remove('visible');
  // Retirer le visuel fantome du joueur
  var joueurEl = document.getElementById('joueur');
  if (joueurEl) joueurEl.classList.remove('bot-mort');
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
  var cdElMenu = document.getElementById('kill-countdown');
  if (cdElMenu) cdElMenu.style.display = 'none';
  // Reset mission en cours
  if (missionTimer) { clearTimeout(missionTimer); missionTimer = null; }
  missionEnCours = false;
  var btnM = document.getElementById('btn-mission');
  if (btnM) { resetBtnMission(btnM); btnM.style.display = 'none'; }
  // Retirer highlights caisse
  document.querySelectorAll('.caisse-cible').forEach(function(c) { c.classList.remove('caisse-cible'); });
  arreterSimulationMissions();
  // Nettoyer la reunion si elle etait en cours
  if (reunionEnCours) fermerReunion();
  reunionEnCours = false;
  document.getElementById('reunion-btn-skip').classList.remove('visible');
  document.getElementById('reunion-bandeau').classList.remove('visible');
  var elChatClean = document.getElementById('reunion-chat');
  if (elChatClean) { elChatClean.classList.remove('visible'); elChatClean.classList.remove('chat-visible'); }
  var elToggleClean = document.getElementById('reunion-chat-toggle');
  if (elToggleClean) { elToggleClean.classList.remove('visible'); elToggleClean.classList.remove('active'); }
  document.getElementById('reunion-resultat').classList.remove('visible');
  document.getElementById('reunion-resultat').style.display = 'none';
  nettoyerBots();
  modeHorsLigne = false;
  joueursElimines = [];
  botsMorts = [];
  showScreen('menu-principal');
}

function fermerReunion() {
  clearInterval(reunionTimer);
  reunionTimer = null;
  // Nettoyer les timers de chat IA des bots
  for (var ct = 0; ct < botsChatTimers.length; ct++) clearTimeout(botsChatTimers[ct]);
  botsChatTimers = [];

  try {
    // Masquer HUD reunion
    var elBandeau = document.getElementById('reunion-bandeau');
    if (elBandeau) elBandeau.classList.remove('visible');
    var elChat = document.getElementById('reunion-chat');
    if (elChat) { elChat.classList.remove('visible'); elChat.classList.remove('chat-visible'); }
    var elReunionToggle = document.getElementById('reunion-chat-toggle');
    if (elReunionToggle) { elReunionToggle.classList.remove('visible'); elReunionToggle.classList.remove('active'); }
    var elSkip = document.getElementById('reunion-btn-skip');
    if (elSkip) elSkip.classList.remove('visible');
    var elResultat = document.getElementById('reunion-resultat');
    if (elResultat) { elResultat.classList.remove('visible'); elResultat.style.display = 'none'; }
    var elTimer = document.getElementById('reunion-timer');
    if (elTimer) elTimer.style.color = '#e74c3c';

    // Nettoyer les bulles de vote, badge createur et les classes
    var badgeCr = document.getElementById('reunion-createur-badge');
    if (badgeCr && badgeCr.parentNode) badgeCr.parentNode.removeChild(badgeCr);
    for (var i = 0; i < joueursReunion.length; i++) {
      try {
        var el = document.getElementById(joueursReunion[i].elementId);
        if (el) {
          el.classList.remove('reunion-cliquable', 'reunion-vote-selection');
          el.onclick = null;
          var bulle = document.getElementById('vote-bulle-' + i);
          if (bulle && bulle.parentNode) bulle.parentNode.removeChild(bulle);
        }
      } catch(e) {}
    }

    // Les joueurs restent devant la fontaine apres la reunion
    updateJoueur();
  } catch(e) {}

  // Re-afficher missions et minimap
  var hudMissions = document.querySelector('.hud-missions');
  if (hudMissions) hudMissions.style.display = '';
  var minimap = document.querySelector('.minimap');
  if (minimap) minimap.style.display = '';

  // Verifier victoire apres elimination
  reunionEnCours = false;

  // Cooldown de 10 secondes apres la fin de la reunion
  reunionCooldown = true;
  setTimeout(function() { reunionCooldown = false; }, REUNION_COOLDOWN_MS);
  var gagnant = verifierVictoire();
  if (gagnant) {
    afficherFinPartie(gagnant);
    return;
  }

  // Protection de 7 secondes apres reunion
  activerKillProtection();

  // Reprendre le jeu
  jeuActif = true;
  gameLoop();

  // Reprendre le mini-jeu si un etait en pause
  if (miniJeuPause) reprendreMiniJeu();
}

function ajouterMsgReunion(auteur, message, couleur, isGhost) {
  var container = document.getElementById('reunion-chat-messages');
  if (!container) return;
  var monPseudo = getPseudo() || t('player');
  var jeSuisFantome = joueursElimines.indexOf(monPseudo) >= 0;
  // Message fantome visible uniquement par les autres fantomes
  if (isGhost && !jeSuisFantome) return;
  var div = document.createElement('div');
  div.className = 'chat-msg' + (isGhost ? ' chat-msg-ghost' : '');
  if (isGhost) {
    div.innerHTML = '<span class="ghost-tag">' + t('ghostTag') + '</span> <span class="pseudo" style="color:' + (couleur || '#7f8c8d') + '">[' + auteur.replace(/</g, '&lt;') + ']:</span> <span class="texte">' + message.replace(/</g, '&lt;') + '</span>';
  } else {
    div.innerHTML = '<span class="pseudo" style="color:' + (couleur || '#e74c3c') + '">[' + auteur.replace(/</g, '&lt;') + ']:</span> <span class="texte">' + message.replace(/</g, '&lt;') + '</span>';
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  // Son de chat aleatoire
  try { var sChat = new Audio(Math.random() < 0.5 ? 'Audio/chat1.mp3' : 'Audio/chat2.mp3'); sChat.volume = 0.4; sChat.play(); } catch(e) {}
}

var phrasesFantomes = t('botGhostChat');

function envoyerMsgReunion() {
  var input = document.getElementById('reunion-chat-input');
  var msg = input.value.trim();
  if (!msg) return;
  var pseudo = getPseudo() || t('player');
  var suisFantome = joueursElimines.indexOf(pseudo) >= 0;
  var msgFiltre = filtrerMessage(msg);
  if (suisFantome) {
    // Les fantomes peuvent parler, mais seuls les autres fantomes voient
    ajouterMsgReunion(pseudo, msgFiltre, '#7f8c8d', true);
    input.value = '';
    // Bots fantomes reagissent
    if (modeHorsLigne && botsMorts.length > 0 && Math.random() < 0.4) {
      var botFantome = botsMorts[Math.floor(Math.random() * botsMorts.length)];
      setTimeout(function() {
        if (reunionEnCours) {
          ajouterMsgReunion(botFantome.pseudo, phrasesFantomes[Math.floor(Math.random() * phrasesFantomes.length)], '#7f8c8d', true);
        }
      }, 1000 + Math.floor(Math.random() * 3000));
    }
    return;
  }
  ajouterMsgReunion(pseudo, msgFiltre, isAdmin() ? '#f39c12' : '#e74c3c');
  input.value = '';

  // Bots reagissent au message du joueur
  if (modeHorsLigne && Math.random() < 0.5) {
    var phrasesReponse = t('botResponse');
    var botsVivants = [];
    for (var br = 0; br < bots.length; br++) {
      if (joueursElimines.indexOf(bots[br].pseudo) < 0) botsVivants.push(bots[br]);
    }
    if (botsVivants.length > 0) {
      var botRepondeur = botsVivants[Math.floor(Math.random() * botsVivants.length)];
      setTimeout(function() {
        if (reunionEnCours) {
          ajouterMsgReunion(botRepondeur.pseudo, phrasesReponse[Math.floor(Math.random() * phrasesReponse.length)], '#95a5a6');
        }
      }, 1000 + Math.floor(Math.random() * 3000));
    }
  }
}

