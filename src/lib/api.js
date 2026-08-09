const TOKEN_KEY = 'test_portal_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Decodes the (unsigned, client-side-readable) payload of the current JWT —
// role, name, class(es)/subject(s) — so the UI can render instantly on
// refresh without an extra round trip. The server independently verifies
// the signature on every request, so this is display-only, never trusted
// for access control.
export function getAuthInfo() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Upload a file directly to Supabase Storage using a signed token from our function.
export async function uploadAnswerFile({ test_id, question_id, file }) {
  const { supabase } = await import('./supabaseClient.js');
  const ext = file.name.split('.').pop();
  const { path, token } = await api('/upload-url', {
    method: 'POST',
    body: { test_id, question_id, file_ext: ext },
  });

  const { error } = await supabase.storage
    .from('answer-sheets')
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;

  return path;
}
