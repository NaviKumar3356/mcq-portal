import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getToken, clearToken } from './lib/api.js';

import StudentLogin from './pages/StudentLogin.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import TakeTest from './pages/TakeTest.jsx';
import StudentResult from './pages/StudentResult.jsx';
import TeacherLogin from './pages/TeacherLogin.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import CreateTest from './pages/CreateTest.jsx';
import GradeSubmissions from './pages/GradeSubmissions.jsx';
import GradeOne from './pages/GradeOne.jsx';

function decodeRole(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
}

function Protected({ role, children }) {
  const token = getToken();
  const actualRole = decodeRole(token);
  if (!token || actualRole !== role) {
    return <Navigate to={role === 'admin' ? '/teacher/login' : '/'} replace />;
  }
  return children;
}

function Topbar() {
  const nav = useNavigate();
  const loc = useLocation();
  const token = getToken();
  const role = decodeRole(token);
  if (loc.pathname === '/' || loc.pathname === '/teacher/login') return null;

  return (
    <div className="topbar">
      <span className="brand">📝 Test Portal</span>
      <span>
        <span className="who">{role === 'admin' ? 'Teacher panel' : 'Student panel'} &nbsp;</span>
        <button
          className="link"
          onClick={() => {
            clearToken();
            nav(role === 'admin' ? '/teacher/login' : '/');
          }}
        >
          Log out
        </button>
      </span>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Topbar />
      <Routes>
        <Route path="/" element={<StudentLogin />} />
        <Route
          path="/dashboard"
          element={
            <Protected role="student">
              <StudentDashboard />
            </Protected>
          }
        />
        <Route
          path="/test/:testId"
          element={
            <Protected role="student">
              <TakeTest />
            </Protected>
          }
        />
        <Route
          path="/result/:testId"
          element={
            <Protected role="student">
              <StudentResult />
            </Protected>
          }
        />

        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route
          path="/teacher"
          element={
            <Protected role="admin">
              <TeacherDashboard />
            </Protected>
          }
        />
        <Route
          path="/teacher/create"
          element={
            <Protected role="admin">
              <CreateTest />
            </Protected>
          }
        />
        <Route
          path="/teacher/test/:testId/submissions"
          element={
            <Protected role="admin">
              <GradeSubmissions />
            </Protected>
          }
        />
        <Route
          path="/teacher/submission/:submissionId"
          element={
            <Protected role="admin">
              <GradeOne />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
