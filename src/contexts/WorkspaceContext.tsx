import React, { createContext, useContext, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";

export type WorkspaceId = "thrift" | "invest" | "loans" | "fund-transfers" | "admin";

export const WORKSPACE_LABEL: Record<WorkspaceId, string> = {
  thrift: "My Contributions",
  invest: "My Investment",
  loans: "My Loan",
  "fund-transfers": "My Fund Transfers",
  admin: "Admin Console",
};

function getWorkspaceFromPath(pathname: string): WorkspaceId | null {
  // expected: /app/<slug>/...
  const seg = pathname.split("/").filter(Boolean)[1]; // 0=app, 1=slug
  if (seg === "thrift" || seg === "invest" || seg === "loans" || seg === "fund-transfers" || seg === "admin")
    return seg;
  return null;
}

type WorkspaceContextValue = {
  workspaceId: WorkspaceId;
  label: string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const workspace = getWorkspaceFromPath(loc.pathname);
  const value = useMemo(
    () =>
      workspace
        ? { workspaceId: workspace, label: WORKSPACE_LABEL[workspace] }
        : null,
    [workspace]
  );

  if (!workspace) {
    return <Navigate to="/app" replace state={{ from: loc.pathname }} />;
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
