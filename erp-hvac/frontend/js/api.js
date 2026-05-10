'use strict';

const api = (() => {
  const BASE = window.API_BASE || '/api';

  function getToken() {
    return localStorage.getItem('erp_token') || '';
  }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      // Try refresh
      const refreshed = await tryRefresh();
      if (refreshed) return request(method, path, body);
      logout();
      return;
    }

    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({ error: res.statusText }));
    if (!res.ok) {
      const msg = data?.details ? data.details.join(', ') : (data?.error || `Erreur ${res.status}`);
      throw Object.assign(new Error(msg), { status: res.status, data });
    }
    return data;
  }

  async function tryRefresh() {
    const rt = localStorage.getItem('erp_refresh_token');
    if (!rt) return false;
    try {
      const res = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('erp_token',        data.access_token);
      localStorage.setItem('erp_refresh_token', data.refresh_token);
      localStorage.setItem('erp_expires_at',    data.expires_at);
      return true;
    } catch {
      return false;
    }
  }

  function logout() {
    ['erp_token', 'erp_refresh_token', 'erp_expires_at', 'erp_user'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
  }

  return {
    get:    (path)         => request('GET',    path),
    post:   (path, body)   => request('POST',   path, body),
    put:    (path, body)   => request('PUT',    path, body),
    patch:  (path, body)   => request('PATCH',  path, body),
    delete: (path)         => request('DELETE', path),
    logout,
  };
})();
