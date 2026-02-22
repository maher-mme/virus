// ============================
// SYSTEME DE MISSIONS
// ============================
var POOL_MISSIONS = [
  { nom: 'Ranger les livres', boutiqueNom: 'LIBRAIRIE', rect: {x:60, y:1000, w:500, h:350}, caisseX: 335, caisseY: 1322, miniJeu: 'livres' },
  { nom: 'Recuperer un colis', boutiqueNom: 'KIOSQUE A JOURNAUX', rect: {x:2500, y:1200, w:600, h:350}, caisseX: 2790, caisseY: 1472, miniJeu: 'colis' },
  { nom: 'Verifier les cameras', boutiqueNom: 'POSTE DE SECURITE', rect: {x:2800, y:60, w:450, h:300}, caisseX: 3075, caisseY: 322, miniJeu: 'cameras' },
  { nom: 'Reapprovisionner les rayons', boutiqueNom: 'SUPERMARCHE GEANT', rect: {x:60, y:3200, w:700, h:500}, caisseX: 705, caisseY: 3657, miniJeu: 'rayons' },
  { nom: 'Reparer l\'escalator', boutiqueNom: 'SALLE D\'ARCADE', rect: {x:2500, y:3800, w:600, h:400}, caisseX: 3025, caisseY: 4122, miniJeu: 'escalator' },
  { nom: 'Reparer les toilettes', boutiqueNom: 'TOILETTES NORD', rect: {x:3350, y:60, w:350, h:250}, caisseX: 3525, caisseY: 277, miniJeu: 'toilettes' },
  { nom: 'Faire des pompes', boutiqueNom: 'SALLE DE SPORT', rect: {x:60, y:1450, w:500, h:400}, caisseX: 355, caisseY: 1817, miniJeu: 'pompes' },
  { nom: 'Nettoyer les vitrines', boutiqueNom: 'BIJOUTERIE', rect: {x:7440, y:60, w:500, h:400}, caisseX: 7745, caisseY: 422, miniJeu: 'vitrines' },
  { nom: 'Tester les echantillons', boutiqueNom: 'PARFUMERIE', rect: {x:7440, y:4250, w:500, h:350}, caisseX: 7725, caisseY: 4572, miniJeu: 'echantillons' },
  { nom: 'Prendre un cafe', boutiqueNom: 'CAFE DU CENTRE', rect: {x:3800, y:60, w:450, h:300}, caisseX: 3840, caisseY: 132, miniJeu: 'cafe' },
  { nom: 'Reallumer la box internet', boutiqueNom: 'TECH & ELECTRONIQUE', rect: {x:7440, y:550, w:500, h:350}, caisseX: 7725, caisseY: 872, miniJeu: 'box' },
  { nom: 'Verifier la projection', boutiqueNom: 'CINEMA MULTIPLEX', rect: {x:7440, y:1000, w:500, h:450}, caisseX: 7900, caisseY: 1417, miniJeu: 'projection' },
  { nom: 'Nettoyer les tables', boutiqueNom: 'RESTAURANT', rect: {x:7440, y:1550, w:500, h:350}, caisseX: 7755, caisseY: 1872, miniJeu: 'tables' },
  { nom: 'Trier les medicaments', boutiqueNom: 'PHARMACIE', rect: {x:60, y:550, w:500, h:350}, caisseX: 385, caisseY: 867, miniJeu: 'medicaments' },
  { nom: 'Ranger les vetements', boutiqueNom: 'BOUTIQUE MODE', rect: {x:60, y:60, w:500, h:400}, caisseX: 335, caisseY: 422, miniJeu: 'vetements' },
  { nom: 'Mettre a jour les consoles', boutiqueNom: 'MAGASIN DE JEUX VIDEO', rect: {x:60, y:3800, w:500, h:350}, caisseX: 345, caisseY: 4122, miniJeu: 'consoles' },
  { nom: 'Nourrir les animaux', boutiqueNom: 'ANIMALERIE', rect: {x:60, y:2100, w:500, h:400}, caisseX: 355, caisseY: 2467, miniJeu: 'animaux' },
  { nom: 'Verifier les fours', boutiqueNom: 'PATISSERIE', rect: {x:60, y:2600, w:500, h:400}, caisseX: 395, caisseY: 2967, miniJeu: 'fours' },
  { nom: 'Arroser les plantes', boutiqueNom: 'BIO & NATURE', rect: {x:7440, y:2100, w:500, h:400}, caisseX: 7745, caisseY: 2467, miniJeu: 'plantes' },
  { nom: 'Preparer les infusions', boutiqueNom: 'SALON DE THE', rect: {x:7440, y:2600, w:500, h:400}, caisseX: 7810, caisseY: 2633, miniJeu: 'infusions' },
  { nom: 'Calibrer les machines', boutiqueNom: 'OPTICIEN', rect: {x:4500, y:1200, w:600, h:350}, caisseX: 4790, caisseY: 1472, miniJeu: 'calibrer' },
  { nom: 'Realigner les quilles', boutiqueNom: 'BOWLING', rect: {x:4500, y:3800, w:600, h:400}, caisseX: 5025, caisseY: 4122, miniJeu: 'quilles' },
  { nom: 'Gonfler les ballons', boutiqueNom: 'ARTICLES DE SPORT', rect: {x:7440, y:3800, w:500, h:350}, caisseX: 7725, caisseY: 4122, miniJeu: 'ballons' }
];
var mesMissions = [];

// Jauge collective de missions (mode en ligne)
var totalMissionsCollectives = 0; // nombre total de missions de tous les joueurs
var missionsCollectivesCompletees = 0; // missions completees par tous les joueurs
var simulationMissionsTimer = null; // timer pour simuler les missions des autres joueurs

function updateJaugeMissions() {
  var jaugeContainer = document.getElementById('mission-jauge');
  var jauge = document.getElementById('mission-jauge-fill');
  var texte = document.getElementById('mission-jauge-text');
  if (!jaugeContainer || !jauge || !texte) return;
  if (totalMissionsCollectives <= 0) { jaugeContainer.style.display = 'none'; return; }
  jaugeContainer.style.display = 'block';
  var pct = Math.min(100, Math.round((missionsCollectivesCompletees / totalMissionsCollectives) * 100));
  jauge.style.width = pct + '%';
  texte.textContent = t('missionsLabel', missionsCollectivesCompletees, totalMissionsCollectives, pct);
}

function demarrerSimulationMissions(nbAutresJoueurs) {
  if (simulationMissionsTimer) clearInterval(simulationMissionsTimer);
  var missionsRestantesAutres = nbAutresJoueurs * 4;
  simulationMissionsTimer = setInterval(function() {
    if (!jeuActif || missionsRestantesAutres <= 0) {
      clearInterval(simulationMissionsTimer);
      simulationMissionsTimer = null;
      return;
    }
    missionsRestantesAutres--;
    missionsCollectivesCompletees++;
    updateJaugeMissions();
    // Verifier victoire
    if (missionsCollectivesCompletees >= totalMissionsCollectives) {
      clearInterval(simulationMissionsTimer);
      simulationMissionsTimer = null;
      var gagnant = verifierVictoire();
      if (gagnant) afficherFinPartie(gagnant);
    }
  }, (20000 + Math.random() * 20000)); // entre 20s et 40s par mission
}

function arreterSimulationMissions() {
  if (simulationMissionsTimer) { clearInterval(simulationMissionsTimer); simulationMissionsTimer = null; }
  totalMissionsCollectives = 0;
  missionsCollectivesCompletees = 0;
  var jaugeContainer = document.getElementById('mission-jauge');
  if (jaugeContainer) jaugeContainer.style.display = 'none';
}

function trouverBoutique(nom) {
  var boutiques = document.querySelectorAll('.boutique');
  for (var i = 0; i < boutiques.length; i++) {
    var nomEl = boutiques[i].querySelector('.boutique-nom');
    if (nomEl && nomEl.textContent.trim() === nom) return boutiques[i];
  }
  return null;
}

function initMissions() {
  // Tirer 4 missions aleatoires
  var pool = POOL_MISSIONS.slice();
  mesMissions = [];
  for (var i = 0; i < 4 && pool.length > 0; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    mesMissions.push({ nom: pool[idx].nom, boutiqueNom: pool[idx].boutiqueNom, rect: pool[idx].rect, caisseX: pool[idx].caisseX, caisseY: pool[idx].caisseY, miniJeu: pool[idx].miniJeu, faite: false });
    pool.splice(idx, 1);
  }
  // Generer le HTML des missions dans le HUD
  var liste = document.getElementById('missions-liste');
  if (liste) {
    var html = '';
    for (var j = 0; j < mesMissions.length; j++) {
      html += '<div class="mission-item" id="mission-' + j + '">' +
        '<div class="mission-check"></div>' +
        '<span>' + mesMissions[j].nom + '</span>' +
        '</div>';
    }
    liste.innerHTML = html;
  }

  updateMissionHighlight();
}

var missionProche = -1; // index de la mission proche du joueur
var missionEnCours = false; // true pendant le mini-jeu
var missionTimer = null; // reference au setTimeout de la mission
var miniJeuOuvert = false; // true quand un mini-jeu est ouvert
var miniJeuMissionIdx = -1; // index de la mission en cours de mini-jeu
var miniJeuInterval = null; // interval pour animations (slider, rapidclick)
var miniJeuTimeouts = []; // timeouts actifs pour cleanup
var miniJeuPause = false; // true quand le mini-jeu est en pause (reunion)
var miniJeuResumeFn = null; // fonction pour relancer les intervals apres pause
var miniJeuPauseMissionIdx = -1; // sauvegarde de l'index mission pendant pause
var miniJeuPauseType = ''; // sauvegarde du type de mini-jeu pendant pause

function updateMissionHighlight() {
  // Retirer le highlight de toutes les caisses et boutiques
  document.querySelectorAll('.caisse-cible').forEach(function(c) {
    c.classList.remove('caisse-cible');
  });
  document.querySelectorAll('.boutique-cible').forEach(function(b) {
    b.classList.remove('boutique-cible');
  });

  // Highlight la caisse de chaque mission non faite
  for (var i = 0; i < mesMissions.length; i++) {
    if (!mesMissions[i].faite) {
      var boutique = trouverBoutique(mesMissions[i].boutiqueNom);
      if (boutique) {
        var caisse = boutique.querySelector('.obj-caisse');
        if (caisse) caisse.classList.add('caisse-cible');
      }
    }
  }

  // Mettre a jour les points de mission sur la minimap
  majMinimapMissions();
}

function majMinimapMissions() {
  // Supprimer les anciens points
  var anciens = document.querySelectorAll('.minimap-mission');
  for (var a = 0; a < anciens.length; a++) {
    anciens[a].parentNode.removeChild(anciens[a]);
  }
  var minimapInner = document.querySelector('.minimap-inner');
  if (!minimapInner) return;
  for (var i = 0; i < mesMissions.length; i++) {
    if (mesMissions[i].faite) continue;
    var cx = mesMissions[i].caisseX / MAP_W * 100;
    var cy = mesMissions[i].caisseY / MAP_H * 100;
    var pt = document.createElement('div');
    pt.className = 'minimap-mission';
    pt.style.left = cx + '%';
    pt.style.top = cy + '%';
    minimapInner.appendChild(pt);
  }
}

function faireMission() {
  if (missionProche < 0 || missionProche >= mesMissions.length) return;
  if (missionEnCours) return;
  if (miniJeuOuvert) return;

  // Reprendre le mini-jeu sauvegarde si c'est la meme mission
  if (miniJeuPause && miniJeuPauseMissionIdx === missionProche) {
    missionEnCours = true;
    reprendreMiniJeu();
    var btn = document.getElementById('btn-mission');
    if (btn) btn.style.display = 'none';
    return;
  }

  // Si un autre mini-jeu etait en pause, le fermer definitivement
  if (miniJeuPause) {
    miniJeuPause = false;
    miniJeuResumeFn = null;
    document.getElementById('minijeu-zone').innerHTML = '';
  }

  missionEnCours = true;
  miniJeuMissionIdx = missionProche;

  var btn = document.getElementById('btn-mission');
  if (btn) btn.style.display = 'none';

  var mission = mesMissions[miniJeuMissionIdx];
  var miniJeuType = mission.miniJeu || 'rapidclick';
  ouvrirMiniJeu(mission.nom, miniJeuType);
}

function ouvrirMiniJeu(nomMission, type) {
  miniJeuOuvert = true;
  miniJeuResumeFn = null;
  var overlay = document.getElementById('minijeu-overlay');
  var titre = document.getElementById('minijeu-titre');
  var zone = document.getElementById('minijeu-zone');
  titre.textContent = nomMission;
  zone.innerHTML = '';
  // Bouton croix pour fermer (sauvegarde la progression)
  var closeBtn = document.createElement('button');
  closeBtn.className = 'minijeu-fermer';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = function(){ pauserMiniJeu(); };
  zone.appendChild(closeBtn);
  overlay.classList.add('visible');

  var mjFunc = window['initMJ_' + type];
  if (mjFunc) mjFunc(zone);
  else initMJ_pompes(zone);
}

function fermerMiniJeu() {
  miniJeuOuvert = false;
  miniJeuPause = false;
  miniJeuResumeFn = null;
  if (miniJeuInterval) { clearInterval(miniJeuInterval); miniJeuInterval = null; }
  for (var i = 0; i < miniJeuTimeouts.length; i++) {
    clearTimeout(miniJeuTimeouts[i]);
  }
  miniJeuTimeouts = [];
  var overlay = document.getElementById('minijeu-overlay');
  overlay.classList.remove('visible');
  document.getElementById('minijeu-zone').innerHTML = '';

  if (missionEnCours && miniJeuMissionIdx >= 0 && mesMissions[miniJeuMissionIdx] && !mesMissions[miniJeuMissionIdx].faite) {
    missionEnCours = false;
    miniJeuMissionIdx = -1;
  }
}

function pauserMiniJeu() {
  // Pauser le mini-jeu (garde le DOM intact pour reprendre)
  if (!miniJeuOuvert) return;
  miniJeuPause = true;
  miniJeuPauseMissionIdx = miniJeuMissionIdx;
  miniJeuOuvert = false;
  missionEnCours = false;
  // Stopper les intervals et timeouts (les animations s'arretent)
  if (miniJeuInterval) { clearInterval(miniJeuInterval); miniJeuInterval = null; }
  for (var i = 0; i < miniJeuTimeouts.length; i++) clearTimeout(miniJeuTimeouts[i]);
  miniJeuTimeouts = [];
  // Cacher l'overlay sans detruire le contenu
  var overlay = document.getElementById('minijeu-overlay');
  overlay.classList.remove('visible');
}

function reprendreMiniJeu() {
  // Reprendre le mini-jeu apres la reunion
  if (!miniJeuPause) return;
  miniJeuPause = false;
  miniJeuOuvert = true;
  miniJeuMissionIdx = miniJeuPauseMissionIdx;
  // Re-afficher l'overlay (le DOM est intact)
  var overlay = document.getElementById('minijeu-overlay');
  overlay.classList.add('visible');
  // Relancer les intervals si le mini-jeu en avait
  if (miniJeuResumeFn) { miniJeuResumeFn(); }
}

function completerMiniJeu() {
  var zone = document.getElementById('minijeu-zone');
  var successDiv = document.createElement('div');
  successDiv.className = 'minijeu-success';
  successDiv.textContent = t('mjDone');
  zone.appendChild(successDiv);

  if (miniJeuInterval) { clearInterval(miniJeuInterval); miniJeuInterval = null; }

  var t1 = setTimeout(function() {
    var idx = miniJeuMissionIdx;
    fermerMiniJeu();
    terminerMission(idx);
  }, 1000);
  miniJeuTimeouts.push(t1);
}

function terminerMission(missionIdx) {
  missionEnCours = false;
  miniJeuMissionIdx = -1;

  var m = mesMissions[missionIdx];
  if (!m || m.faite) return;
  m.faite = true;

  var missionEl = document.getElementById('mission-' + missionIdx);
  if (missionEl) {
    missionEl.classList.add('mission-done');
    var check = missionEl.querySelector('.mission-check');
    if (check) check.innerHTML = '&#10003;';
  }

  showNotif(t('missionDone', m.nom), 'info');

  var btn = document.getElementById('btn-mission');
  if (btn) {
    resetBtnMission(btn);
    btn.style.display = 'none';
  }

  if (!modeHorsLigne && totalMissionsCollectives > 0) {
    missionsCollectivesCompletees++;
    updateJaugeMissions();
  }

  updateMissionHighlight();

  var toutesFaites = true;
  for (var i = 0; i < mesMissions.length; i++) {
    if (!mesMissions[i].faite) { toutesFaites = false; break; }
  }
  if (toutesFaites) {
    if (modeHorsLigne) {
      showNotif(t('allMissionsComplete'), 'info');
    } else {
      showNotif(t('youFinishedMissions'), 'info');
    }
  }
  var gagnant = verifierVictoire();
  if (gagnant) {
    afficherFinPartie(gagnant);
  }
}

function resetBtnMission(btn) {
  btn.innerHTML = t('doTask');
  btn.style.pointerEvents = '';
  btn.style.overflow = '';
}

