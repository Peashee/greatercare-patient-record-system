import { createBrowserRouter } from "react-router";
import AppLayout from "./components/layout/AppLayout";
import { PublicOnly, RequireAuth, RequirePermission } from "./components/RouteGuards";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AppointmentsPage from "./pages/appointments/AppointmentsPage";
import RecordsPage from "./pages/records/RecordsPage";
import RecordDetailPage from "./pages/records/RecordDetailPage";
import AssessmentFormPage from "./pages/records/AssessmentFormPage";
import PatientsPage from "./pages/patients/PatientsPage";
import PatientDetailPage from "./pages/patients/PatientDetailPage";
import UsersPage from "./pages/admin/UsersPage";
import InviteUserPage from "./pages/admin/InviteUserPage";
import UserDetailPage from "./pages/admin/UserDetailPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import AccessControlPage from "./pages/AccessControlPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

/**
 * Route map. Each protected branch is wrapped in a guard:
 *   RequireAuth        — must be signed in with an assigned role
 *   RequirePermission  — must hold the named permission (src/lib/rbac.js)
 */
export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage />, handle: { crumb: "Overview" } },
          { path: "appointments", element: <AppointmentsPage />, handle: { crumb: "Appointments" } },
          {
            path: "records",
            handle: { crumb: "Medical records" },
            children: [
              { index: true, element: <RecordsPage /> },
              {
                element: <RequirePermission permission="records:write" />,
                children: [
                  { path: "new", element: <AssessmentFormPage />, handle: { crumb: "New assessment" } },
                  { path: ":recordId/edit", element: <AssessmentFormPage />, handle: { crumb: "Amend record" } },
                ],
              },
              { path: ":recordId", element: <RecordDetailPage />, handle: { crumb: "Record" } },
            ],
          },
          {
            path: "patients",
            element: <RequirePermission permission="patients:directory" />,
            handle: { crumb: "Patients" },
            children: [
              { index: true, element: <PatientsPage /> },
              { path: ":email", element: <PatientDetailPage />, handle: { crumb: "Patient chart" } },
            ],
          },
          {
            path: "admin/users",
            element: <RequirePermission permission="users:manage" />,
            handle: { crumb: "People & roles" },
            children: [
              { index: true, element: <UsersPage /> },
              { path: "new", element: <InviteUserPage />, handle: { crumb: "Invite user" } },
              { path: ":email", element: <UserDetailPage />, handle: { crumb: "User" } },
            ],
          },
          {
            path: "admin/audit",
            element: <RequirePermission permission="audit:read" />,
            handle: { crumb: "Audit trail" },
            children: [{ index: true, element: <AuditLogPage /> }],
          },
          { path: "access", element: <AccessControlPage />, handle: { crumb: "Access control" } },
          { path: "profile", element: <ProfilePage />, handle: { crumb: "My profile" } },
          { path: "*", element: <NotFoundPage />, handle: { crumb: "Not found" } },
        ],
      },
    ],
  },
]);
