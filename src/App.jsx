import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getToken, clearToken, getAuthInfo } from './lib/api.js';

import Landing from './pages/Landing.jsx';
import StudentLogin from './pages/StudentLogin.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import TakeTest from './pages/TakeTest.jsx';
import StudentResult from './pages/StudentResult.jsx';

import TeacherLogin from './pages/TeacherLogin.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import CreateTest from './pages/CreateTest.jsx';
import EditTest from './pages/EditTest.jsx';
import AnswerKey from './pages/AnswerKey.jsx';
import GradeSubmissions from './pages/GradeSubmissions.jsx';
import GradeOne from './pages/GradeOne.jsx';
import ManageStudents from './pages/ManageStudents.jsx';

import AdminLogin from './pages/AdminLogin.jsx';
import AdminOverview from './pages/AdminOverview.jsx';
import ManageTeachers from './pages/ManageTeachers.jsx';

function Protected({ roles, children }) {
  const token = getToken();
  const auth = getAuthInfo();
  if (!token || !auth || !roles.includes(auth.role)) {
    const loginFor = roles.includes('student') ? '/student/login' : roles.includes('teacher') ? '/teacher/login' : '/admin/login';
    return <Navigate to={loginFor} replace />;
  }
  return children;
}

function StudentTopbar() {
  const nav = useNavigate();
  const loc = useLocation();
  if (!loc.pathname.startsWith('/student/') || loc.pathname === '/student/login') return null;

  return (
    <div className="topbar">
      <span className="brand">📝 Test Portal</span>
      <span>
        <span className="who">Student panel &nbsp;</span>
        <button className="link" onClick={() => { clearToken(); nav('/student/login'); }}>Log out</button>
      </span>
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <StudentTopbar />
      <Routes>
        {/* Landing / role selection */}
        <Route path="/" element={<Landing />} />

        {/* Student */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<Protected roles={['student']}><StudentDashboard /></Protected>} />
        <Route path="/student/test/:testId" element={<Protected roles={['student']}><TakeTest /></Protected>} />
        <Route path="/student/result/:testId" element={<Protected roles={['student']}><StudentResult /></Protected>} />

        {/* Teacher */}
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/teacher" element={<Protected roles={['teacher']}><TeacherDashboard /></Protected>} />
        <Route path="/teacher/create" element={<Protected roles={['teacher']}><CreateTest /></Protected>} />
        <Route path="/teacher/students" element={<Protected roles={['teacher']}><ManageStudents /></Protected>} />
        <Route path="/teacher/test/:testId/edit" element={<Protected roles={['teacher']}><EditTest /></Protected>} />
        <Route path="/teacher/test/:testId/answer-key" element={<Protected roles={['teacher']}><AnswerKey /></Protected>} />
        <Route path="/teacher/test/:testId/submissions" element={<Protected roles={['teacher']}><GradeSubmissions /></Protected>} />
        <Route path="/teacher/submission/:submissionId" element={<Protected roles={['teacher']}><GradeOne /></Protected>} />

        {/* Super Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Protected roles={['super_admin']}><AdminOverview /></Protected>} />
        <Route path="/admin/teachers" element={<Protected roles={['super_admin']}><ManageTeachers /></Protected>} />
        <Route path="/admin/students" element={<Protected roles={['super_admin']}><ManageStudents /></Protected>} />
        <Route path="/admin/papers" element={<Protected roles={['super_admin']}><TeacherDashboard /></Protected>} />
        <Route path="/admin/papers/create" element={<Protected roles={['super_admin']}><CreateTest /></Protected>} />
        <Route path="/admin/test/:testId/edit" element={<Protected roles={['super_admin']}><EditTest /></Protected>} />
        <Route path="/admin/test/:testId/answer-key" element={<Protected roles={['super_admin']}><AnswerKey /></Protected>} />
        <Route path="/admin/test/:testId/submissions" element={<Protected roles={['super_admin']}><GradeSubmissions /></Protected>} />
        <Route path="/admin/submission/:submissionId" element={<Protected roles={['super_admin']}><GradeOne /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
