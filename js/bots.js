// ============================
// MODE HORS LIGNE (BOTS)
// ============================
var bots = [];
var botsMorts = []; // bots elimines (fantomes sur la map)
var BOT_VITESSE = 4;
// Waypoints dans les couloirs uniquement
var BOT_WAYPOINTS = [
  // Couloir gauche vertical
  {x:680, y:300}, {x:680, y:800}, {x:680, y:1300}, {x:680, y:1900}, {x:680, y:2500}, {x:680, y:3000}, {x:680, y:3500}, {x:680, y:4200}, {x:680, y:4700},
  // Couloir droite vertical
  {x:7310, y:300}, {x:7310, y:800}, {x:7310, y:1300}, {x:7310, y:1900}, {x:7310, y:2500}, {x:7310, y:3000}, {x:7310, y:3500}, {x:7310, y:4200}, {x:7310, y:4700},
  // Couloir haut horizontal
  {x:1500, y:580}, {x:2500, y:580}, {x:3500, y:580}, {x:4500, y:580}, {x:5500, y:580}, {x:6500, y:580},
  // Place centrale (fontaine)
  {x:3500, y:2500}, {x:3800, y:2800}, {x:4200, y:2500}, {x:4500, y:2800}, {x:3800, y:3200}, {x:4200, y:3200},
  // Couloir gauche → fontaine
  {x:1130, y:1950}, {x:1130, y:2500}, {x:1130, y:3000},
  // Couloir droite → fontaine
  {x:6860, y:2000}, {x:6000, y:2000},
  // Couloir KIOSQUE
  {x:1130, y:1300}, {x:1800, y:1300},
  // Couloir OPTICIEN
  {x:5220, y:1300}, {x:6000, y:1300},
  // Couloir bas
  {x:1130, y:4000}, {x:2600, y:3900}, {x:5220, y:3900}, {x:6000, y:3900},
  // Couloir tout en bas
  {x:1500, y:4950}, {x:3000, y:5200}, {x:5000, y:5200}, {x:6500, y:4950}
];
// Positions devant les boutiques (dans les couloirs, pres des portes)
var BOT_BOUTIQUES = [
  {x:580, y:460, nom:'MODE'}, {x:580, y:700, nom:'PHARMACIE'},
  {x:580, y:1170, nom:'LIBRAIRIE'}, {x:580, y:1650, nom:'SPORT'},
  {x:580, y:2300, nom:'ANIMALERIE'}, {x:580, y:2800, nom:'PATISSERIE'},
  {x:760, y:3200, nom:'SUPERMARCHE'}, {x:580, y:3950, nom:'JEUX VIDEO'},
  {x:580, y:4900, nom:'MEUBLES'},
  {x:3000, y:580, nom:'SECURITE'}, {x:3500, y:580, nom:'TOILETTES'}, {x:4000, y:580, nom:'CAFE'},
  {x:2500, y:1550, nom:'KIOSQUE'}, {x:5100, y:1550, nom:'OPTICIEN'},
  {x:2500, y:3800, nom:'ARCADE'}, {x:5100, y:3800, nom:'BOWLING'},
  {x:7420, y:460, nom:'BIJOUTERIE'}, {x:7420, y:700, nom:'TECH'},
  {x:7420, y:1200, nom:'CINEMA'}, {x:7420, y:1700, nom:'RESTAURANT'},
  {x:7420, y:2300, nom:'BIO'}, {x:7420, y:2800, nom:'THE'},
  {x:7240, y:3200, nom:'FOOD COURT'}, {x:7420, y:3950, nom:'SPORT ART.'},
  {x:7420, y:4400, nom:'PARFUMERIE'}, {x:7420, y:4900, nom:'VOYAGE'}
];

function nettoyerBots() {
  for (var i = 0; i < bots.length; i++) {
    if (bots[i].element && bots[i].element.parentNode) {
      bots[i].element.parentNode.removeChild(bots[i].element);
    }
    if (bots[i].petObj && bots[i].petObj.element && bots[i].petObj.element.parentNode) {
      bots[i].petObj.element.parentNode.removeChild(bots[i].petObj.element);
    }
  }
  bots = [];
  // Nettoyer aussi les fantomes
  for (var f = 0; f < botsMorts.length; f++) {
    if (botsMorts[f].element && botsMorts[f].element.parentNode) {
      botsMorts[f].element.parentNode.removeChild(botsMorts[f].element);
    }
  }
  botsMorts = [];
}

function initBots(nbBots) {
  nettoyerBots();
  var mallMap = document.getElementById('mall-map');
  if (!mallMap) return;

  // Tous les skins sans doublons (dedupliques par id)
  var tousLesSkins = SKINS.concat(SKINS_BOUTIQUE);
  var skinsUniques = [];
  var idsVus = {};
  for (var su = 0; su < tousLesSkins.length; su++) {
    if (!idsVus[tousLesSkins[su].id]) {
      idsVus[tousLesSkins[su].id] = true;
      skinsUniques.push(tousLesSkins[su]);
    }
  }
  // Exclure le skin du joueur
  var monSkin = (typeof getSkin === 'function') ? getSkin() : '';
  skinsUniques = skinsUniques.filter(function(s) { return s.id !== monSkin; });
  // Melanger pour garantir des skins differents
  for (var sh = skinsUniques.length - 1; sh > 0; sh--) {
    var sj = Math.floor(Math.random() * (sh + 1));
    var tmp = skinsUniques[sh];
    skinsUniques[sh] = skinsUniques[sj];
    skinsUniques[sj] = tmp;
  }

  for (var i = 0; i < nbBots; i++) {
    // Skin unique par bot
    var skinObj = skinsUniques[i % skinsUniques.length];
    var skinFichier = skinObj.fichier;
    // Pseudo = nom du skin
    var pseudo = skinObj.nom;

    // Position de spawn - autour de la fontaine centrale (3800, 2800)
    var angle = (i / nbBots) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
    var rayon = 250 + Math.floor(Math.random() * 150);
    var spawnX = 3800 + Math.floor(Math.cos(angle) * rayon);
    var spawnY = 2800 + Math.floor(Math.sin(angle) * rayon);

    // Premiere cible
    var wp = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];

    // Creer element DOM
    var div = document.createElement('div');
    div.className = 'joueur-perso bot-perso';
    div.id = 'bot-' + i;
    div.style.left = spawnX + 'px';
    div.style.top = spawnY + 'px';

    var span = document.createElement('span');
    span.className = 'joueur-pseudo';
    span.textContent = pseudo;
    div.appendChild(span);

    var img = document.createElement('img');
    img.src = skinFichier;
    img.alt = 'bot';
    div.appendChild(img);

    var badge = document.createElement('div');
    badge.className = 'virus-allie-badge';
    div.appendChild(badge);

    mallMap.appendChild(div);

    // Pet aleatoire (50% de chance)
    var botPetObj = null;
    if (Math.random() < 0.5 && typeof PETS_BOUTIQUE !== 'undefined' && PETS_BOUTIQUE.length > 0 && typeof creerPetElement === 'function') {
      var randomPet = PETS_BOUTIQUE[Math.floor(Math.random() * PETS_BOUTIQUE.length)];
      botPetObj = creerPetElement(randomPet.id, mallMap);
    }

    bots.push({
      id: 'bot-' + i,
      pseudo: pseudo,
      x: spawnX,
      y: spawnY,
      skin: skinFichier,
      role: 'innocent',
      cibleX: wp.x,
      cibleY: wp.y,
      timer: 100 + Math.floor(Math.random() * 200),
      blockedTimer: 0,
      etat: 'deplacement', // 'deplacement', 'pause', 'traque', 'fuite'
      pauseTimer: 0,
      suiviCible: null, // pseudo du joueur/bot suivi
      missionsVisitees: 0, // compteur de boutiques visitees
      element: div,
      petObj: botPetObj
    });
  }
}

// Initialiser les bots pour le mode en ligne
function initBotsEnLigne(botPlayers) {
  nettoyerBots();
  var mallMap = document.getElementById('mall-map');
  if (!mallMap) return;

  for (var i = 0; i < botPlayers.length; i++) {
    var bp = botPlayers[i];

    var angle = (i / botPlayers.length) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
    var rayon = 250 + Math.floor(Math.random() * 150);
    var spawnX = 3800 + Math.floor(Math.cos(angle) * rayon);
    var spawnY = 2800 + Math.floor(Math.sin(angle) * rayon);

    var wp = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];

    var div = document.createElement('div');
    div.className = 'joueur-perso bot-perso';
    div.id = 'bot-online-' + i;
    div.style.left = spawnX + 'px';
    div.style.top = spawnY + 'px';

    var span = document.createElement('span');
    span.className = 'joueur-pseudo';
    span.textContent = bp.pseudo;
    div.appendChild(span);

    var img = document.createElement('img');
    img.src = bp.skin || 'skin/gratuit/skin-de-base-garcon.svg';
    img.alt = 'bot';
    div.appendChild(img);

    var badge = document.createElement('div');
    badge.className = 'virus-allie-badge';
    div.appendChild(badge);

    mallMap.appendChild(div);

    bots.push({
      id: 'bot-online-' + i,
      pseudo: bp.pseudo,
      x: spawnX,
      y: spawnY,
      skin: bp.skin || 'skin/gratuit/skin-de-base-garcon.svg',
      role: bp.role || 'innocent',
      cibleX: wp.x,
      cibleY: wp.y,
      timer: 100 + Math.floor(Math.random() * 200),
      blockedTimer: 0,
      etat: 'deplacement',
      pauseTimer: 0,
      suiviCible: null,
      missionsVisitees: 0,
      element: div,
      petObj: null,
      isOnline: true,
      firebasePlayerId: bp.playerId
    });
  }
}

// Trouver le joueur ou bot vivant le plus proche
function botTrouverCibleProche(bot, cibleRole) {
  var meilleur = null;
  var meilleurDist = Infinity;
  // Verifier le joueur
  if (joueursElimines.indexOf(getPseudo()) < 0) {
    var d = Math.sqrt((joueurX - bot.x) * (joueurX - bot.x) + (joueurY - bot.y) * (joueurY - bot.y));
    if (d < meilleurDist) { meilleurDist = d; meilleur = {x: joueurX, y: joueurY, pseudo: getPseudo()}; }
  }
  // Verifier les autres bots
  for (var j = 0; j < bots.length; j++) {
    if (bots[j].id === bot.id || joueursElimines.indexOf(bots[j].pseudo) >= 0) continue;
    if (cibleRole && bots[j].role !== cibleRole) continue;
    var d = Math.sqrt((bots[j].x - bot.x) * (bots[j].x - bot.x) + (bots[j].y - bot.y) * (bots[j].y - bot.y));
    if (d < meilleurDist) { meilleurDist = d; meilleur = {x: bots[j].x, y: bots[j].y, pseudo: bots[j].pseudo}; }
  }
  return meilleur;
}

// Choisir une cible en fonction du role du bot
function botChoisirCible(bot) {
  var rand = Math.random();

  if (bot.role === 'virus') {
    // Le virus traque les joueurs proches (70%) ou erre (30%)
    if (rand < 0.7) {
      var cible = botTrouverCibleProche(bot, null);
      if (cible) {
        bot.etat = 'traque';
        bot.suiviCible = cible.pseudo;
        // Viser un point proche de la cible (pas exactement dessus pour etre discret)
        bot.cibleX = cible.x + Math.floor(Math.random() * 200 - 100);
        bot.cibleY = cible.y + Math.floor(Math.random() * 200 - 100);
        bot.timer = 150 + Math.floor(Math.random() * 100);
        return;
      }
    }
    // Sinon errer normalement
    bot.etat = 'deplacement';
    var wp = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
    bot.cibleX = wp.x + Math.floor(Math.random() * 200 - 100);
    bot.cibleY = wp.y + Math.floor(Math.random() * 200 - 100);
    bot.timer = 200 + Math.floor(Math.random() * 200);

  } else if (bot.role === 'innocent') {
    // L'innocent va vers une boutique (60%), erre (25%) ou rejoint un groupe (15%)
    if (rand < 0.6 && BOT_BOUTIQUES.length > 0) {
      bot.etat = 'deplacement';
      var boutique = BOT_BOUTIQUES[Math.floor(Math.random() * BOT_BOUTIQUES.length)];
      bot.cibleX = boutique.x + Math.floor(Math.random() * 60 - 30);
      bot.cibleY = boutique.y + Math.floor(Math.random() * 60 - 30);
      bot.timer = 250 + Math.floor(Math.random() * 200);
    } else if (rand < 0.85) {
      bot.etat = 'deplacement';
      var wp = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
      bot.cibleX = wp.x + Math.floor(Math.random() * 200 - 100);
      bot.cibleY = wp.y + Math.floor(Math.random() * 200 - 100);
      bot.timer = 200 + Math.floor(Math.random() * 300);
    } else {
      // Rejoindre un autre bot
      var ami = botTrouverCibleProche(bot, null);
      if (ami) {
        bot.etat = 'deplacement';
        bot.cibleX = ami.x + Math.floor(Math.random() * 100 - 50);
        bot.cibleY = ami.y + Math.floor(Math.random() * 100 - 50);
        bot.timer = 150 + Math.floor(Math.random() * 150);
      }
    }

  } else if (bot.role === 'journaliste') {
    // Le journaliste suit un joueur pour "enqueter" (60%) ou erre (40%)
    if (rand < 0.6) {
      var cible = botTrouverCibleProche(bot, null);
      if (cible) {
        bot.etat = 'traque';
        bot.suiviCible = cible.pseudo;
        // Garder une distance d'observation (pas trop pres)
        var angle = Math.random() * Math.PI * 2;
        bot.cibleX = cible.x + Math.cos(angle) * 120;
        bot.cibleY = cible.y + Math.sin(angle) * 120;
        bot.timer = 200 + Math.floor(Math.random() * 150);
        return;
      }
    }
    bot.etat = 'deplacement';
    var wp = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
    bot.cibleX = wp.x + Math.floor(Math.random() * 200 - 100);
    bot.cibleY = wp.y + Math.floor(Math.random() * 200 - 100);
    bot.timer = 200 + Math.floor(Math.random() * 250);

  } else if (bot.role === 'fanatique') {
    // Le fanatique se met dans des situations dangereuses : va vers les groupes (50%), suit quelqu'un de pres (30%), erre (20%)
    if (rand < 0.5) {
      // Aller ou il y a le plus de monde
      var meilleurPoint = null;
      var meilleurCompte = 0;
      for (var w = 0; w < BOT_WAYPOINTS.length; w++) {
        var compte = 0;
        for (var b2 = 0; b2 < bots.length; b2++) {
          if (bots[b2].id === bot.id || joueursElimines.indexOf(bots[b2].pseudo) >= 0) continue;
          var d = Math.sqrt((bots[b2].x - BOT_WAYPOINTS[w].x) * (bots[b2].x - BOT_WAYPOINTS[w].x) + (bots[b2].y - BOT_WAYPOINTS[w].y) * (bots[b2].y - BOT_WAYPOINTS[w].y));
          if (d < 500) compte++;
        }
        if (compte > meilleurCompte) { meilleurCompte = compte; meilleurPoint = BOT_WAYPOINTS[w]; }
      }
      if (meilleurPoint && meilleurCompte > 0) {
        bot.etat = 'deplacement';
        bot.cibleX = meilleurPoint.x + Math.floor(Math.random() * 100 - 50);
        bot.cibleY = meilleurPoint.y + Math.floor(Math.random() * 100 - 50);
        bot.timer = 200 + Math.floor(Math.random() * 200);
        return;
      }
    } else if (rand < 0.8) {
      // Suivre quelqu'un de tres pres (comportement suspect)
      var cible = botTrouverCibleProche(bot, null);
      if (cible) {
        bot.etat = 'traque';
        bot.suiviCible = cible.pseudo;
        bot.cibleX = cible.x + Math.floor(Math.random() * 40 - 20);
        bot.cibleY = cible.y + Math.floor(Math.random() * 40 - 20);
        bot.timer = 120 + Math.floor(Math.random() * 100);
        return;
      }
    }
    bot.etat = 'deplacement';
    var wp = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
    bot.cibleX = wp.x + Math.floor(Math.random() * 200 - 100);
    bot.cibleY = wp.y + Math.floor(Math.random() * 200 - 100);
    bot.timer = 150 + Math.floor(Math.random() * 200);

  } else {
    // Defaut : errance
    bot.etat = 'deplacement';
    var wp = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
    bot.cibleX = wp.x + Math.floor(Math.random() * 200 - 100);
    bot.cibleY = wp.y + Math.floor(Math.random() * 200 - 100);
    bot.timer = 200 + Math.floor(Math.random() * 300);
  }
}

function updateBots() {
  if (reunionEnCours) return; // Figer les bots pendant la reunion
  for (var i = 0; i < bots.length; i++) {
    var bot = bots[i];

    // Si en pause (simulation de mission/arret), attendre
    if (bot.etat === 'pause') {
      bot.pauseTimer--;
      if (bot.pauseTimer <= 0) {
        bot.etat = 'deplacement';
        bot.missionsVisitees++;
        // En mode en ligne, incrementer la jauge collective
        if (bot.isOnline && bot.role !== 'virus' && typeof missionsCollectivesCompletees !== 'undefined' && typeof totalMissionsCollectives !== 'undefined') {
          if (missionsCollectivesCompletees < totalMissionsCollectives) {
            missionsCollectivesCompletees++;
            if (typeof updateJaugeMissions === 'function') updateJaugeMissions();
          }
        }
        botChoisirCible(bot);
      }
      continue;
    }

    bot.timer--;

    // Si le virus traque, mettre a jour la position de la cible en temps reel
    if (bot.etat === 'traque' && bot.suiviCible) {
      var pseudo = getPseudo() || t('player');
      if (bot.suiviCible === pseudo && joueursElimines.indexOf(pseudo) < 0) {
        // Suivre le joueur
        if (bot.role === 'virus') {
          bot.cibleX = joueurX;
          bot.cibleY = joueurY;
        } else {
          // Journaliste/fanatique : garder une legere distance
          var angle = Math.atan2(bot.y - joueurY, bot.x - joueurX);
          var distSuivi = bot.role === 'fanatique' ? 40 : 120;
          bot.cibleX = joueurX + Math.cos(angle) * distSuivi;
          bot.cibleY = joueurY + Math.sin(angle) * distSuivi;
        }
      } else {
        // Suivre un autre bot
        for (var sb = 0; sb < bots.length; sb++) {
          if (bots[sb].pseudo === bot.suiviCible && joueursElimines.indexOf(bots[sb].pseudo) < 0) {
            if (bot.role === 'virus') {
              bot.cibleX = bots[sb].x;
              bot.cibleY = bots[sb].y;
            } else {
              var angle = Math.atan2(bot.y - bots[sb].y, bot.x - bots[sb].x);
              var distSuivi = bot.role === 'fanatique' ? 40 : 120;
              bot.cibleX = bots[sb].x + Math.cos(angle) * distSuivi;
              bot.cibleY = bots[sb].y + Math.sin(angle) * distSuivi;
            }
            break;
          }
        }
      }
    }

    // Changer de cible si timer expire ou arrive a destination
    var distCible = Math.abs(bot.x - bot.cibleX) + Math.abs(bot.y - bot.cibleY);
    if (bot.timer <= 0 || distCible < 30) {
      // A l'arrivee, chance de faire une pause (simuler une mission)
      if (distCible < 30 && bot.role === 'innocent' && Math.random() < 0.4) {
        bot.etat = 'pause';
        bot.pauseTimer = 120 + Math.floor(Math.random() * 180); // 2-5 secondes de pause
        continue;
      }
      botChoisirCible(bot);
      bot.blockedTimer = 0;
    }

    // Calculer direction vers la cible
    var dx = bot.cibleX - bot.x;
    var dy = bot.cibleY - bot.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var mx = 0, my = 0;

    if (dist > 2) {
      // Vitesse : virus un peu plus rapide en traque
      var vitesse = BOT_VITESSE;
      if (bot.role === 'virus' && bot.etat === 'traque') vitesse = BOT_VITESSE + 0.5;

      mx = (dx / dist) * vitesse;
      my = (dy / dist) * vitesse;

      // Collision X
      var newX = bot.x + mx;
      if (!checkCollision(newX, bot.y)) {
        bot.x = newX;
        bot.blockedTimer = 0;
      } else {
        bot.blockedTimer++;
      }

      // Collision Y
      var newY = bot.y + my;
      if (!checkCollision(bot.x, newY)) {
        bot.y = newY;
        bot.blockedTimer = 0;
      } else {
        bot.blockedTimer++;
      }

      // Si bloque trop longtemps, changer de cible (plus rapide avec les couloirs)
      if (bot.blockedTimer > 20) {
        // Choisir un waypoint proche dans un couloir au lieu d'une cible aleatoire
        var wpProche = null;
        var wpDist = Infinity;
        for (var wi = 0; wi < BOT_WAYPOINTS.length; wi++) {
          var wd = Math.abs(bot.x - BOT_WAYPOINTS[wi].x) + Math.abs(bot.y - BOT_WAYPOINTS[wi].y);
          if (wd > 100 && wd < wpDist) { wpDist = wd; wpProche = BOT_WAYPOINTS[wi]; }
        }
        if (wpProche && bot.blockedTimer < 40) {
          bot.cibleX = wpProche.x;
          bot.cibleY = wpProche.y;
        } else {
          botChoisirCible(bot);
        }
        bot.blockedTimer = 0;
      }

      // Limites de la map
      if (bot.x < 25) bot.x = 25;
      if (bot.x > MAP_W - 40) bot.x = MAP_W - 40;
      if (bot.y < 25) bot.y = 25;
      if (bot.y > MAP_H - 40) bot.y = MAP_H - 40;

      // Flip sprite
      var botImg = bot.element ? bot.element.querySelector('img') : null;
      if (botImg) {
        botImg.style.transform = mx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
      }
    }

    // Mettre a jour position DOM
    if (bot.element) {
      bot.element.style.left = bot.x + 'px';
      bot.element.style.top = bot.y + 'px';
    }
    // Mettre a jour le pet du bot
    if (bot.petObj && typeof updatePetSuivi === 'function') {
      var botMoved = (mx !== 0 || my !== 0);
      updatePetSuivi(bot.petObj, bot.x, bot.y, botMoved);
    }
  }

  // Deplacer les fantomes (botsMorts)
  for (var gi = 0; gi < botsMorts.length; gi++) {
    var ghost = botsMorts[gi];
    if (!ghost.element) continue;

    // Initialiser cible si pas encore fait
    if (ghost.cibleX === undefined && ghost.cibleY === undefined) {
      var gw = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
      ghost.cibleX = gw.x + Math.random() * 100 - 50;
      ghost.cibleY = gw.y + Math.random() * 100 - 50;
      ghost.timer = 200 + Math.floor(Math.random() * 300);
      ghost.blockedTimer = 0;
      ghost.etat = 'deplacement';
      ghost.pauseTimer = 0;
    }

    // Pause
    if (ghost.etat === 'pause') {
      ghost.pauseTimer--;
      if (ghost.pauseTimer <= 0) {
        ghost.etat = 'deplacement';
        var gw = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
        ghost.cibleX = gw.x + Math.random() * 100 - 50;
        ghost.cibleY = gw.y + Math.random() * 100 - 50;
        ghost.timer = 200 + Math.floor(Math.random() * 300);
      }
      continue;
    }

    ghost.timer--;
    var gdx = ghost.cibleX - ghost.x;
    var gdy = ghost.cibleY - ghost.y;
    var gDist = Math.sqrt(gdx * gdx + gdy * gdy);

    // Arrivee ou timer expire : nouvelle cible
    if (ghost.timer <= 0 || gDist < 30) {
      if (gDist < 30 && Math.random() < 0.3) {
        ghost.etat = 'pause';
        ghost.pauseTimer = 90 + Math.floor(Math.random() * 150);
        continue;
      }
      var gw = BOT_WAYPOINTS[Math.floor(Math.random() * BOT_WAYPOINTS.length)];
      ghost.cibleX = gw.x + Math.random() * 100 - 50;
      ghost.cibleY = gw.y + Math.random() * 100 - 50;
      ghost.timer = 200 + Math.floor(Math.random() * 300);
      ghost.blockedTimer = 0;
    }

    // Deplacement (les fantomes ignorent les collisions)
    if (gDist > 2) {
      var gSpeed = BOT_VITESSE * 0.7;
      var gmx = (gdx / gDist) * gSpeed;
      var gmy = (gdy / gDist) * gSpeed;
      ghost.x += gmx;
      ghost.y += gmy;

      // Limites map
      if (ghost.x < 25) ghost.x = 25;
      if (ghost.x > MAP_W - 40) ghost.x = MAP_W - 40;
      if (ghost.y < 25) ghost.y = 25;
      if (ghost.y > MAP_H - 40) ghost.y = MAP_H - 40;

      // Flip sprite
      var gImg = ghost.element.querySelector('img');
      if (gImg) gImg.style.transform = gmx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
    }

    ghost.element.style.left = ghost.x + 'px';
    ghost.element.style.top = ghost.y + 'px';
  }
}

