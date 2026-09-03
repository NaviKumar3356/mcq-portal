const crypto = require('crypto');
const supabase = require('./db');

// A student account may have only one active browser/device session.
// The lock expires after inactivity so a forgotten browser cannot lock an
// account forever. The frontend sends a heartbeat while the student is active.
const IDLE_MINUTES = 15;

function newSessionId() {
  return crypto.randomUUID();
}

async function acquireStudentSession(studentId) {
  const cutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000).toISOString();
  const sessionId = newSessionId();

  // Prefer the database-side atomic operation. This closes the race window
  // where two serverless login requests arrive at almost exactly the same time.
  const { data: acquired, error: rpcError } = await supabase.rpc('acquire_student_session', {
    p_student_id: studentId,
    p_session_id: sessionId,
    p_cutoff: cutoff,
  });
  if (!rpcError) return { ok: acquired === true, sessionId: acquired === true ? sessionId : null, reason: acquired === true ? null : 'active' };

  // Backward-compatible fallback for databases that have V15 but not V16 yet.
  const { data: existing, error: lookupError } = await supabase
    .from('student_active_sessions')
    .select('id, session_id, last_seen_at')
    .eq('student_id', studentId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing && existing.last_seen_at > cutoff) return { ok: false, reason: 'active' };

  if (existing) {
    const { error: deleteError } = await supabase.from('student_active_sessions').delete().eq('id', existing.id);
    if (deleteError) throw deleteError;
  }

  const { error: insertError } = await supabase
    .from('student_active_sessions')
    .insert({ student_id: studentId, session_id: sessionId, last_seen_at: new Date().toISOString() });
  if (insertError) {
    if (insertError.code === '23505') return { ok: false, reason: 'active' };
    throw insertError;
  }
  return { ok: true, sessionId };
}

async function touchStudentSession(studentId, sessionId) {
  if (!studentId || !sessionId) return false;
  const cutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('student_active_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('session_id', sessionId)
    .gt('last_seen_at', cutoff)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function releaseStudentSession(studentId, sessionId) {
  if (!studentId || !sessionId) return;
  const { error } = await supabase
    .from('student_active_sessions')
    .delete()
    .eq('student_id', studentId)
    .eq('session_id', sessionId);
  if (error) throw error;
}

module.exports = { acquireStudentSession, touchStudentSession, releaseStudentSession, IDLE_MINUTES };

async function requireStudentSession(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const jwt = require('jsonwebtoken');
  try {
    const auth = jwt.verify(token, process.env.JWT_SECRET);
    if (auth.role !== 'student' || !auth.student_id || !auth.session_id) return null;
    const active = await touchStudentSession(auth.student_id, auth.session_id);
    return active ? auth : null;
  } catch {
    return null;
  }
}

module.exports = { acquireStudentSession, touchStudentSession, releaseStudentSession, requireStudentSession, IDLE_MINUTES };
