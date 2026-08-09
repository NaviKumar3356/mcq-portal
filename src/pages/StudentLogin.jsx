import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME, CLASSES } from '../lib/constants.js';

export default function StudentLogin() {
  const [klass, setKlass] = useState('');
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
        body: { roll_number: roll, class: klass, dob },
      });
      setToken(data.token);
      nav('/student/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="admit-card" onSubmit={onSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <SchoolLogo size={48} />
        </div>
        <div className="eyebrow" style={{ textAlign: 'center' }}>{SCHOOL_NAME}</div>
        <h2 style={{ textAlign: 'center' }}>Student Login</h2>

        <label htmlFor="klass">Class</label>
        <select id="klass" value={klass} onChange={(e) => setKlass(e.target.value)} required>
          <option value="" disabled>Select your class</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

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

        <p style={{ marginTop: 18, fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center' }}>
          <Link to="/">&larr; Back to role selection</Link>
        </p>
      </form>
    </div>
  );
}
