const API = {
  async _req(method, path, data) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch('/api' + path, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json();
  },
  get: (path) => API._req('GET', path),
  post: (path, data) => API._req('POST', path, data),
  put: (path, data) => API._req('PUT', path, data),
  patch: (path, data) => API._req('PATCH', path, data),
  del: (path) => API._req('DELETE', path),

  clients: {
    list: () => API.get('/clients/'),
    create: (d) => API.post('/clients/', d),
    update: (id, d) => API.put(`/clients/${id}`, d),
    delete: (id) => API.del(`/clients/${id}`),
  },
  articles: {
    list: () => API.get('/articles/'),
    create: (d) => API.post('/articles/', d),
    update: (id, d) => API.put(`/articles/${id}`, d),
    delete: (id) => API.del(`/articles/${id}`),
  },
  categories: {
    list: () => API.get('/categories/'),
    create: (d) => API.post('/categories/', d),
    delete: (id) => API.del(`/categories/${id}`),
  },
  devis: {
    list: () => API.get('/devis/'),
    create: (d) => API.post('/devis/', d),
    update: (id, d) => API.put(`/devis/${id}`, d),
    relance: (id) => API.patch(`/devis/${id}/relance`),
    delete: (id) => API.del(`/devis/${id}`),
  },
  interventions: {
    list: () => API.get('/interventions/'),
    create: (d) => API.post('/interventions/', d),
    update: (id, d) => API.put(`/interventions/${id}`, d),
    statut: (id, s) => API.patch(`/interventions/${id}/statut?statut=${s}`),
    delete: (id) => API.del(`/interventions/${id}`),
  },
  factures: {
    list: () => API.get('/factures/'),
    create: (d) => API.post('/factures/', d),
    update: (id, d) => API.put(`/factures/${id}`, d),
    relance: (id) => API.patch(`/factures/${id}/relance`),
    delete: (id) => API.del(`/factures/${id}`),
  },
  profil: {
    get: () => API.get('/profil/'),
    update: (d) => API.put('/profil/', d),
  },
};
