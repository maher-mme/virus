// ============================
// MODE HORS LIGNE (BOTS)
// ============================
var bots = [];
var botsMorts = []; // bots elimines (fantomes sur la map)
var BOT_VITESSE = 4;
var BOT_WAYPOINTS = [
  {x:800, y:1200}, {x:2000, y:1200}, {x:3800, y:1200}, {x:5500, y:1200}, {x:7200, y:1200},
  {x:800, y:2800}, {x:2000, y:2800}, {x:3800, y:2800}, {x:5500, y:2800}, {x:7200, y:2800},
  {x:800, y:4200}, {x:2000, y:4200}, {x:3800, y:4200}, {x:5500, y:4200}, {x:7200, y:4200},
  {x:1000, y:2000}, {x:7000, y:2000},
  {x:1000, y:4000}, {x:7000, y:4000},
  {x:3800, y:5500}, {x:2000, y:5500}, {x:5500, y:5500}
];
// Positions devant les boutiques (pour les bots innocents qui "font des missions")
var BOT_BOUTIQUES = [
  {x:335, y:1322, nom:'LIBRAIRIE'}, {x:2790, y:1472, nom:'KIOSQUE'},
  {x:3075, y:322, nom:'SECURITE'}, {x:705, y:3657, nom:'SUPERMARCHE'},
  {x:3025, y:4122, nom:'ARCADE'}, {x:3525, y:277, nom:'TOILETTES'},
  {x:355, y:1817, nom:'SPORT'}, {x:7745, y:422, nom:'BIJOUTERIE'},
  {x:7725, y:4572, nom:'PARFUMERIE'}, {x:3840, y:132, nom:'CAFE'}
];

function nettoyerBots() {
  for (var i = 0; i < bots.length; i++) {
    if (bots[i].element && bots[i].element.parentNode) {
      bots[i].element.parentNode.removeChild(bots[i].element);
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
  var nomsPool = FAUX_PSEUDOS.slice();
  var mallMap = document.getElementById('mall-map');
  if (!mallMap) return;

  for (var i = 0; i < nbBots && nomsPool.length > 0; i++) {
    // Pseudo aleatoire
    var ni = Math.floor(Math.random() * nomsPool.length);
    var pseudo = nomsPool[ni];
    nomsPool.splice(ni, 1);

    // Skin aleatoire pondere par rarete : typique 80, commun 60, rare 40, epic 30, legendaire 10
    var skinObj;
    var tousLesSkins = SKINS.concat(SKINS_BOUTIQUE);
    var poidsRarete = {typique:80, commun:60, rare:40, epic:30, legendaire:10};
    var poidsTotal = 0;
    for (var ps = 0; ps < tousLesSkins.length; ps++) {
      poidsTotal += (poidsRarete[tousLesSkins[ps].rarete] || 50);
    }
    var tirage = Math.random() * poidsTotal;
    var cumul = 0;
    skinObj = tousLesSkins[0];
    for (var ps = 0; ps < tousLesSkins.length; ps++) {
      cumul += (poidsRarete[tousLesSkins[ps].rarete] || 50);
      if (tirage <= cumul) { skinObj = tousLesSkins[ps]; break; }
    }
    var skinFichier = skinObj.fichier;

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
      element: div
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
  for (var i = 0; i < bots.length; i++) {
    var bot = bots[i];

    // Si en pause (simulation de mission/arret), attendre
    if (bot.etat === 'pause') {
      bot.pauseTimer--;
      if (bot.pauseTimer <= 0) {
        bot.etat = 'deplacement';
        bot.missionsVisitees++;
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

    if (dist > 2) {
      // Vitesse : virus un peu plus rapide en traque
      var vitesse = BOT_VITESSE;
      if (bot.role === 'virus' && bot.etat === 'traque') vitesse = BOT_VITESSE + 0.5;

      var mx = (dx / dist) * vitesse;
      var my = (dy / dist) * vitesse;

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

      // Si bloque trop longtemps, changer de cible
      if (bot.blockedTimer > 60) {
        botChoisirCible(bot);
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
  }

  // Deplacer les fantomes (botsMorts)
  for (var gi = 0; gi < botsMorts.length; gi++) {
    var ghost = botsMorts[gi];
    if (!ghost.element) continue;

    // Initialiser cible si pas encore fait
    if (!ghost.cibleX && !ghost.cibleY) {
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

