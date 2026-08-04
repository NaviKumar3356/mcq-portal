import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';

export default function TeacherLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/login-teacher', {
        method: 'POST',
        body: { username, password },
      });
      setToken(data.token);
      nav('/teacher');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="admit-card" onSubmit={onSubmit}>
        <div className="eyebrow">Teacher Login</div>
        <h2>Set papers &amp; grade</h2>

        <label htmlFor="u">Username</label>
        <input id="u" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />

        <label htmlFor="p">Password</label>
        <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <div className="error-box">{error}</div>}

        <div style={{ marginTop: 18 }}>
          <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Checking…' : 'Log in'}
          </button>
        </div>

        <p style={{ marginTop: 18, fontSize: '0.8rem', color: 'var(--muted)' }}>
          Student? <Link to="/">Go to student login</Link>
        </p>
      </form>
    </div>
  );
}
