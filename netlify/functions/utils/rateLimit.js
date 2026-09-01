const supabase = require('./db');

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['X-Nf-Client-Connection-Ip'] ||
    headers['client-ip'] ||
    headers['Client-Ip'] ||
    String(headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

async function consumeLoginAttempt(key, options = {}) {
  const maxAttempts = options.maxAttempts ?? 8;
  const windowSeconds = options.windowSeconds ?? 15 * 60;
  const blockSeconds = options.blockSeconds ?? 15 * 60;

  const { data, error } = await supabase.rpc('consume_login_attempt', {
    p_key: key,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
    p_block_seconds: blockSeconds,
  });

  if (error) {
    const wrapped = new Error('Login rate limiting is not configured. Run the latest Supabase migration.');
    wrapped.code = error.code;
    wrapped.cause = error;
    throw wrapped;
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(result?.allowed),
    retryAfterSeconds: Number(result?.retry_after_seconds) || 0,
  };
}

async function resetLoginAttempts(key) {
  const { error } = await supabase.rpc('reset_login_attempt', { p_key: key });
  if (error) {
    const wrapped = new Error('Login rate limiting is not configured. Run the latest Supabase migration.');
    wrapped.code = error.code;
    wrapped.cause = error;
    throw wrapped;
  }
}

module.exports = { getClientIp, consumeLoginAttempt, resetLoginAttempts };
