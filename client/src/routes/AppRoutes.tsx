import { Navigate, Route, Routes } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../hooks/auth-context";
import { AppLayout } from "../layouts/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { RecommendationsPage } from "../pages/RecommendationsPage";
import { VendorDetailPage } from "../pages/VendorDetailPage";
import { VendorFormPage } from "../pages/VendorFormPage";
import { VendorsPage } from "../pages/VendorsPage";
import { WorkRequirementDetailPage } from "../pages/WorkRequirementDetailPage";
import { WorkRequirementFormPage } from "../pages/WorkRequirementFormPage";
import { WorkRequirementsPage } from "../pages/WorkRequirementsPage";

function ProtectedRoute() {
  const { token, isLoading, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (isLoading || !user) return <LoadingState label="Checking session" />;
  return <AppLayout />;
}

function GuestRoute() {
  const { token, user, isLoading } = useAuth();
  if (token && isLoading) return <LoadingState label="Checking session" />;
  if (token && user) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/vendors/new" element={<VendorFormPage />} />
        <Route path="/vendors/:id" element={<VendorDetailPage />} />
        <Route path="/work-requirements" element={<WorkRequirementsPage />} />
        <Route path="/work-requirements/new" element={<WorkRequirementFormPage />} />
        <Route path="/work-requirements/:id" element={<WorkRequirementDetailPage />} />
        <Route path="/work-requirements/:id/recommendations" element={<RecommendationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
