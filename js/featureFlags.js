// ============================
// SYSTEME DE FEATURE FLAGS
// ============================
// Permet d'activer des features pour les admins uniquement (mode 'dev')
// ou pour tout le monde (mode 'live'). Les admins peuvent flipper l'etat
// d'une feature directement depuis le jeu, sans redeploy.
//
// Stockage : collection Firestore "featureFlags" → docs avec { state: 'dev' | 'live' }
// Fallback : valeurs par defaut ci-dessous si Firestore inaccessible.

// Valeurs par defaut (utilisees quand Firestore n'a pas encore charge)
var FEATURE_FLAGS = {
  salonLobby: 'live', // Nouveau menu principal style salon — LIVE pour tous
  salonGroup: 'dev'   // Inviter des amis dans le salon (groupes)
  // Ajouter d'autres features ici quand on en aura
};

// Listener Firestore (synchronisation cross-device)
var _featureFlagsUnsub = null;
function initFeatureFlags() {
  if (typeof db === 'undefined') return;
  try {
    _featureFlagsUnsub = db.collection('featureFlags').onSnapshot(function(snap) {
      snap.forEach(function(doc) {
        var data = doc.data();
        // On ne synchronise que les flags connus (defaut). Les flags supprimes
        // restent dans Firestore mais sont ignores.
        if (data && data.state && FEATURE_FLAGS.hasOwnProperty(doc.id)) {
          FEATURE_FLAGS[doc.id] = data.state;
        }
      });
      // Re-evaluer l'UI quand les flags changent
      if (typeof refreshFeatureFlagUI === 'function') refreshFeatureFlagUI();
    }, function() { /* erreur silencieuse, on garde les defauts */ });
  } catch(e) {}
}

// === API PUBLIQUE ===
function isFeatureActive(flagId) {
  var state = FEATURE_FLAGS[flagId];
  if (state === 'live') return true;
  if (state === 'dev' && typeof peutOuvrirConsole === 'function' && peutOuvrirConsole()) return true;
  return false;
}

// Pour les admins dev (Obstinate) : changer l'etat d'un flag (sync sur Firestore)
function setFeatureFlag(flagId, state) {
  if (typeof peutOuvrirConsole !== 'function' || !peutOuvrirConsole()) {
    if (typeof showNotif === 'function') showNotif('Reserve aux admins dev', 'warn');
    return;
  }
  if (state !== 'dev' && state !== 'live') {
    console.error('State invalide :', state, '(dev ou live attendu)');
    return;
  }
  FEATURE_FLAGS[flagId] = state;
  if (typeof db !== 'undefined') {
    db.collection('featureFlags').doc(flagId).set({ state: state }).catch(function() {});
  }
  if (typeof showNotif === 'function') showNotif('Feature "' + flagId + '" → ' + state, 'success');
  if (typeof refreshFeatureFlagUI === 'function') refreshFeatureFlagUI();
}

// Hook qui rafraichit tous les elements de l'UI dependant des flags.
// Appele automatiquement au boot et a chaque changement de flag.
function refreshFeatureFlagUI() {
  // Rafraichir la liste dans le panneau admin si ouvert
  if (typeof majAdminFeaturesList === 'function') majAdminFeaturesList();
}

// === PANNEAU ADMIN : LISTE DES FEATURES + TOGGLES ===
function majAdminFeaturesList() {
  var container = document.getElementById('admin-features-list');
  if (!container) return;
  container.innerHTML = '';
  Object.keys(FEATURE_FLAGS).forEach(function(flagId) {
    var state = FEATURE_FLAGS[flagId];
    var isLive = state === 'live';
    var div = document.createElement('div');
    div.style.cssText = 'background:#1a252f;border:1px solid #34495e;border-radius:8px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;';
    var couleurEtat = isLive ? '#2ecc71' : '#f39c12';
    div.innerHTML =
      '<div style="flex:1;">' +
        '<div style="font-weight:bold;color:#ecf0f1;font-size:14px;letter-spacing:1px;">' + flagId.toUpperCase() + '</div>' +
        '<div style="font-size:11px;color:' + couleurEtat + ';margin-top:2px;font-weight:bold;">' + state.toUpperCase() + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button onclick="setFeatureFlag(\'' + flagId + '\',\'dev\')" style="background:' + (state === 'dev' ? '#f39c12' : 'rgba(243,156,18,0.2)') + ';color:white;border:1px solid #f39c12;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:bold;">DEV</button>' +
        '<button onclick="setFeatureFlag(\'' + flagId + '\',\'live\')" style="background:' + (state === 'live' ? '#2ecc71' : 'rgba(46,204,113,0.2)') + ';color:white;border:1px solid #2ecc71;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:bold;">LIVE</button>' +
      '</div>';
    container.appendChild(div);
  });
}

// === SWITCHER D'ONGLETS DANS POPUP-PARAMS ===
function switchParamsTab(tabName) {
  var tabs = ['compte', 'bug', 'credits', 'dev'];
  tabs.forEach(function(t) {
    var content = document.getElementById('params-tab-' + t);
    var btn = document.getElementById('params-tab-btn-' + t);
    if (content) content.style.display = (t === tabName) ? '' : 'none';
    if (btn) {
      if (t === tabName) {
        btn.classList.add('active');
        btn.style.color = '#ecf0f1';
        btn.style.borderBottomColor = '#f39c12';
      } else {
        btn.classList.remove('active');
        btn.style.color = '#95a5a6';
        btn.style.borderBottomColor = 'transparent';
      }
    }
  });
  // Si on ouvre l'onglet DEV, rafraichir la liste des features + reports
  if (tabName === 'dev') {
    majAdminFeaturesList();
    if (typeof chargerReportsAdmin === 'function') chargerReportsAdmin();
  } else {
    // Quitter l'onglet DEV : stopper le listener reports
    if (typeof stopReportsListener === 'function') stopReportsListener();
  }
  // Si on ouvre BUG : reset le type a 'bug' par defaut
  if (tabName === 'bug' && typeof reportSetType === 'function') reportSetType('bug');
}

// Afficher/cacher l'onglet DEV selon le statut admin dev
function majVisibiliteOngletDev() {
  var btnDev = document.getElementById('params-tab-btn-dev');
  if (!btnDev) return;
  var estDev = (typeof peutOuvrirConsole === 'function') && peutOuvrirConsole();
  btnDev.style.display = estDev ? '' : 'none';
  // Si on n'est pas dev mais qu'on est sur l'onglet dev, basculer sur compte
  if (!estDev) {
    var devContent = document.getElementById('params-tab-dev');
    if (devContent && devContent.style.display !== 'none') {
      switchParamsTab('compte');
    }
  }
}

// Init au boot
setTimeout(function() {
  initFeatureFlags();
  refreshFeatureFlagUI();
}, 1500);
