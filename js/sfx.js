// ============================
// SFX - Sons generes par code (Web Audio API)
// ============================
// Avantages : aucun fichier a charger, pas de copyright, leger.
// API simple : playSfx('reunion'), playSfx('kill'), etc.

var _sfxCtx = null;
function _getSfxCtx() {
  if (!_sfxCtx) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try { _sfxCtx = new AudioCtx(); } catch(e) { return null; }
  }
  // Si suspended (souvent sur mobile/Chrome avant interaction), tenter de resume
  if (_sfxCtx.state === 'suspended') {
    try { _sfxCtx.resume(); } catch(e) {}
  }
  return _sfxCtx;
}

// Joue un beep simple (helper interne)
function _sfxBeep(ctx, freq, startTime, duration, type, gain) {
  type = type || 'square';
  gain = gain !== undefined ? gain : 0.3;
  var osc = ctx.createOscillator();
  var g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Enveloppe ADSR rapide pour eviter les clics
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  g.gain.linearRampToValueAtTime(gain * 0.7, startTime + duration * 0.6);
  g.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Sweep de frequence (helper interne)
function _sfxSweep(ctx, freqStart, freqEnd, startTime, duration, type, gain) {
  type = type || 'sawtooth';
  gain = gain !== undefined ? gain : 0.25;
  var osc = ctx.createOscillator();
  var g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(50, freqEnd), startTime + duration);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  g.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// === SON DE REUNION D'URGENCE ===
// Sirene 2-tons alternant (style alarme) + sweep grave final
function playSfxReunion() {
  var ctx = _getSfxCtx();
  if (!ctx) return;
  var t = ctx.currentTime;
  var d = 0.18; // duree de chaque beep
  // 5 beeps alternants 700Hz / 500Hz (sirene style)
  _sfxBeep(ctx, 700, t,            d, 'square', 0.32);
  _sfxBeep(ctx, 500, t + d,        d, 'square', 0.32);
  _sfxBeep(ctx, 700, t + d * 2,    d, 'square', 0.32);
  _sfxBeep(ctx, 500, t + d * 3,    d, 'square', 0.32);
  _sfxBeep(ctx, 800, t + d * 4,    d * 1.3, 'square', 0.34); // beep final plus aigu et plus long
  // Sweep grave en fond pour donner du poids ("BWAAA" final)
  _sfxSweep(ctx, 220, 80, t + d * 4.5, 0.55, 'sawtooth', 0.22);
}

// === SON COUINEMENT (cache-cache anti-camp) ===
// Petit chirp aigu type "tsi-tsi" qui revele la position du cache
function playSfxCouinement() {
  var ctx = _getSfxCtx();
  if (!ctx) return;
  var t = ctx.currentTime;
  // 1er chirp : sweep rapide aigu
  _sfxSweep(ctx, 1500, 2300, t,        0.10, 'square', 0.18);
  // pause 0.05s
  // 2e chirp : un poil plus aigu pour le "tsi-tsi"
  _sfxSweep(ctx, 1700, 2500, t + 0.15, 0.12, 'square', 0.18);
}

// === DISPATCHER GENERIQUE ===
function playSfx(name) {
  switch (name) {
    case 'reunion': playSfxReunion(); break;
    case 'couinement': playSfxCouinement(); break;
    // Autres sons a ajouter ici plus tard (kill, mission, victoire...)
    default: console.warn('Sfx inconnu :', name);
  }
}
