// Chat - Filtre de mots grossiers/familiers
var MOTS_INTERDITS = [
  'merde', 'putain', 'bordel', 'connard', 'connasse', 'salaud', 'salope',
  'enculer', 'encule', 'enculee', 'nique', 'niquer', 'ntm', 'ntkm',
  'batard', 'batarde', 'fdp', 'fils de pute', 'pute', 'pd', 'pede',
  'bite', 'couille', 'couilles', 'chier', 'foutre', 'baiser',
  'con', 'conne', 'debile', 'abruti', 'abrutie', 'cretin', 'cretine',
  'idiot', 'idiote', 'imbecile', 'taree', 'tare', 'mongol', 'mongole',
  'ta gueule', 'ferme la', 'tg', 'stfu', 'fuck', 'shit', 'bitch',
  'ass', 'asshole', 'damn', 'wtf', 'wesh', 'bouffon', 'bouffonne',
  'naze', 'petasse', 'pouffiasse', 'enfoirer', 'enfoire', 'enfoiree',
  'trouduc', 'trou du cul', 'cul', 'degage', 'ta mere', 'ta race',
  'negro', 'negre', 'sale', 'gros porc', 'grosse', 'pig'
];

// Convertir les raccourcis texte en emojis
var EMOJI_MAP = [
  [':)', '😊'], [':D', '😄'], [':(', '😢'], [':-(', '😢'],
  [';)', '😉'], [':P', '😛'], [':p', '😛'], ['XD', '😂'], ['xD', '😂'],
  [':O', '😮'], [':o', '😮'], ['<3', '❤️'], ['</3', '💔'],
  [':*', '😘'], ['B)', '😎'], ['>:(', '😡'], [':/','😕'],
  [':\\', '😕'], [':|', '😐'], ['^_^', '😊'], ['-_-', '😑'],
  ['T_T', '😭'], ['o_o', '😳'], ['O_O', '😳'], [':3', '😺'],
  ['(y)', '👍'], ['(n)', '👎'], ['<o>', '⭐'], ['gg', '🏆'],
  ['lol', '😂'], ['mdr', '🤣'], ['rip', '💀'], ['zzz', '😴'],
  ['ok', '👌'], ['fire', '🔥'], ['sus', '🤨'], ['bruh', '💀']
];

function convertirEmojis(msg) {
  var result = msg;
  for (var i = 0; i < EMOJI_MAP.length; i++) {
    var raccourci = EMOJI_MAP[i][0];
    var emoji = EMOJI_MAP[i][1];
    // Remplacer uniquement les mots complets ou les symboles exacts
    var escaped = raccourci.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(^|\\s|^)' + escaped + '(\\s|$|$)', 'g');
    result = result.replace(regex, function(match, before, after) {
      return before + emoji + after;
    });
  }
  return result;
}

function filtrerMessage(msg) {
  var msgFiltre = msg;
  for (var i = 0; i < MOTS_INTERDITS.length; i++) {
    var mot = MOTS_INTERDITS[i];
    var regex = new RegExp('\\b' + mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    msgFiltre = msgFiltre.replace(regex, function(match) {
      var stars = '';
      for (var s = 0; s < match.length; s++) stars += '*';
      return stars;
    });
  }
  return msgFiltre;
}

// Anti-spam : max 3 messages par 5 secondes
var _chatTimestamps = [];
var CHAT_MAX_MSG = 3;
var CHAT_COOLDOWN = 5000;
var CHAT_MAX_LENGTH = 200;

function chatAntiSpam() {
  var now = Date.now();
  _chatTimestamps = _chatTimestamps.filter(function(t) { return now - t < CHAT_COOLDOWN; });
  if (_chatTimestamps.length >= CHAT_MAX_MSG) {
    showNotif('Trop de messages, attends un peu.', 'warn');
    return false;
  }
  _chatTimestamps.push(now);
  return true;
}

// Chat
function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  if (msg.length > CHAT_MAX_LENGTH) {
    showNotif('Message trop long (max ' + CHAT_MAX_LENGTH + ' caracteres).', 'warn');
    return;
  }
  if (!chatAntiSpam()) return;
  var msgFiltre = convertirEmojis(filtrerMessage(msg));
  input.value = '';

  if (partieActuelleId && !modeHorsLigne) {
    // Mode en ligne : envoyer via Firebase
    db.collection('chatMessages').add({
      partyId: partieActuelleId,
      playerId: monPlayerId,
      pseudo: getPseudo() || 'Joueur',
      message: msgFiltre,
      context: reunionEnCours ? 'meeting' : 'lobby',
      isSystem: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      console.log('Message chat envoye');
    }).catch(function(err) {
      console.error('Erreur envoi chat:', err);
      showNotif('Erreur envoi message', 'warn');
    });
  } else {
    // Mode hors ligne : affichage local
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    var monPseudo = getPseudo() || 'Vous';
    var pseudoClass = isAdmin() ? 'pseudo pseudo-admin-text' : 'pseudo';
    var pseudoStyle = isAdmin() ? '' : ' style="color:#e74c3c"';
    div.innerHTML = '<span class="' + pseudoClass + '"' + pseudoStyle + '>[' + escapeHtml(monPseudo) + ']:</span> <span class="texte">' + escapeHtml(msgFiltre) + '</span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    try { var sChat = new Audio(Math.random() < 0.5 ? 'Audio/chat1.mp3' : 'Audio/chat2.mp3'); sChat.volume = 0.4; sChat.play(); } catch(e) {}

    // Bots repondent au message
    if (typeof bots !== 'undefined' && bots.length > 0) {
      botRepondreChat(msgFiltre, container);
    }
  }
}

// Reponses des bots selon mots-cles
var BOT_REPONSES = {
  salut: ['Salut ! 😊', 'Hey ! 👋', 'Yo', 'Hello !', 'Coucou 😄'],
  bonjour: ['Bonjour ! 😊', 'Salut !', 'Bjr 👋', 'Hey bonjour'],
  hello: ['Hello ! 👋', 'Hey !', 'Hi ! 😊'],
  coucou: ['Coucou ! 😄', 'Hey !', 'Salut 👋'],
  'qui est le virus': ['Je sais pas mais c\'est suspect... 🤨', 'Pas moi en tout cas 😇', 'J\'ai mes doutes sur quelqu\'un 🤔', 'Aucune idee', 'Regardez qui n\'a pas fait ses missions 👀'],
  'c\'est qui': ['Bonne question... 🤔', 'J\'accuse personne pour l\'instant', 'Pas moi ! 😤'],
  suspect: ['Ouais c\'est louche 🤨', 'J\'ai vu personne', 'Moi je dis c\'est pas moi 😇', 'Faut voter'],
  'c\'est toi': ['Non c\'est pas moi ! 😤', 'N\'importe quoi 😡', 'Prouve-le', 'Arrete de m\'accuser ! 😠', 'Moi ? Jamais 😇'],
  vote: ['On vote qui ? 🤔', 'Faut voter maintenant', 'Je sais pas pour qui voter... 😕', 'Votez pas pour moi svp 🙏'],
  'ou': ['Je suis vers la fontaine', 'Je faisais mes missions 📋', 'J\'etais au supermarche'],
  mission: ['J\'ai fait 2 missions ✅', 'Il me reste une mission', 'Je suis en train d\'en faire une 📋'],
  aide: ['Je peux rien faire dsl 😕', 'Fais tes missions !', 'Reste pas tout seul 😬'],
  lol: ['haha 😂', 'mdr 🤣', 'xD 😂', 'ptdr 💀'],
  mdr: ['lol 😂', 'haha 😄', 'xD 🤣'],
  gg: ['Bien joue ! 🏆', 'GG ! 👏', 'Gg wp 🎉'],
  non: ['Si si 😤', 'Bah pourquoi ? 🤔', 'Ok... 😐'],
  oui: ['D\'accord 👍', 'Ok ! 👌', 'Ah ouais ? 🤔']
};

function botRepondreChat(msg, container) {
  var msgLower = msg.toLowerCase();
  var reponses = null;

  // Chercher un mot-cle dans le message
  var cles = Object.keys(BOT_REPONSES);
  for (var k = 0; k < cles.length; k++) {
    if (msgLower.indexOf(cles[k]) >= 0) {
      reponses = BOT_REPONSES[cles[k]];
      break;
    }
  }

  // Si aucun mot-cle, 30% de chance de repondre quand meme
  if (!reponses) {
    if (Math.random() > 0.3) return;
    reponses = ['Ok 👌', '...', 'Hmm 🤔', 'D\'accord 👍', 'Ah', 'Ouais', 'Bon 😐'];
  }

  // 1 a 2 bots repondent avec un delai
  var nbRepondeurs = Math.min(1 + Math.floor(Math.random() * 2), bots.length);
  var botsChoisis = bots.slice();
  // Melanger
  for (var i = botsChoisis.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = botsChoisis[i]; botsChoisis[i] = botsChoisis[j]; botsChoisis[j] = t;
  }

  for (var b = 0; b < nbRepondeurs; b++) {
    (function(bot, delai) {
      setTimeout(function() {
        if (!container) return;
        var rep = reponses[Math.floor(Math.random() * reponses.length)];
        var divBot = document.createElement('div');
        divBot.className = 'chat-msg';
        divBot.innerHTML = '<span class="pseudo" style="color:#95a5a6">[' + escapeHtml(bot.pseudo) + ']:</span> <span class="texte">' + escapeHtml(rep) + '</span>';
        container.appendChild(divBot);
        container.scrollTop = container.scrollHeight;
        try { var s = new Audio(Math.random() < 0.5 ? 'Audio/chat1.mp3' : 'Audio/chat2.mp3'); s.volume = 0.3; s.play(); } catch(e) {}
      }, delai);
    })(botsChoisis[b], 1500 + b * 2000 + Math.floor(Math.random() * 2000));
  }
}

