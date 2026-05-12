// ============================
// SYSTEME DE REPORTS (BUG / SIGNALEMENT)
// ============================
// Remplace l'ancien systeme de commentaires.
// Les joueurs envoient des rapports → stockes dans Firestore "reports"
// Les admins dev les voient dans Settings → onglet DEV → boite a lettres
// Apres avoir ete marques "VU", les rapports s'auto-suppriment 1h plus tard.

var _reportTypeChoisi = 'bug'; // 'bug' | 'signalement'
var _reportsListenerUnsub = null;
var _reportsCleanupInterval = null;
var REPORT_DUREE_APRES_VU_MS = 3600000; // 1 heure

// === UI SIDE USER ===
function reportSetType(type) {
  _reportTypeChoisi = type;
  var btnBug = document.getElementById('report-type-bug');
  var btnSig = document.getElementById('report-type-sig');
  var inputCible = document.getElementById('report-cible-row');
  if (type === 'signalement') {
    if (btnSig) { btnSig.classList.add('active'); btnSig.style.background = '#e74c3c'; }
    if (btnBug) { btnBug.classList.remove('active'); btnBug.style.background = 'rgba(243,156,18,0.2)'; }
    if (inputCible) inputCible.style.display = '';
  } else {
    if (btnBug) { btnBug.classList.add('active'); btnBug.style.background = '#f39c12'; }
    if (btnSig) { btnSig.classList.remove('active'); btnSig.style.background = 'rgba(231,76,60,0.2)'; }
    if (inputCible) inputCible.style.display = 'none';
  }
}

function envoyerReport() {
  var msg = (document.getElementById('report-message') || {}).value;
  msg = msg ? msg.trim() : '';
  if (!msg) {
    if (typeof showNotif === 'function') showNotif(t('reportEmptyMsg'), 'warn');
    return;
  }
  if (msg.length > 500) {
    if (typeof showNotif === 'function') showNotif(t('reportTooLong'), 'warn');
    return;
  }
  var type = _reportTypeChoisi;
  var cible = '';
  if (type === 'signalement') {
    var inp = document.getElementById('report-cible');
    cible = inp && inp.value ? inp.value.trim() : '';
    if (!cible) {
      if (typeof showNotif === 'function') showNotif(t('reportNeedTarget'), 'warn');
      return;
    }
  }
  var pseudo = (typeof getPseudo === 'function') ? getPseudo() : '';
  if (typeof db === 'undefined') {
    if (typeof showNotif === 'function') showNotif(t('connectionError'), 'error');
    return;
  }
  db.collection('reports').add({
    type: type,
    pseudo: pseudo || 'anonyme',
    playerId: typeof monPlayerId !== 'undefined' ? monPlayerId : '',
    message: msg,
    reportedPseudo: cible,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    checkedAt: null
  }).then(function() {
    if (typeof showNotif === 'function') showNotif(t('reportSent'), 'success');
    if (document.getElementById('report-message')) document.getElementById('report-message').value = '';
    if (document.getElementById('report-cible')) document.getElementById('report-cible').value = '';
  }).catch(function() {
    if (typeof showNotif === 'function') showNotif(t('reportError'), 'error');
  });
}

// === UI SIDE ADMIN ===
function chargerReportsAdmin() {
  if (typeof db === 'undefined') return;
  var liste = document.getElementById('reports-admin-list');
  if (!liste) return;
  liste.innerHTML = '<div style="text-align:center;color:#95a5a6;padding:20px;">' + t('reportsLoading') + '</div>';
  // Cleanup avant affichage
  cleanupOldReports();
  // Listener temps reel
  if (_reportsListenerUnsub) { try { _reportsListenerUnsub(); } catch(e) {} }
  _reportsListenerUnsub = db.collection('reports').orderBy('createdAt', 'desc').onSnapshot(function(snap) {
    liste.innerHTML = '';
    if (snap.empty) {
      liste.innerHTML = '<div style="text-align:center;color:#95a5a6;padding:20px;">' + t('reportsEmpty') + '</div>';
      return;
    }
    snap.forEach(function(doc) {
      var data = doc.data();
      var div = creerReportDOM(doc.id, data);
      if (div) liste.appendChild(div);
    });
  }, function() {});
}

function creerReportDOM(id, data) {
  var div = document.createElement('div');
  var couleur = data.type === 'bug' ? '#f39c12' : '#e74c3c';
  var emoji = data.type === 'bug' ? '🐛' : '🚩'; // bug / drapeau
  var typeLabel = data.type === 'bug' ? t('reportBug') : t('reportSig');
  var dateStr = data.createdAt && data.createdAt.toDate ?
    data.createdAt.toDate().toLocaleString() : '';
  var checked = !!data.checkedAt;
  var cibleHtml = '';
  if (data.type === 'signalement' && data.reportedPseudo) {
    cibleHtml = '<div style="font-size:11px;color:#bdc3c7;margin-top:4px;">' + t('reportTarget') + ' <strong style="color:#e74c3c;">' + escapeHtml(data.reportedPseudo) + '</strong></div>';
  }
  div.style.cssText = 'background:#1a252f;border:1px solid ' + couleur + ';border-left:4px solid ' + couleur + ';border-radius:8px;padding:12px;margin-bottom:8px;opacity:' + (checked ? '0.5' : '1') + ';';
  div.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:18px;">' + emoji + '</span>' +
        '<span style="font-weight:bold;color:' + couleur + ';font-size:12px;letter-spacing:1px;">' + typeLabel + '</span>' +
        '<span style="color:#ecf0f1;font-weight:bold;">' + escapeHtml(data.pseudo || 'anonyme') + '</span>' +
      '</div>' +
      '<span style="font-size:10px;color:#95a5a6;">' + dateStr + '</span>' +
    '</div>' +
    cibleHtml +
    '<div style="font-size:13px;color:#ecf0f1;margin:8px 0;white-space:pre-wrap;word-break:break-word;">' + escapeHtml(data.message || '') + '</div>' +
    '<div style="display:flex;gap:6px;justify-content:flex-end;">' +
      (checked ?
        '<span style="font-size:11px;color:#2ecc71;">✓ ' + t('reportSeen') + '</span>' :
        '<button onclick="marquerReportVu(\'' + id + '\')" style="background:#2ecc71;color:white;border:none;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:bold;cursor:pointer;">✓ ' + t('reportMarkSeen') + '</button>'
      ) +
      '<button onclick="supprimerReport(\'' + id + '\')" style="background:rgba(231,76,60,0.6);color:white;border:1px solid #e74c3c;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:bold;cursor:pointer;">✕ ' + t('delete') + '</button>' +
    '</div>';
  return div;
}

function marquerReportVu(reportId) {
  if (typeof db === 'undefined') return;
  db.collection('reports').doc(reportId).update({
    checkedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function() {});
}

function supprimerReport(reportId) {
  if (typeof db === 'undefined') return;
  db.collection('reports').doc(reportId).delete().catch(function() {});
}

// === AUTO-CLEANUP : supprimer les reports vus depuis > 1h ===
function cleanupOldReports() {
  if (typeof db === 'undefined') return;
  if (typeof peutOuvrirConsole !== 'function' || !peutOuvrirConsole()) return; // Seuls les admins dev nettoient
  var seuil = Date.now() - REPORT_DUREE_APRES_VU_MS;
  db.collection('reports').where('checkedAt', '!=', null).get().then(function(snap) {
    snap.forEach(function(doc) {
      var data = doc.data();
      if (data.checkedAt && data.checkedAt.toMillis && data.checkedAt.toMillis() < seuil) {
        doc.ref.delete().catch(function() {});
      }
    });
  }).catch(function() {});
}

// Cleanup periodique (toutes les 5 minutes pour les admins dev)
if (typeof setInterval === 'function') {
  setTimeout(function() {
    _reportsCleanupInterval = setInterval(cleanupOldReports, 300000);
    cleanupOldReports(); // une fois au boot
  }, 5000);
}

// Stop le listener quand on ferme l'onglet DEV
function stopReportsListener() {
  if (_reportsListenerUnsub) { try { _reportsListenerUnsub(); } catch(e) {} _reportsListenerUnsub = null; }
}
