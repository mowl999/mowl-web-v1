import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";

export function RequireAuth() {
  const { loading, isAuthenticated } = useAuth();
  const loc = useLocation();

  if (loading) return null; // or a spinner component
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  return <Outlet />;
}