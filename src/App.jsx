import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getToken, clearToken, getAuthInfo } from './lib/api.js';
import SchoolLogo from './components/SchoolLogo.jsx';
import { SCHOOL_SHORT } from './lib/constants.js';

// Every page is loaded lazily, on its own JS chunk, rather than bundled
// together up front — see comments in previous versions of this file for
// why (student bundle never includes teacher/admin code). This is defense
// in depth; the real security boundary is server-side (requireRole in
// netlify/functions/utils/auth.js).
const Landing = lazy(() => import('./pages/Landing.jsx'));

const StudentLogin = lazy(() => import('./pages/StudentLogin.jsx'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard.jsx'));
const TakeTest = lazy(() => import('./pages/TakeTest.jsx'));
const StudentResult = lazy(() => import('./pages/StudentResult.jsx'));

const TeacherLogin = lazy(() => import('./pages/TeacherLogin.jsx'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard.jsx'));
const CreateTest = lazy(() => import('./pages/CreateTest.jsx'));
const EditTest = lazy(() => import('./pages/EditTest.jsx'));
const AnswerKey = lazy(() => import('./pages/AnswerKey.jsx'));
const GradeSubmissions = lazy(() => import('./pages/GradeSubmissions.jsx'));
const GradeOne = lazy(() => import('./pages/GradeOne.jsx'));
const ManageStudents = lazy(() => import('./pages/ManageStudents.jsx'));

const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'));
const AdminOverview = lazy(() => import('./pages/AdminOverview.jsx'));
const ManageTeachers = lazy(() => import('./pages/ManageTeachers.jsx'));

const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

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
      <span className="brand">
        <SchoolLogo size={38} /> {SCHOOL_SHORT} Test Portal
      </span>
      <span>
        <span className="who">Student panel &nbsp;</span>
        <button className="link" onClick={() => { clearToken(); nav('/student/login'); }}>Log out</button>
      </span>
    </div>
  );
}

function PageLoading() {
  return <div className="center-note" style={{ padding: '60px 0' }}>Loading…</div>;
}

export default function App() {
  return (
    <div className="app-shell">
      <StudentTopbar />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Landing / role selection */}
          <Route path="/" element={<Landing />} />

          {/* Student */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/dashboard" element={<Protected roles={['student']}><StudentDashboard /></Protected>} />
          <Route path="/student/test/:testId" element={<Protected roles={['student']}><TakeTest /></Protected>} />
          <Route path="/student/result/:testId" element={<Protected roles={['student']}><StudentResult /></Protected>} />
          <Route path="/student/leaderboard" element={<Protected roles={['student']}><Leaderboard /></Protected>} />
          <Route path="/student/profile" element={<Protected roles={['student']}><Profile /></Protected>} />

          {/* Teacher */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher" element={<Protected roles={['teacher']}><TeacherDashboard /></Protected>} />
          <Route path="/teacher/create" element={<Protected roles={['teacher']}><CreateTest /></Protected>} />
          <Route path="/teacher/students" element={<Protected roles={['teacher']}><ManageStudents /></Protected>} />
          <Route path="/teacher/leaderboard" element={<Protected roles={['teacher']}><Leaderboard /></Protected>} />
          <Route path="/teacher/profile" element={<Protected roles={['teacher']}><Profile /></Protected>} />
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
          <Route path="/admin/leaderboard" element={<Protected roles={['super_admin']}><Leaderboard /></Protected>} />
          <Route path="/admin/profile" element={<Protected roles={['super_admin']}><Profile /></Protected>} />
          <Route path="/admin/test/:testId/edit" element={<Protected roles={['super_admin']}><EditTest /></Protected>} />
          <Route path="/admin/test/:testId/answer-key" element={<Protected roles={['super_admin']}><AnswerKey /></Protected>} />
          <Route path="/admin/test/:testId/submissions" element={<Protected roles={['super_admin']}><GradeSubmissions /></Protected>} />
          <Route path="/admin/submission/:submissionId" element={<Protected roles={['super_admin']}><GradeOne /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
