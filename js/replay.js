// === SYSTEME DE REPLAY (parties online uniquement) ===
// Enregistre les evenements cles d'une partie et permet de les revoir en timeline.

var _replayActif = false;
var _replayEvents = [];
var _replayStartTime = 0;
var _replayMeta = null;

function replayStart(meta) {
  // meta = { mode: 'online', monPseudo, monRole, joueurs: [{pseudo, role, skin}] }
  _replayActif = true;
  _replayEvents = [];
  _replayStartTime = Date.now();
  _replayMeta = meta || {};
  replayLog('start', { texte: 'Debut de partie' });
}

function replayLog(type, data) {
  if (!_replayActif) return;
  _replayEvents.push({
    t: Date.now() - _replayStartTime,
    type: type,
    data: data || {}
  });
}

function replaySaveEnd(gagnant) {
  if (!_replayActif) return;
  replayLog('end', { gagnant: gagnant, texte: 'Fin de partie : ' + (gagnant || 'inconnu') });
  _replayActif = false;
  try {
    var replay = {
      date: Date.now(),
      meta: _replayMeta,
      gagnant: gagnant,
      duree: Date.now() - _replayStartTime,
      events: _replayEvents
    };
    localStorage.setItem('virusLastReplay', JSON.stringify(replay));
  } catch (e) {
    // Quota depasse : retirer le replay precedent
    try { localStorage.removeItem('virusLastReplay'); } catch(e2) {}
  }
}

function replayHasOne() {
  try { return !!localStorage.getItem('virusLastReplay'); } catch(e) { return false; }
}

function ouvrirReplay() {
  var raw;
  try { raw = localStorage.getItem('virusLastReplay'); } catch(e) { return; }
  if (!raw) { showNotif(t('replayNone'), 'warn'); return; }
  var replay;
  try { replay = JSON.parse(raw); } catch(e) { showNotif(t('replayCorrupt'), 'warn'); return; }
  if (!replay || !replay.events) return;

  var existing = document.getElementById('replay-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'replay-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;background:rgba(0,0,0,0.92);z-index:700;display:flex;flex-direction:column;align-items:center;padding:20px 12px 30px;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;';

  var dureeMin = Math.floor(replay.duree / 60000);
  var dureeSec = Math.floor((replay.duree % 60000) / 1000);
  var dateStr = new Date(replay.date).toLocaleString();
  var gagnantTxt = replay.gagnant === 'virus' ? 'Virus' : (replay.gagnant === 'fanatique' ? 'Fanatique' : 'Innocents');
  var gagnantColor = replay.gagnant === 'virus' ? '#e74c3c' : (replay.gagnant === 'fanatique' ? '#8e44ad' : '#2ecc71');

  var html = '';
  html += '<div style="width:100%;max-width:600px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px;">';
  html += '<h2 style="color:#f1c40f;font-family:Arial,sans-serif;font-size:22px;margin:0;letter-spacing:2px;">&#127909; REPLAY</h2>';
  html += '<button onclick="fermerReplay()" style="background:#e74c3c;color:white;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-weight:bold;">FERMER</button>';
  html += '</div>';

  html += '<div style="width:100%;max-width:600px;background:rgba(44,62,80,0.7);border:1px solid #34495e;border-radius:10px;padding:14px;margin-bottom:14px;color:white;font-family:Arial,sans-serif;font-size:13px;">';
  html += '<div style="display:flex;justify-content:space-around;flex-wrap:wrap;gap:10px;text-align:center;">';
  html += '<div><div style="font-size:11px;color:#95a5a6;">DATE</div><div style="font-weight:bold;">' + dateStr + '</div></div>';
  html += '<div><div style="font-size:11px;color:#95a5a6;">DUREE</div><div style="font-weight:bold;">' + dureeMin + 'm' + (dureeSec < 10 ? '0' : '') + dureeSec + 's</div></div>';
  html += '<div><div style="font-size:11px;color:#95a5a6;">VAINQUEUR</div><div style="font-weight:bold;color:' + gagnantColor + ';">' + gagnantTxt + '</div></div>';
  html += '<div><div style="font-size:11px;color:#95a5a6;">EVENEMENTS</div><div style="font-weight:bold;">' + replay.events.length + '</div></div>';
  html += '</div></div>';

  // Joueurs
  if (replay.meta && replay.meta.joueurs && replay.meta.joueurs.length) {
    html += '<div style="width:100%;max-width:600px;background:rgba(44,62,80,0.5);border-radius:10px;padding:10px;margin-bottom:14px;color:white;font-family:Arial,sans-serif;">';
    html += '<div style="font-size:11px;color:#95a5a6;margin-bottom:6px;">JOUEURS</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    for (var jp = 0; jp < replay.meta.joueurs.length; jp++) {
      var jr = replay.meta.joueurs[jp];
      html += '<div style="background:rgba(0,0,0,0.4);padding:4px 8px;border-radius:6px;font-size:12px;"><b>' + escHtml(jr.pseudo) + '</b> <span style="opacity:0.7;font-size:10px;">[' + (jr.role || '?').toUpperCase() + ']</span></div>';
    }
    html += '</div></div>';
  }

  // Timeline
  html += '<div style="width:100%;max-width:600px;background:rgba(0,0,0,0.5);border:1px solid #34495e;border-radius:10px;padding:12px;color:white;font-family:Arial,sans-serif;">';
  html += '<div style="font-size:11px;color:#f39c12;margin-bottom:10px;font-weight:bold;letter-spacing:1px;">TIMELINE</div>';
  for (var ie = 0; ie < replay.events.length; ie++) {
    var ev = replay.events[ie];
    var min = Math.floor(ev.t / 60000);
    var sec = Math.floor((ev.t % 60000) / 1000);
    var stamp = min + ':' + (sec < 10 ? '0' : '') + sec;
    var icon = '&#9889;', color = '#bdc3c7';
    var texte = ev.data.texte || '';
    if (ev.type === 'start') { icon = '&#127937;'; color = '#3498db'; }
    else if (ev.type === 'end') { icon = '&#127937;'; color = gagnantColor; }
    else if (ev.type === 'kill') { icon = '&#9760;'; color = '#e74c3c'; texte = escHtml(ev.data.tueur || '?') + ' a infecte ' + escHtml(ev.data.victime || '?'); }
    else if (ev.type === 'mission') { icon = '&#9989;'; color = '#2ecc71'; texte = escHtml(ev.data.joueur || '?') + ' a fait une mission'; }
    else if (ev.type === 'signalement') { icon = '&#128276;'; color = '#f39c12'; texte = escHtml(ev.data.joueur || '?') + ' a signale ' + escHtml(ev.data.victime || '?'); }
    else if (ev.type === 'reunion') { icon = '&#128172;'; color = '#9b59b6'; texte = 'Reunion declenchee'; }
    else if (ev.type === 'vote') { icon = '&#128683;'; color = '#e67e22'; texte = ev.data.elimine ? (escHtml(ev.data.elimine) + ' a ete eliminee') : 'Aucun vote majoritaire'; }
    else if (ev.type === 'alarme') { icon = '&#128680;'; color = '#e74c3c'; texte = 'Alarme declenchee'; }

    html += '<div style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.05);">';
    html += '<span style="background:' + color + ';color:white;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:bold;min-width:40px;text-align:center;">' + stamp + '</span>';
    html += '<span style="font-size:18px;">' + icon + '</span>';
    html += '<span style="flex:1;font-size:13px;">' + texte + '</span>';
    html += '</div>';
  }
  html += '</div>';

  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function fermerReplay() {
  var el = document.getElementById('replay-overlay');
  if (el) el.remove();
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
