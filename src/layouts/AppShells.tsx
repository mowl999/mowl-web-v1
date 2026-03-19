import { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
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
  CircleUserRound,
  BellRing,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  dismissLoanReminder,
  listDismissedLoanReminders,
  listLoanReminders,
  markAllLoanRemindersRead,
  markLoanReminderRead,
  markLoanReminderUnread,
  restoreLoanReminder,
  type UserNotification,
} from "@/lib/loansApi";

import { useAuth } from "@/app/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LOAN_REMINDER_EVENT = "loan-reminders-unread-changed";

function formatReminderDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function emitLoanReminderUnreadCount(count: number) {
  window.dispatchEvent(new CustomEvent(LOAN_REMINDER_EVENT, { detail: { count } }));
}

function LoanReminderDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeReminders, setActiveReminders] = useState<UserNotification[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function loadReminders() {
    setLoading(true);
    try {
      const [activeRes, dismissedRes] = await Promise.all([listLoanReminders(), listDismissedLoanReminders()]);
      setActiveReminders(activeRes.items || []);
      setDismissedReminders(dismissedRes.items || []);
      setUnreadCount(Number(activeRes.unreadCount || 0));
      emitLoanReminderUnreadCount(Number(activeRes.unreadCount || 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadReminders().catch(() => {});
  }, [open]);

  async function toggleReminderRead(reminder: UserNotification) {
    setActionId(reminder.id);
    try {
      const res = reminder.isRead ? await markLoanReminderUnread(reminder.id) : await markLoanReminderRead(reminder.id);
      setActiveReminders((current) => current.map((item) => (item.id === reminder.id ? res.item : item)));
      setUnreadCount(res.unreadCount);
      emitLoanReminderUnreadCount(res.unreadCount);
    } finally {
      setActionId(null);
    }
  }

  async function dismissReminder(reminder: UserNotification) {
    setActionId(reminder.id);
    try {
      const res = await dismissLoanReminder(reminder.id);
      setActiveReminders((current) => current.filter((item) => item.id !== reminder.id));
      setDismissedReminders((current) => [{ ...reminder, isRead: true, dismissedAt: new Date().toISOString() }, ...current]);
      setUnreadCount(res.unreadCount);
      emitLoanReminderUnreadCount(res.unreadCount);
    } finally {
      setActionId(null);
    }
  }

  async function restoreReminder(reminder: UserNotification) {
    setActionId(reminder.id);
    try {
      const res = await restoreLoanReminder(reminder.id);
      setDismissedReminders((current) => current.filter((item) => item.id !== reminder.id));
      setActiveReminders((current) => [res.item, ...current]);
      setUnreadCount(res.unreadCount);
      emitLoanReminderUnreadCount(res.unreadCount);
    } finally {
      setActionId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const res = await markAllLoanRemindersRead();
      setActiveReminders((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(res.unreadCount);
      emitLoanReminderUnreadCount(res.unreadCount);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto border-l border-indigo-100 bg-white p-0 sm:max-w-xl">
        <div className="sticky top-0 z-10 border-b border-indigo-100 bg-white/95 px-6 py-5 backdrop-blur">
          <SheetHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-slate-950">MyLoan reminders</SheetTitle>
                <SheetDescription className="text-sm text-slate-500">
                  Manage upcoming and overdue repayment reminders without leaving your current page.
                </SheetDescription>
              </div>
              <Badge className={unreadCount > 0 ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-100 text-slate-600"}>
                {unreadCount} unread
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={markingAll || unreadCount === 0} onClick={handleMarkAllRead}>
                {markingAll ? "Updating..." : "Mark all read"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadReminders()}>
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/app/loans");
                }}
              >
                Open MyLoan
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-950">Active reminders</div>
            {loading ? (
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-4 text-sm text-slate-500">Loading reminders...</div>
              </Card>
            ) : activeReminders.length === 0 ? (
              <Card className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 shadow-sm">
                <div className="p-4 text-sm text-slate-500">No active reminders right now.</div>
              </Card>
            ) : (
              activeReminders.map((reminder) => (
                <Card
                  key={reminder.id}
                  className={cn(
                    "rounded-2xl shadow-sm",
                    reminder.isRead ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50/50"
                  )}
                >
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-slate-950">{reminder.title}</div>
                          {!reminder.isRead ? (
                            <Badge className="border-indigo-200 bg-white text-indigo-700">Unread</Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{reminder.message}</div>
                      </div>
                      <Badge className={reminder.type === "LOAN_REPAYMENT_OVERDUE" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                        {reminder.type === "LOAN_REPAYMENT_OVERDUE" ? "Overdue" : "Upcoming"}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-slate-500">{formatReminderDate(reminder.createdAt)}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" disabled={actionId === reminder.id} onClick={() => toggleReminderRead(reminder)}>
                          {actionId === reminder.id ? "Updating..." : reminder.isRead ? "Mark unread" : "Mark read"}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={actionId === reminder.id} onClick={() => dismissReminder(reminder)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-950">Dismissed history</div>
            {dismissedReminders.length === 0 ? (
              <Card className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 shadow-sm">
                <div className="p-4 text-sm text-slate-500">No dismissed reminders yet.</div>
              </Card>
            ) : (
              dismissedReminders.slice(0, 8).map((reminder) => (
                <Card key={reminder.id} className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-950">{reminder.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{reminder.message}</div>
                      </div>
                      <Badge className="border-slate-200 bg-white text-slate-600">Dismissed</Badge>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-slate-500">
                        Dismissed {formatReminderDate(reminder.dismissedAt || reminder.createdAt)}
                      </div>
                      <Button variant="outline" size="sm" disabled={actionId === reminder.id} onClick={() => restoreReminder(reminder)}>
                        {actionId === reminder.id ? "Restoring..." : "Restore"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

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

function SidebarSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </div>
  );
}

function SidebarSubLink({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "ml-6 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-indigo-50 hover:text-slate-900"
        )
      }
      end
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current/70" />
      {children}
    </NavLink>
  );
}

function SidebarGroup({
  label,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 text-slate-500" />
          {label}
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open ? <div className="space-y-1">{children}</div> : null}
    </div>
  );
}

function SidebarNav({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isAdmin = workspaceId === "admin";
  const isContributionAdminRoute =
    location.pathname.startsWith("/app/admin/payments") ||
    location.pathname.startsWith("/app/admin/swaps") ||
    location.pathname.startsWith("/app/admin/pauses");
  const isLoanAdminRoute = location.pathname.startsWith("/app/admin/loans");
  const isSettingsRoute = location.pathname.startsWith("/app/admin/settings");
  const [contributionsCollapsed, setContributionsCollapsed] = useState(() => !isContributionAdminRoute);
  const [loansCollapsed, setLoansCollapsed] = useState(() => !isLoanAdminRoute);
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => !isSettingsRoute);
  const contributionsOpen = isContributionAdminRoute || !contributionsCollapsed;
  const loansOpen = isLoanAdminRoute || !loansCollapsed;
  const settingsOpen = isSettingsRoute || !settingsCollapsed;

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
            Plans
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
          <SidebarLink icon={CircleUserRound} onClick={onNavigate} to={`/app/${workspaceId}/profile`}>
            My Profile
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
          <SidebarLink icon={CircleUserRound} onClick={onNavigate} to={`/app/${workspaceId}/profile`}>
            My Profile
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
          <SidebarLink icon={CircleUserRound} onClick={onNavigate} to={`/app/${workspaceId}/profile`}>
            My Profile
          </SidebarLink>
        </>
      )}

      {/* admin */}
      {workspaceId === "admin" && (
        <>
          <SidebarSection>
            <SidebarSectionLabel>Overview</SidebarSectionLabel>
            <SidebarLink icon={LayoutDashboard} onClick={onNavigate} to="/app/admin">
              Dashboard
            </SidebarLink>
            <SidebarLink icon={Users} onClick={onNavigate} to="/app/admin/users">
              Users
            </SidebarLink>
          </SidebarSection>

          <SidebarSection>
            <SidebarSectionLabel>Product Operations</SidebarSectionLabel>
            <SidebarGroup
              label="MyContributions"
              icon={WalletCards}
              open={contributionsOpen}
              onToggle={() => setContributionsCollapsed((value) => !value)}
            >
              <SidebarSubLink onClick={onNavigate} to="/app/admin/payments">
                Payments
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/swaps">
                Swaps
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/pauses">
                Pauses
              </SidebarSubLink>
            </SidebarGroup>
            <SidebarGroup
              label="MyLoan"
              icon={HandCoins}
              open={loansOpen}
              onToggle={() => setLoansCollapsed((value) => !value)}
            >
              <SidebarSubLink onClick={onNavigate} to="/app/admin/loans/dashboard">
                Dashboard
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/loans/applications">
                Application Queue
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/loans/equity">
                Equity Review
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/loans/repayments">
                Repayment Review
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/loans/products">
                Loan Products
              </SidebarSubLink>
            </SidebarGroup>
          </SidebarSection>

          <SidebarSection>
            <SidebarSectionLabel>Setup</SidebarSectionLabel>
            <SidebarGroup
              label="Pricing & Rules"
              icon={Settings}
              open={settingsOpen}
              onToggle={() => setSettingsCollapsed((value) => !value)}
            >
              <SidebarSubLink onClick={onNavigate} to="/app/admin/settings/contributions">
                MyContributions
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/settings/investment">
                MyInvestment
              </SidebarSubLink>
              <SidebarSubLink onClick={onNavigate} to="/app/admin/settings/loans">
                MyLoan
              </SidebarSubLink>
            </SidebarGroup>
            <SidebarLink icon={CircleUserRound} onClick={onNavigate} to="/app/admin/profile">
              My Profile
            </SidebarLink>
          </SidebarSection>
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
          <SidebarLink icon={CircleUserRound} onClick={onNavigate} to={`/app/${workspaceId}/profile`}>
            My Profile
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
  const [loanReminderDrawerOpen, setLoanReminderDrawerOpen] = useState(false);
  const [loanReminderUnreadCount, setLoanReminderUnreadCount] = useState(0);

  const title = useMemo(() => {
    return label ? `Money Owl / ${label}` : "Money Owl";
  }, [label]);

  const profilePath = useMemo(() => {
    return workspaceId === "admin" ? "/app/admin/profile" : `/app/${workspaceId}/profile`;
  }, [workspaceId]);

  const userInitials = useMemo(() => {
    const source = user?.name || user?.email || "MO";
    const parts = source.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }, [user?.email, user?.name]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function loadLoanReminderUnreadCount() {
      if (workspaceId !== "loans") {
        if (!cancelled) setLoanReminderUnreadCount(0);
        return;
      }
      try {
        const res = await listLoanReminders();
        if (!cancelled) {
          setLoanReminderUnreadCount(Number(res.unreadCount || 0));
        }
      } catch {
        if (!cancelled) setLoanReminderUnreadCount(0);
      }
    }

    loadLoanReminderUnreadCount();
    if (workspaceId === "loans") {
      timer = window.setInterval(loadLoanReminderUnreadCount, 60000);
    }

    function handleUnreadChanged(event: Event) {
      const custom = event as CustomEvent<{ count?: number }>;
      if (!cancelled && workspaceId === "loans") {
        setLoanReminderUnreadCount(Number(custom.detail?.count || 0));
      }
    }

    window.addEventListener(LOAN_REMINDER_EVENT, handleUnreadChanged as EventListener);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      window.removeEventListener(LOAN_REMINDER_EVENT, handleUnreadChanged as EventListener);
    };
  }, [workspaceId]);

  return (
    <div className="min-h-screen">
      {workspaceId === "loans" ? (
        <LoanReminderDrawer open={loanReminderDrawerOpen} onOpenChange={setLoanReminderDrawerOpen} />
      ) : null}

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
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setMobileOpen(false);
                          nav(profilePath);
                        }}
                      >
                        My Profile
                      </Button>
                    </div>

                    <div className="mt-2 flex gap-2 px-1">
                      {workspaceId === "loans" ? (
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => {
                            setMobileOpen(false);
                            setLoanReminderDrawerOpen(true);
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            <BellRing className="h-4 w-4" />
                            Reminders
                          </span>
                          {loanReminderUnreadCount > 0 ? (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {loanReminderUnreadCount}
                            </span>
                          ) : null}
                        </Button>
                      ) : null}
                    </div>

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
            {workspaceId === "loans" ? (
              <Button variant="ghost" className="relative px-3" onClick={() => setLoanReminderDrawerOpen(true)}>
                <BellRing className="h-4 w-4" />
                {loanReminderUnreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {loanReminderUnreadCount}
                  </span>
                ) : null}
              </Button>
            ) : null}
            <Button variant="ghost" className="gap-3 px-2" onClick={() => nav(profilePath)}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                {userInitials}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-medium text-slate-900">{user?.name || "My Profile"}</span>
                <span className="block text-xs text-slate-500">{user?.email}</span>
              </span>
            </Button>
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
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Navigation
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">
                  {isAdmin ? "Admin operations" : label}
                </div>
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
