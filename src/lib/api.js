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

export async function logoutStudentSession() {
  try { await api('/student-logout', { method: 'POST' }); } catch {}
  clearToken();
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

const GET_CACHE = new Map();
const GET_INFLIGHT = new Map();
const GET_CACHE_TTL = 30000;

export function clearApiCache() {
  GET_CACHE.clear();
}

export async function api(path, { method = 'GET', body } = {}) {
  const normalizedMethod = method.toUpperCase();
  const token = getToken();
  const cacheKey = `${normalizedMethod}:${path}:${token || 'public'}`;

  if (normalizedMethod === 'GET') {
    const cached = GET_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (GET_INFLIGHT.has(cacheKey)) return GET_INFLIGHT.get(cacheKey);
  } else {
    GET_CACHE.clear();
  }

  const request = (async () => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
      method: normalizedMethod,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    if (normalizedMethod === 'GET') GET_CACHE.set(cacheKey, { data, expiresAt: Date.now() + GET_CACHE_TTL });
    return data;
  })();

  if (normalizedMethod === 'GET') {
    GET_INFLIGHT.set(cacheKey, request);
    try { return await request; }
    finally { GET_INFLIGHT.delete(cacheKey); }
  }
  return request;
}

// Upload a file directly to Supabase Storage using a signed token from our function.
export async function uploadQuestionResource({ test_id, question_id, file }) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Question resource must be 20 MB or smaller.');
  const { supabase } = await import('./supabaseClient.js');
  const ext = file.name.split('.').pop();
  const { path, token } = await api('/question-resource-upload-url', { method: 'POST', body: { test_id, question_id, file_ext: ext } });
  const { error } = await supabase.storage.from('question-resources').uploadToSignedUrl(path, token, file);
  if (error) throw error;
  return path;
}

export async function uploadAnswerFile({ test_id, question_id, file }) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Answer file must be 20 MB or smaller.');
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
// then persists the resulting path onto the student's row. Called by a
// teacher/admin from Manage Students.
export async function uploadStudentPhoto({ student_id, file }) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile photo must be 5 MB or smaller.');
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

// Self-service uploads — a person setting their OWN avatar, from their own
// Profile page (as opposed to a teacher/admin setting a student's photo
// for them, above).
async function uploadOwnPhoto({ uploadUrlPath, setPath, file, extraBody = {} }) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile photo must be 5 MB or smaller.');
  const { supabase } = await import('./supabaseClient.js');
  const ext = file.name.split('.').pop();
  const { path, token } = await api(uploadUrlPath, { method: 'POST', body: { ...extraBody, file_ext: ext } });

  const { error } = await supabase.storage
    .from('student-photos') // shared public avatar bucket for all roles
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;

  await api(setPath, { method: 'POST', body: { ...extraBody, photo_path: path } });
  return path;
}

export function uploadOwnStudentPhoto({ file }) {
  return uploadOwnPhoto({ uploadUrlPath: '/student-photo-self-upload-url', setPath: '/student-photo-self-set', file });
}
export function uploadOwnTeacherPhoto({ file }) {
  return uploadOwnPhoto({ uploadUrlPath: '/teacher-photo-upload-url', setPath: '/teacher-photo-set', file });
}
export function uploadOwnAdminPhoto({ file }) {
  return uploadOwnPhoto({ uploadUrlPath: '/admin-photo-upload-url', setPath: '/admin-photo-set', file });
}

// Builds a public URL for a student/teacher/admin photo path. The
// 'student-photos' bucket is public read, so this needs no signed token —
// safe to call from anywhere, including the unauthenticated landing page.
export function getAssetUrl(asset_path) {
  if (!asset_path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/storage/v1/object/public/site-assets/${asset_path}`;
}

export function getPhotoUrl(photo_path) {
  if (!photo_path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/storage/v1/object/public/student-photos/${photo_path}`;
}
