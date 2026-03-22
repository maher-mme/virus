// ============================
// API ANTI-TRICHE (client)
// ============================
var API_URL = 'https://maher-mme.github.io'; // A remplacer par l'URL du serveur Python
var sessionToken = localStorage.getItem('virus_api_token') || '';
var apiDisponible = false;

// Verifier si l'API est en ligne au demarrage
function verifierApi() {
  fetch(API_URL + '/', { method: 'GET' }).then(function(r) {
    if (r.ok) {
      apiDisponible = true;
      console.log('API anti-triche connectee');
    }
  }).catch(function() {
    apiDisponible = false;
    console.log('API anti-triche non disponible, mode local');
  });
}

// Appel generique a l'API
function apiCall(endpoint, body) {
  if (!apiDisponible) {
    return Promise.reject('API non disponible');
  }
  return fetch(API_URL + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionToken
    },
    body: JSON.stringify(body)
  }).then(function(response) {
    if (response.status === 401) {
      // Token expire, on essaie de se reconnecter
      sessionToken = '';
      localStorage.removeItem('virus_api_token');
      return Promise.reject('Token expire');
    }
    return response.json().then(function(data) {
      if (!response.ok) {
        return Promise.reject(data.error || 'Erreur API');
      }
      return data;
    });
  });
}

// Connexion a l'API (appele apres la connexion au compte)
function apiLogin(playerId, pin) {
  if (!apiDisponible) return Promise.resolve(null);
  return fetch(API_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: playerId, pin: pin })
  }).then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.token) {
        sessionToken = data.token;
        localStorage.setItem('virus_api_token', data.token);
      }
      return data;
    }).catch(function() { return null; });
}

// === Endpoints specifiques ===

function apiGoldReward(partyId) {
  return apiCall('/api/gold/win-reward', { partyId: partyId });
}

function apiSpendGold(itemId, itemType, prix) {
  return apiCall('/api/gold/spend', { itemId: itemId, itemType: itemType, prix: prix });
}

function apiEndGameXP(partyId, won) {
  return apiCall('/api/xp/end-game', { partyId: partyId, won: won });
}

function apiKillXP(partyId) {
  return apiCall('/api/xp/kill', { partyId: partyId });
}

function apiEndGameStats(partyId, won, died, kills) {
  return apiCall('/api/stats/end-game', {
    partyId: partyId, won: won, died: died, kills: kills
  });
}

// Verifier l'API au chargement
verifierApi();
