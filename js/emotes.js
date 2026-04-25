// ============================
// SYSTEME D'EMOTES
// ============================
var EMOTES = [
  { id: 'lol',     emoji: '\uD83D\uDE02', nom: 'LOL',     anim: 'squash' },
  { id: 'dance',   emoji: '\uD83D\uDD7A', nom: 'Dance',   anim: 'wiggle' },
  { id: 'love',    emoji: '\u2764\uFE0F', nom: 'Love',    anim: 'jump' },
  { id: 'cry',     emoji: '\uD83D\uDE2D', nom: 'Cry',     anim: 'squashDown' },
  { id: 'wave',    emoji: '\uD83D\uDC4B', nom: 'Wave',    anim: 'tilt' },
  { id: 'omg',     emoji: '\uD83E\uDD2F', nom: 'OMG',     anim: 'stretch' },
  { id: 'cool',    emoji: '\uD83D\uDE0E', nom: 'Cool',    anim: 'tilt' },
  { id: 'think',   emoji: '\uD83E\uDD14', nom: 'Think',   anim: 'wiggle' },
  { id: 'flex',    emoji: '\uD83D\uDCAA', nom: 'Flex',    anim: 'squash' },
  { id: 'party',   emoji: '\uD83C\uDF89', nom: 'Party',   anim: 'jump' },
  { id: 'silence', emoji: '\uD83E\uDD2B', nom: 'Silence', anim: 'stretch' },
  { id: 'anger',   emoji: '\uD83D\uDE21', nom: 'Colere',  anim: 'squashDown' }
];

// Emotes payants (boutique)
var EMOTES_BOUTIQUE = [
  { id: 'salut',      emoji: '🤝', nom: 'Salut',       anim: 'tilt',       prix: 50,  rarete: 'commun' },
  { id: 'fete',       emoji: '🎊', nom: 'Fete',        anim: 'jump',       prix: 100, rarete: 'rare' },
  { id: 'mortx',      emoji: '💀', nom: 'Mort',        anim: 'squashDown', prix: 100, rarete: 'rare' },
  { id: 'endormi',    emoji: '😴', nom: 'Endormi',     anim: 'wiggle',     prix: 100, rarete: 'rare' },
  { id: 'genie',      emoji: '💡', nom: 'Genie',       anim: 'stretch',    prix: 150, rarete: 'rare' },
  { id: 'frigorifie', emoji: '🥶', nom: 'Frigorifie',  anim: 'wiggle',     prix: 150, rarete: 'rare' },
  { id: 'brulant',    emoji: '🥵', nom: 'Brulant',     anim: 'jump',       prix: 150, rarete: 'rare' },
  { id: 'degoute',    emoji: '🤢', nom: 'Degoute',     anim: 'squashDown', prix: 100, rarete: 'commun' },
  { id: 'flirt',      emoji: '😘', nom: 'Flirt',       anim: 'jump',       prix: 200, rarete: 'epic' },
  { id: 'rock',       emoji: '🤘', nom: 'Rock',        anim: 'wiggle',     prix: 200, rarete: 'epic' },
  { id: 'arcenciel',  emoji: '🌈', nom: 'Arc-en-ciel', anim: 'stretch',    prix: 250, rarete: 'epic' },
  { id: 'feu',        emoji: '🔥', nom: 'Feu',         anim: 'jump',       prix: 250, rarete: 'epic' }
];

var _emoteCooldown = 0;
var EMOTE_COOLDOWN_MS = 4000;
var EMOTE_DUREE_MS = 2000;

// Ouvrir/fermer le panel d'emotes
function toggleEmotePicker() {
  var panel = document.getElementById('emote-picker-panel');
  if (!panel) return;
  panel.classList.toggle('visible');
  if (panel.classList.contains('visible')) {
    remplirEmotePicker();
  }
}

function fermerEmotePicker() {
  var panel = document.getElementById('emote-picker-panel');
  if (panel) panel.classList.remove('visible');
}

function toggleEmotePickerLobby() {
  var panel = document.getElementById('sa-emote-picker-panel');
  if (!panel) return;
  panel.classList.toggle('visible');
  if (panel.classList.contains('visible')) {
    remplirEmotePickerLobby();
  }
}
function fermerEmotePickerLobby() {
  var panel = document.getElementById('sa-emote-picker-panel');
  if (panel) panel.classList.remove('visible');
}
function remplirEmotePickerLobby() {
  var panel = document.getElementById('sa-emote-picker-panel');
  if (!panel) return;
  panel.innerHTML = '';
  var emotes = getAllEmotesDispo();
  emotes.forEach(function(em) {
    var btn = document.createElement('button');
    btn.className = 'emote-btn';
    btn.title = em.nom;
    btn.innerHTML = '<span class="emote-btn-emoji">' + em.emoji + '</span><span class="emote-btn-nom">' + em.nom + '</span>';
    btn.onclick = function() { jouerEmoteLobby(em.id); fermerEmotePickerLobby(); };
    panel.appendChild(btn);
  });
}

function jouerEmoteLobby(emoteId) {
  var em = getAllEmotesDispo().find(function(e) { return e.id === emoteId; });
  if (!em) return;
  var now = Date.now();
  if (now < _emoteCooldown) {
    if (typeof showNotif === 'function') showNotif(t('emoteCooldown'), 'info');
    return;
  }
  _emoteCooldown = now + EMOTE_COOLDOWN_MS;
  // Animer sur l'avatar lobby
  var avatar = document.getElementById('sa-avatar-skin') || document.getElementById('sa-mon-avatar');
  if (avatar) afficherEmoteSur(avatar, em);
  // Sync online si en lobby online
  if (typeof modeHorsLigne !== 'undefined' && !modeHorsLigne && typeof myPartyPlayerDocId !== 'undefined' && myPartyPlayerDocId && typeof db !== 'undefined') {
    db.collection('partyPlayers').doc(myPartyPlayerDocId).update({
      emote: emoteId,
      emoteAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function() {});
  }
  var btn = document.getElementById('sa-btn-emote');
  if (btn) {
    btn.classList.add('cooldown');
    setTimeout(function() { btn.classList.remove('cooldown'); }, EMOTE_COOLDOWN_MS);
  }
}

function getAllEmotesDispo() {
  var liste = EMOTES.slice();
  var achetes = [];
  try { achetes = JSON.parse(localStorage.getItem('virusEmotesAchetes')) || []; } catch(e) {}
  // Ajouter les emotes du passe reellement reclames
  if (typeof EMOTES_PASSE !== 'undefined') {
    EMOTES_PASSE.forEach(function(ep) {
      if (achetes.indexOf(ep.id) >= 0 && !liste.find(function(e) { return e.id === ep.id; })) {
        liste.push(ep);
      }
    });
  }
  // Ajouter les emotes boutique achetes
  if (typeof EMOTES_BOUTIQUE !== 'undefined') {
    EMOTES_BOUTIQUE.forEach(function(eb) {
      if (achetes.indexOf(eb.id) >= 0 && !liste.find(function(e) { return e.id === eb.id; })) {
        liste.push(eb);
      }
    });
  }
  return liste;
}

function remplirEmotePicker() {
  var panel = document.getElementById('emote-picker-panel');
  if (!panel) return;
  panel.innerHTML = '';
  var emotes = getAllEmotesDispo();
  emotes.forEach(function(em) {
    var btn = document.createElement('button');
    btn.className = 'emote-btn';
    btn.title = em.nom;
    btn.innerHTML = '<span class="emote-btn-emoji">' + em.emoji + '</span><span class="emote-btn-nom">' + em.nom + '</span>';
    btn.onclick = function() { jouerEmote(em.id); fermerEmotePicker(); };
    panel.appendChild(btn);
  });
}

// Jouer un emote pour le joueur local + syncer online
function jouerEmote(emoteId) {
  var em = getAllEmotesDispo().find(function(e) { return e.id === emoteId; });
  if (!em) return;
  var now = Date.now();
  if (now < _emoteCooldown) {
    if (typeof showNotif === 'function') showNotif(t('emoteCooldown'), 'info');
    return;
  }
  _emoteCooldown = now + EMOTE_COOLDOWN_MS;
  // Animer localement
  var joueurEl = document.getElementById('joueur');
  if (joueurEl) afficherEmoteSur(joueurEl, em);
  // Syncer online : ecrire sur partyPlayers
  if (typeof modeHorsLigne !== 'undefined' && !modeHorsLigne && typeof myPartyPlayerDocId !== 'undefined' && myPartyPlayerDocId && typeof db !== 'undefined') {
    db.collection('partyPlayers').doc(myPartyPlayerDocId).update({
      emote: emoteId,
      emoteAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function() {});
  }
  // Cooldown visuel sur le bouton
  var btn = document.getElementById('btn-emote');
  if (btn) {
    btn.classList.add('cooldown');
    setTimeout(function() { btn.classList.remove('cooldown'); }, EMOTE_COOLDOWN_MS);
  }
}

// Afficher l'anim + la bulle emoji sur un element DOM joueur
function afficherEmoteSur(element, em) {
  if (!element || !em) return;
  // Nettoyer anims precedentes
  element.classList.remove('emote-squash', 'emote-squashDown', 'emote-wiggle', 'emote-jump', 'emote-tilt', 'emote-stretch');
  // Trigger reflow
  void element.offsetWidth;
  element.classList.add('emote-' + em.anim);
  // Bulle emoji
  var bulle = element.querySelector('.emote-bulle');
  if (bulle) bulle.remove();
  bulle = document.createElement('div');
  bulle.className = 'emote-bulle';
  bulle.textContent = em.emoji;
  element.appendChild(bulle);
  setTimeout(function() {
    element.classList.remove('emote-' + em.anim);
    if (bulle && bulle.parentNode) bulle.remove();
  }, EMOTE_DUREE_MS);
}

// Declencher un emote sur un joueur distant depuis un snapshot Firebase
var _emotesJouees = {}; // pseudo/docId -> emoteAt timestamp deja joue
function traiterEmoteRemote(docId, data) {
  if (!data || !data.emote || !data.emoteAt) return;
  var stamp = data.emoteAt.toMillis ? data.emoteAt.toMillis() : data.emoteAt;
  // Ignorer les emotes trop anciennes (> 5s)
  if (!stamp || Date.now() - stamp > 5000) return;
  if (_emotesJouees[docId] === stamp) return;
  _emotesJouees[docId] = stamp;
  // Ignorer si c'est moi
  if (typeof myPartyPlayerDocId !== 'undefined' && docId === myPartyPlayerDocId) return;
  var allEmotes = EMOTES.concat(typeof EMOTES_PASSE !== 'undefined' ? EMOTES_PASSE : []).concat(typeof EMOTES_BOUTIQUE !== 'undefined' ? EMOTES_BOUTIQUE : []);
  var em = allEmotes.find(function(e) { return e.id === data.emote; });
  if (!em) return;
  // Trouver l'element DOM : remote-playerId (jeu) ou sa-remote-playerId (lobby)
  var el = document.getElementById('remote-' + data.playerId) || document.getElementById('sa-remote-' + data.playerId);
  if (el) afficherEmoteSur(el, em);
}
