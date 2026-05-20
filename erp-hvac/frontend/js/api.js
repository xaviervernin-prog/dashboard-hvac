const API_BASE = '/api/v1';

function getToken() {
  return localStorage.getItem('erp_token');
}

async function apiFetch(method, path, body = null, isBlob = false) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    window.location.href = '/index.html';
    return;
  }

  if (isBlob) {
    if (!res.ok) throw new Error('Erreur lors du téléchargement');
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur serveur'), { status: res.status });
  return data;
}

const api = {
  get: (path) => apiFetch('GET', path),
  post: (path, body) => apiFetch('POST', path, body),
  put: (path, body) => apiFetch('PUT', path, body),
  del: (path) => apiFetch('DELETE', path),
  blob: (path) => apiFetch('GET', path, null, true)
};
