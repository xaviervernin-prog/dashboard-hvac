function getCurrentUser() {
  try {
    const u = localStorage.getItem('erp_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function hasRole(...roles) {
  const u = getCurrentUser();
  return u && roles.includes(u.role);
}

function requireAuth() {
  if (!getCurrentUser() || !getToken()) {
    window.location.href = '/index.html';
  }
}

function logout() {
  api.post('/auth/logout').catch(() => {});
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_user');
  window.location.href = '/index.html';
}

function setSession(token, user) {
  localStorage.setItem('erp_token', token);
  localStorage.setItem('erp_user', JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem('erp_token');
}
