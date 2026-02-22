// Systeme de musique
var MUSIQUES = [
  { id: 'destroyed', nom: 'Destroyed', artiste: '', fichier: 'musique/Destroyed/destroyed-multiverse-album.mp3', image: 'musique/Destroyed/destroyed-image.svg' }
];

var MUSIQUES_BOUTIQUE = [
  { id: 'minecraft', nom: 'Minecraft', artiste: '', fichier: 'musique/mincraft/minecraft-game-relax.wav', image: 'musique/mincraft/minecraft-cover.png', prix: 300, couleur: '#2ecc71' },
  { id: 'tadc', nom: 'The Amazing Digital Circus', artiste: '', fichier: 'musique/The_Amazing_Digital_Circus/The_Amazing_Digital_Circus_.mp3', image: 'musique/The_Amazing_Digital_Circus/The_Amazing_Digital_Circus.png', prix: 250, couleur: '#9b59b6' },
  { id: 'multiverse', nom: 'Multiverse', artiste: '', fichier: 'musique/multiverse/Multiverse.mp3', image: 'musique/multiverse/affiche_de_multiverse.png', prix: 200, couleur: '#e74c3c' },
  { id: 'flute_flailed', nom: 'Fl\u00fbte flailed', artiste: '', fichier: 'musique/fl\u00fbte_flailed/flute-failed-sondtrack.mp3', image: 'musique/fl\u00fbte_flailed/affiche_de_fl\u00fbte.flailed.png', prix: 200, couleur: '#3b3b98' }
];

function getMusiqueId() {
  return localStorage.getItem('virus_musique') || 'destroyed';
}

function setMusique(musiqueId) {
  localStorage.setItem('virus_musique', musiqueId);
  var m = MUSIQUES.find(function(x) { return x.id === musiqueId; });
  if (m) {
    var audio = document.getElementById('musique-menu');
    if (audio) {
      var wasPlaying = !audio.paused;
      audio.src = m.fichier;
      if (wasPlaying) audio.play();
    }
  }
  genererMusiqueList();
}

function genererMusiqueList() {
  var container = document.getElementById('casier-musique-list');
  if (!container) return;
  container.innerHTML = '';
  var currentId = getMusiqueId();
  MUSIQUES.forEach(function(m) {
    var isActive = m.id === currentId;
    var div = document.createElement('div');
    div.className = 'musique-item' + (isActive ? ' musique-active' : '');
    var iconHtml = m.image ? '<div class="musique-item-icon" style="background:none;"><img src="' + m.image + '" style="width:100%;height:100%;object-fit:contain;"></div>' : '<div class="musique-item-icon">&#9835;</div>';
    div.innerHTML = iconHtml +
      '<div class="musique-item-info">' +
        '<div class="musique-item-title">' + m.nom + '</div>' +
        '<div class="musique-item-artist">' + m.artiste + '</div>' +
      '</div>' +
      '<button class="musique-item-equip">' + (isActive ? t('equip') : t('equip')) + '</button>';
    div.querySelector('.musique-item-equip').textContent = isActive ? '✓' : t('equip');
    div.querySelector('.musique-item-equip').onclick = function(e) {
      e.stopPropagation();
      setMusique(m.id);
    };
    container.appendChild(div);
  });
}
