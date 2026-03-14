import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";

export function RequireRole({ role }: { role: "USER" | "ADMIN" }) {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user || user.role !== role) {
    // send non-matching role somewhere safe
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}