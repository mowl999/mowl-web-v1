import { useMemo, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  LayoutDashboard,
  ShieldCheck,
  Target,
  WalletCards,
  Landmark,
  BarChart3,
  Briefcase,
  LineChart,
  ArrowLeftRight,
  HandCoins,
  Users,
  Repeat,
  Settings,
  Pause,
  Send,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useAuth } from "@/app/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function SidebarLink({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          // base
          "relative flex items-center gap-2 rounded-xl px-3 py-2 pl-5 text-sm transition-colors duration-200",

          // accent bar base (hidden by default)
          "before:absolute before:left-2 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:content-['']",

          // animation
          "before:transition-all before:duration-200 before:ease-out",

          isActive
            ? [
                "bg-indigo-50 text-indigo-700",
                "before:bg-indigo-600",
                "before:opacity-100",
                "before:translate-x-0",
              ].join(" ")
            : [
                "text-slate-500 hover:bg-indigo-50 hover:text-slate-900",
                "before:bg-indigo-600",
                "before:opacity-0",
                "before:-translate-x-1",
                "hover:before:opacity-50 hover:before:translate-x-0",
              ].join(" ")
        )
      }
      end
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </NavLink>
  );
}
function SidebarNav({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {/* contributions */}
      {workspaceId === "thrift" && (
        <>
          <SidebarLink icon={LayoutDashboard} onClick={onNavigate} to={`/app/${workspaceId}`}>
            Overview
          </SidebarLink>
          <SidebarLink icon={ShieldCheck} onClick={onNavigate} to={`/app/${workspaceId}/affordability-summary`}>
            Affordability Summary
          </SidebarLink>
          <SidebarLink icon={Target} onClick={onNavigate} to={`/app/${workspaceId}/goals`}>
            Goals
          </SidebarLink>
          <SidebarLink icon={WalletCards} onClick={onNavigate} to={`/app/${workspaceId}/contributions`}>
            Contributions
          </SidebarLink>
          <SidebarLink icon={Landmark} onClick={onNavigate} to={`/app/${workspaceId}/payouts`}>
            Payouts
          </SidebarLink>
          <SidebarLink icon={FileText} onClick={onNavigate} to={`/app/${workspaceId}/statements`}>
            Statements
          </SidebarLink>
          <SidebarLink icon={BarChart3} onClick={onNavigate} to={`/app/${workspaceId}/reports`}>
            Reports
          </SidebarLink>
        </>
      )}

      {/* investment */}
      {workspaceId === "invest" && (
        <>
          <SidebarLink icon={LayoutDashboard} onClick={onNavigate} to={`/app/${workspaceId}`}>
            Overview
          </SidebarLink>
          <SidebarLink icon={LineChart} onClick={onNavigate} to={`/app/${workspaceId}/long-term`}>
            Long-Term
          </SidebarLink>
          <SidebarLink icon={BarChart3} onClick={onNavigate} to={`/app/${workspaceId}/short-term`}>
            Short-Term
          </SidebarLink>
          <SidebarLink icon={Landmark} onClick={onNavigate} to={`/app/${workspaceId}/retirement`}>
            Retirement
          </SidebarLink>
          <SidebarLink icon={Briefcase} onClick={onNavigate} to={`/app/${workspaceId}/legacy`}>
            Will & Legacy
          </SidebarLink>
          <SidebarLink icon={Target} onClick={onNavigate} to={`/app/${workspaceId}/children-future`}>
            Children Future
          </SidebarLink>
          <SidebarLink icon={FileText} onClick={onNavigate} to={`/app/${workspaceId}/statements`}>
            Statements
          </SidebarLink>
          <SidebarLink icon={BarChart3} onClick={onNavigate} to={`/app/${workspaceId}/reports`}>
            Reports
          </SidebarLink>
        </>
      )}

      {/* loan */}
      {workspaceId === "loans" && (
        <>
          <SidebarLink icon={LayoutDashboard} onClick={onNavigate} to={`/app/${workspaceId}`}>
            Overview
          </SidebarLink>
          <SidebarLink icon={HandCoins} onClick={onNavigate} to={`/app/${workspaceId}/applications`}>
            Applications
          </SidebarLink>
          <SidebarLink icon={Briefcase} onClick={onNavigate} to={`/app/${workspaceId}/offers`}>
            Offers
          </SidebarLink>
          <SidebarLink icon={WalletCards} onClick={onNavigate} to={`/app/${workspaceId}/repayments`}>
            Repayments
          </SidebarLink>
          <SidebarLink icon={FileText} onClick={onNavigate} to={`/app/${workspaceId}/statements`}>
            Statements
          </SidebarLink>
          <SidebarLink icon={BarChart3} onClick={onNavigate} to={`/app/${workspaceId}/reports`}>
            Reports
          </SidebarLink>
        </>
      )}

      {/* admin */}
      {workspaceId === "admin" && (
        <>
          <SidebarLink icon={LayoutDashboard} onClick={onNavigate} to="/app/admin">
            Dashboard
          </SidebarLink>
          <SidebarLink icon={WalletCards} onClick={onNavigate} to="/app/admin/payments">
            Payments
          </SidebarLink>
          <SidebarLink icon={Pause} onClick={onNavigate} to="/app/admin/pauses">
            Pauses
          </SidebarLink>
          <SidebarLink icon={Repeat} onClick={onNavigate} to="/app/admin/swaps">
            Swaps
          </SidebarLink>
          <SidebarLink icon={Settings} onClick={onNavigate} to="/app/admin/settings">
            Pricing & Rules
          </SidebarLink>
          <SidebarLink icon={Users} onClick={onNavigate} to="/app/admin/users">
            Users
          </SidebarLink>
        </>
      )}

      {/* fund transfers */}
      {workspaceId === "fund-transfers" && (
        <>
          <SidebarLink icon={LayoutDashboard} onClick={onNavigate} to={`/app/${workspaceId}`}>
            Overview
          </SidebarLink>
          <SidebarLink icon={Send} onClick={onNavigate} to={`/app/${workspaceId}/send`}>
            Send Money
          </SidebarLink>
          <SidebarLink icon={ArrowLeftRight} onClick={onNavigate} to={`/app/${workspaceId}/settlements`}>
            Settlements
          </SidebarLink>
          <SidebarLink icon={FileText} onClick={onNavigate} to={`/app/${workspaceId}/statements`}>
            Statements
          </SidebarLink>
          <SidebarLink icon={BarChart3} onClick={onNavigate} to={`/app/${workspaceId}/reports`}>
            Reports
          </SidebarLink>
        </>
      )}
    </div>
  );
}

export default function AppShell() {
  const nav = useNavigate();
  const { logout, user } = useAuth();
  const { workspaceId, label } = useWorkspace();
  const isAdmin = user?.role === "ADMIN";

  const [mobileOpen, setMobileOpen] = useState(false);

  const title = useMemo(() => {
    return label ? `Money Owl / ${label}` : "Money Owl";
  }, [label]);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-indigo-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <div className="md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="left" className="w-[280px] p-0">
                  <SheetHeader className="p-4 pb-2">
                    <SheetTitle className="text-base">Navigation</SheetTitle>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </SheetHeader>

                  <div className="px-3 pb-4">
                    <Card className="rounded-2xl p-3">
                      <SidebarNav
                        workspaceId={workspaceId}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    </Card>

                    {!isAdmin ? (
                      <div className="mt-3 flex gap-2 px-1">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setMobileOpen(false);
                            nav("/app");
                          }}
                        >
                          Switch Product
                        </Button>
                      </div>
                    ) : null}

                    <div className="mt-2 flex gap-2 px-1">
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                          nav("/login");
                        }}
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Brand */}
            <div className="text-lg font-semibold tracking-tight text-slate-900">Money Owl</div>
            <div className="hidden sm:block text-sm text-slate-500">/ {label}</div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {!isAdmin ? (
              <Button variant="ghost" onClick={() => nav("/app")}>
                Switch Product
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                logout();
                nav("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden md:block">
            <Card className="rounded-2xl border-indigo-300 bg-white shadow-sm sticky top-20">
              <div className="px-2 py-2 text-xs font-semibold tracking-wide text-slate-500">
                Navigation
              </div>
              <SidebarNav workspaceId={workspaceId} />
            </Card>
          </aside>

          {/* Main content */}
          <main className="min-w-0" aria-label={title}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
