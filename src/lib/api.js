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

// Uploads a student's profile photo to the PUBLIC 'student-photos' bucket
// (used by the landing-page Hall of Fame leaderboard and student rosters),
// then persists the resulting path onto the student's row.
export async function uploadStudentPhoto({ student_id, file }) {
  const { supabase } = await import('./supabaseClient.js');
  const ext = file.name.split('.').pop();
  const { path, token } = await api('/student-photo-upload-url', {
    method: 'POST',
    body: { student_id, file_ext: ext },
  });

  const { error } = await supabase.storage
    .from('student-photos')
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;

  await api('/student-photo-set', { method: 'POST', body: { student_id, photo_path: path } });
  return path;
}

// Builds a public URL for a student photo path. The 'student-photos'
// bucket is public read, so this needs no signed token — safe to call
// from anywhere, including the unauthenticated landing page.
export function getPhotoUrl(photo_path) {
  if (!photo_path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/storage/v1/object/public/student-photos/${photo_path}`;
}
