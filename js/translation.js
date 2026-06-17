// ============================
// CORE TRANSLATION (modulaire)
// ============================
// Charge dynamiquement uniquement la langue active depuis js/lang/lang-XX.js.
// Auto-detection de la langue de l'appareil au premier lancement.
// Si la langue de l'utilisateur n'est pas supportee → fallback EN.

// Langues supportees (avec leur nom natif pour l'UI)
var LANGUES_SUPPORTEES = {
  fr: { nom: 'Francais', dir: 'ltr' },
  en: { nom: 'English',  dir: 'ltr' },
  es: { nom: 'Espanol',  dir: 'ltr' },
  ja: { nom: '日本語',    dir: 'ltr' },
  de: { nom: 'Deutsch',  dir: 'ltr' },
  ar: { nom: 'العربية',  dir: 'rtl' },
  pt: { nom: 'Portugues',dir: 'ltr' },
  zh: { nom: '中文',      dir: 'ltr' },
  ru: { nom: 'Русский',  dir: 'ltr' },
  hi: { nom: 'हिन्दी',     dir: 'ltr' },
  ko: { nom: '한국어',    dir: 'ltr' },
  it: { nom: 'Italiano', dir: 'ltr' },
  tr: { nom: 'Turkce',   dir: 'ltr' }
};

// === Detection auto de la langue de l'appareil ===
function detecterLangueAppareil() {
  // Si l'utilisateur a deja choisi une langue manuellement, on respecte
  var langSauvee = localStorage.getItem('virus_lang');
  if (langSauvee && LANGUES_SUPPORTEES[langSauvee]) return langSauvee;

  // Sinon, lire la langue de l'appareil
  var langsUser = navigator.languages || [navigator.language || 'en'];
  for (var i = 0; i < langsUser.length; i++) {
    var code = (langsUser[i] || '').toLowerCase().split('-')[0]; // 'fr-FR' → 'fr'
    if (LANGUES_SUPPORTEES[code]) return code;
  }
  return 'en'; // fallback universel
}

var currentLang = detecterLangueAppareil();
var TR = TR || {};

// === Chargement dynamique d'un fichier de langue ===
var _langsChargees = {};
var _onLangLoadedCallbacks = [];

function chargerLangue(lang, callback) {
  if (!LANGUES_SUPPORTEES[lang]) lang = 'en'; // fallback
  if (_langsChargees[lang]) {
    if (callback) callback();
    return;
  }
  var script = document.createElement('script');
  script.src = 'js/lang/lang-' + lang + '.js?v=1';
  script.onload = function() {
    _langsChargees[lang] = true;
    if (callback) callback();
  };
  script.onerror = function() {
    console.warn('Echec chargement langue ' + lang + ', fallback EN');
    if (lang !== 'en') chargerLangue('en', callback);
    else if (callback) callback();
  };
  document.head.appendChild(script);
}

// === Fonction principale de traduction ===
function t(key) {
  var val = TR[currentLang] && TR[currentLang][key];
  // Fallback chain : current → EN → FR → key
  if (val === undefined || val === null) val = TR['en'] && TR['en'][key];
  if (val === undefined || val === null) val = TR['fr'] && TR['fr'][key];
  if (val === undefined || val === null) val = key;
  // Tableau : retourner direct
  if (Array.isArray(val)) return val;
  // Remplacer {0}, {1}, etc.
  for (var i = 1; i < arguments.length; i++) {
    val = val.replace(new RegExp('\\{' + (i - 1) + '\\}', 'g'), arguments[i]);
  }
  return val;
}

// === Filtre des langues dans les selecteurs avec recherche ===
function filtrerLangues(input) {
  var query = input.value.toLowerCase();
  var selector = input.nextElementSibling;
  if (!selector || !selector.classList.contains('lang-selector')) {
    selector = input.parentElement.querySelector('.lang-selector');
  }
  if (!selector) return;
  var btns = selector.querySelectorAll('.lang-btn');
  for (var i = 0; i < btns.length; i++) {
    var texte = btns[i].textContent.toLowerCase();
    btns[i].style.display = texte.indexOf(query) !== -1 ? '' : 'none';
  }
}

// === Changer la langue (sauvegarde + re-traduction) ===
function setLanguage(lang) {
  if (!LANGUES_SUPPORTEES[lang]) lang = 'en';
  currentLang = lang;
  localStorage.setItem('virus_lang', lang);
  // Mettre a jour la direction du document (LTR/RTL)
  document.documentElement.dir = LANGUES_SUPPORTEES[lang].dir || 'ltr';
  // Charger le fichier si pas encore charge
  chargerLangue(lang, function() {
    document.querySelectorAll('.lang-btn').forEach(function(b) { b.classList.remove('active'); });
    ['lang-', 'compte-lang-', 'cp-lang-'].forEach(function(prefix) {
      var btn = document.getElementById(prefix + lang);
      if (btn) btn.classList.add('active');
    });
    translatePage();
    if (typeof rafraichirPanelAmis === 'function') rafraichirPanelAmis();
  });
}

// === Applique les traductions sur tous les elements [data-i18n] ===
function translatePage() {
  var els = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-i18n');
    var attr = els[i].getAttribute('data-i18n-attr');
    if (attr === 'placeholder') {
      els[i].placeholder = t(key);
    } else if (els[i].hasAttribute('data-i18n-html')) {
      els[i].innerHTML = t(key);
    } else {
      els[i].textContent = t(key);
    }
  }
  // Rebuild des dropdowns dynamiques (joueurs / virus) avec la langue active
  var selMax = document.getElementById('cp-max-joueurs');
  if (selMax) {
    var valMax = selMax.value;
    selMax.innerHTML = '';
    for (var j = 4; j <= 15; j++) {
      var opt = document.createElement('option');
      opt.value = j;
      opt.textContent = j + ' ' + t('players');
      if (String(j) === valMax) opt.selected = true;
      selMax.appendChild(opt);
    }
  }
  var selMech = document.getElementById('cp-mechants');
  if (selMech) {
    var valMech = selMech.value;
    var virusLbl = (t('virusLabel') || 'virus').replace(/[: ：]+$/, '').toLowerCase();
    selMech.innerHTML = '';
    for (var v = 1; v <= 3; v++) {
      var optV = document.createElement('option');
      optV.value = v;
      optV.textContent = v + ' ' + virusLbl;
      if (String(v) === valMech) optV.selected = true;
      selMech.appendChild(optV);
    }
  }
}

// === Initialisation au chargement ===
// Charger la langue active + EN (pour fallback), puis traduire la page
(function() {
  document.documentElement.dir = LANGUES_SUPPORTEES[currentLang].dir || 'ltr';
  function appliquerInit() {
    document.querySelectorAll('.lang-btn').forEach(function(b) { b.classList.remove('active'); });
    ['lang-', 'compte-lang-', 'cp-lang-'].forEach(function(prefix) {
      var btn = document.getElementById(prefix + currentLang);
      if (btn) btn.classList.add('active');
    });
    translatePage();
  }
  // Charger la langue courante d'abord
  chargerLangue(currentLang, function() {
    // Puis charger EN en arriere-plan pour le fallback (si different)
    if (currentLang !== 'en') {
      chargerLangue('en', function() { appliquerInit(); });
    } else {
      appliquerInit();
    }
  });
})();
