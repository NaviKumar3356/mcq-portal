import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';

export default function StudentLogin() {
  const [roll, setRoll] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/login-student', {
        method: 'POST',
        body: { roll_number: roll, dob },
      });
      setToken(data.token);
      nav('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="admit-card" onSubmit={onSubmit}>
        <div className="eyebrow">Student Login</div>
        <h2>Enter the test portal</h2>

        <label htmlFor="roll">Roll number</label>
        <input
          id="roll"
          type="text"
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
          placeholder="e.g. 24"
          required
        />

        <label htmlFor="dob">Date of birth</label>
        <input
          id="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
        />

        {error && <div className="error-box">{error}</div>}

        <div style={{ marginTop: 18 }}>
          <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Checking…' : 'Log in'}
          </button>
        </div>

        <p style={{ marginTop: 18, fontSize: '0.8rem', color: 'var(--muted)' }}>
          Teacher? <Link to="/teacher/login">Go to teacher login</Link>
        </p>
      </form>
    </div>
  );
}
