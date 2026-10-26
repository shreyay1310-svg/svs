import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import RoleManagement from "./pages/RoleManagement";
import CollegeManagement from "./pages/CollegeManagement";
import CourseManagement from "./pages/CourseManagement";
import SubjectManagement from "./pages/SubjectManagement";
import StudentManagement from "./pages/StudentManagement";
import StudentForm from "./pages/StudentForm";
import Reports from "./pages/Reports";
import ActivityLogs from "./pages/ActivityLogs";
import UniversityManagement from "./pages/UniversityManagement";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";

import { usePermissions } from "@/hooks/usePermissions";

function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
            </div>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400">Loading UniERP...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Clear invalid token
    localStorage.removeItem("erp_token");
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role ?? "")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]} requiredPermission="users.view">
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute allowedRoles={["admin"]} requiredPermission="roles.view">
            <RoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colleges"
        element={
          <ProtectedRoute requiredPermission="colleges.view">
            <CollegeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute requiredPermission="courses.view">
            <CourseManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subjects"
        element={
          <ProtectedRoute requiredPermission="subjects.view">
            <SubjectManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute requiredPermission="students.view">
            <StudentManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-form/:id?"
        element={
          <ProtectedRoute requiredPermission="students.view">
            <StudentForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute requiredPermission="reports.view">
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/universities"
        element={
          <ProtectedRoute requiredPermission="universities.view">
            <UniversityManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-logs"
        element={
          <ProtectedRoute allowedRoles={["admin"]} requiredPermission="activity_logs.view">
            <ActivityLogs />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

