import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME } from '../lib/constants.js';

export default function AdminLogin() {
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
      const data = await api('/login-superadmin', {
        method: 'POST',
        body: { username, password },
      });
      setToken(data.token);
      nav('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap admin-login-bg">
      <form className="admit-card" onSubmit={onSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <SchoolLogo size={68} />
        </div>
        <div className="eyebrow" style={{ textAlign: 'center' }}>{SCHOOL_NAME}</div>
        <h2 style={{ textAlign: 'center' }}>Super Admin Login</h2>

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

        <p style={{ marginTop: 18, fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center' }}>
          <Link to="/">&larr; Back to role selection</Link>
        </p>
      </form>
    </div>
  );
}