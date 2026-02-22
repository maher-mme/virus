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

// Chat
function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  var msgFiltre = filtrerMessage(msg);
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
    }).catch(function() {});
  } else {
    // Mode hors ligne : affichage local
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    var monPseudo = getPseudo() || 'Vous';
    var pseudoClass = isAdmin() ? 'pseudo pseudo-admin-text' : 'pseudo';
    var pseudoStyle = isAdmin() ? '' : ' style="color:#e74c3c"';
    div.innerHTML = '<span class="' + pseudoClass + '"' + pseudoStyle + '>[' + monPseudo.replace(/</g, '&lt;') + ']:</span> <span class="texte">' + msgFiltre.replace(/</g, '&lt;') + '</span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    try { var sChat = new Audio(Math.random() < 0.5 ? 'Audio/chat1.mp3' : 'Audio/chat2.mp3'); sChat.volume = 0.4; sChat.play(); } catch(e) {}
  }
}

