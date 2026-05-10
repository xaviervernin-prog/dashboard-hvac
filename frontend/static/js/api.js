const API_BASE = '/api/v1';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Erreur API');
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  clients: {
    list: (params = {}) => apiFetch('/clients?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/clients/${id}`),
    create: (data) => apiFetch('/clients', { method: 'POST', body: data }),
    update: (id, data) => apiFetch(`/clients/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiFetch(`/clients/${id}`, { method: 'DELETE' }),
  },
  articles: {
    list: (params = {}) => apiFetch('/articles?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/articles/${id}`),
    create: (data) => apiFetch('/articles', { method: 'POST', body: data }),
    update: (id, data) => apiFetch(`/articles/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiFetch(`/articles/${id}`, { method: 'DELETE' }),
    categories: {
      list: () => apiFetch('/articles/categories'),
      create: (data) => apiFetch('/articles/categories', { method: 'POST', body: data }),
      delete: (id) => apiFetch(`/articles/categories/${id}`, { method: 'DELETE' }),
    },
  },
  devis: {
    list: (params = {}) => apiFetch('/devis?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/devis/${id}`),
    create: (data) => apiFetch('/devis', { method: 'POST', body: data }),
    update: (id, data) => apiFetch(`/devis/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiFetch(`/devis/${id}`, { method: 'DELETE' }),
  },
  facturation: {
    list: (params = {}) => apiFetch('/facturation?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/facturation/${id}`),
    create: (data) => apiFetch('/facturation', { method: 'POST', body: data }),
    update: (id, data) => apiFetch(`/facturation/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiFetch(`/facturation/${id}`, { method: 'DELETE' }),
    stats: () => apiFetch('/facturation/stats'),
  },
  agenda: {
    list: (params = {}) => apiFetch('/agenda?' + new URLSearchParams(params)),
    get: (id) => apiFetch(`/agenda/${id}`),
    create: (data) => apiFetch('/agenda', { method: 'POST', body: data }),
    update: (id, data) => apiFetch(`/agenda/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiFetch(`/agenda/${id}`, { method: 'DELETE' }),
  },
};
