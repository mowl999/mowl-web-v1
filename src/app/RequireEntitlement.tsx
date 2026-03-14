import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";

type Entitlement = "THRIFT" | "INVEST" | "LOANS" | "FUND_TRANSFERS" | "ADMIN";

export function RequireEntitlement({ entitlement }: { entitlement: Entitlement }) {
  const { user, loading } = useAuth();
  if (loading) return null;

  const ok = !!user?.entitlements?.includes(entitlement);
  if (!ok) return <Navigate to="/app" replace />;

  return <Outlet />;
}
