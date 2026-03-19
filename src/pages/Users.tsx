import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Loader2, Plus, Search, Shield, ShieldCheck, UserRound, Users2 } from "lucide-react";
import {
  listAdminInvestProducts,
  listAdminInvestUserRates,
  upsertAdminInvestUserRate,
  type InvestmentProduct,
  type InvestmentUserRate,
} from "@/lib/investApi";

type Role = "USER" | "ADMIN";
type UserState = "REGISTERED" | "INACTIVE" | "ACTIVE" | "ELIGIBLE" | "SUSPENDED";
type ProductKey = "THRIFT" | "INVEST" | "LOANS" | "FUND_TRANSFERS" | "ADMIN";

type User = {
  id: string;
  email: string;
  role: Role;
  state?: UserState;
  fullName?: string | null;
  createdAt?: string;
};

const BASE_PRODUCTS: ProductKey[] = ["THRIFT", "INVEST", "LOANS", "FUND_TRANSFERS"];
const PRODUCT_META: Record<ProductKey, { label: string; description: string }> = {
  THRIFT: { label: "MyContributions", description: "Goal-based contribution plans and payout participation." },
  INVEST: { label: "MyInvestment", description: "Savings and investment products with configurable customer rates." },
  LOANS: { label: "MyLoan", description: "Loan access and repayment tools when the product is enabled." },
  FUND_TRANSFERS: { label: "MyFundTransfers", description: "Transfer and remittance tools when service is available." },
  ADMIN: { label: "Admin Console", description: "Operational access to dashboards, reviews, and controls." },
};

function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border shadow-sm dashboard-card">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
          <div className="text-xs text-slate-500">{hint}</div>
        </div>
        <div className="rounded-xl border border-white/80 bg-indigo-50 p-2.5 shadow-sm">
          <Icon className="h-5 w-5 text-indigo-700" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Users() {
  const nav = useNavigate();
  const myRole = (localStorage.getItem("userRole") || "USER").toUpperCase() as Role;

  useEffect(() => {
    if (myRole !== "ADMIN") {
      toast.error("Only ADMIN can access User Management.");
      nav("/app/admin", { replace: true });
    }
  }, [myRole, nav]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkRoleTarget, setBulkRoleTarget] = useState<Role>("USER");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState<Role>("USER");
  const [createTempPassword, setCreateTempPassword] = useState("Welcome123!");
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<Role>("USER");
  const [editState, setEditState] = useState<UserState>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [generatedPasswordUser, setGeneratedPasswordUser] = useState<User | null>(null);
  const [generatedPasswordOpen, setGeneratedPasswordOpen] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [accessOpen, setAccessOpen] = useState(false);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [accessProducts, setAccessProducts] = useState<ProductKey[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateUser, setRateUser] = useState<User | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSavingProductId, setRateSavingProductId] = useState<string | null>(null);
  const [investProducts, setInvestProducts] = useState<InvestmentProduct[]>([]);
  const [rateByProduct, setRateByProduct] = useState<
    Record<string, { annualRatePct: string; isActive: boolean; overrideId?: string }>
  >({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (roleFilter !== "ALL") params.set("role", roleFilter);
        const data = await apiFetch<{ users: User[] }>(`/v1/admin/users?${params.toString()}`);
        setUsers(data.users || []);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshKey, search, roleFilter]);

  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((u) => {
      if (!s) return true;
      return (u.email || "").toLowerCase().includes(s) || (u.fullName || "").toLowerCase().includes(s);
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
    setSelectedUserIds([]);
  }, [search, roleFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const userStats = useMemo(() => {
    const admins = users.filter((u) => u.role === "ADMIN").length;
    const standardUsers = users.filter((u) => u.role === "USER").length;
    return {
      total: users.length,
      admins,
      standardUsers,
      visible: filteredUsers.length,
    };
  }, [filteredUsers.length, users]);

  const pageUserIds = pagedUsers.map((u) => u.id);
  const allPageSelected = pageUserIds.length > 0 && pageUserIds.every((id) => selectedUserIds.includes(id));

  function toggleUserSelection(userId: string, checked: boolean) {
    setSelectedUserIds((prev) => {
      if (checked) return Array.from(new Set([...prev, userId]));
      return prev.filter((id) => id !== userId);
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedUserIds((prev) => {
      if (checked) return Array.from(new Set([...prev, ...pageUserIds]));
      return prev.filter((id) => !pageUserIds.includes(id));
    });
  }

  async function applyBulkRole(role: Role) {
    if (selectedUserIds.length === 0) {
      toast.error("Select at least one user first.");
      return;
    }
    setBulkSaving(true);
    try {
      await Promise.all(
        selectedUserIds.map((userId) =>
          apiFetch<{ user: User }>(`/v1/admin/users/${userId}`, {
            method: "PATCH",
            body: JSON.stringify({ role }),
          })
        )
      );
      toast.success(`Updated ${selectedUserIds.length} user${selectedUserIds.length > 1 ? "s" : ""} to ${role}.`);
      setSelectedUserIds([]);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update selected users");
    } finally {
      setBulkSaving(false);
    }
  }

  function requestBulkRole(role: Role) {
    if (selectedUserIds.length === 0) {
      toast.error("Select at least one user first.");
      return;
    }
    setBulkRoleTarget(role);
    setBulkConfirmOpen(true);
  }

  function openCreate() {
    setCreateEmail("");
    setCreateFullName("");
    setCreateRole("USER");
    setCreateTempPassword("Welcome123!");
    setCreateOpen(true);
  }

  async function submitCreate() {
    if (!createEmail.trim()) return toast.error("Email is required");
    setCreating(true);
    try {
      const res = await apiFetch<{ user: User; tempPassword?: string }>("/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: createEmail.trim(),
          fullName: createFullName.trim() || undefined,
          role: createRole,
          tempPassword: createTempPassword.trim() || undefined,
        }),
      });
      toast.success(`User created: ${res.user?.email}`);
      if (res.tempPassword) toast.message("Temporary password", { description: res.tempPassword });
      setCreateOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u: User) {
    setEditUser(u);
    setEditFullName(u.fullName || "");
    setEditRole(u.role);
    setEditState((u.state as UserState) || "ACTIVE");
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ user: User }>(`/v1/admin/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: editFullName.trim() || null,
          role: editRole,
          state: editState,
        }),
      });
      toast.success(`Updated: ${res.user?.email}`);
      setEditOpen(false);
      setEditUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  async function openProductAccess(u: User) {
    setAccessUser(u);
    setAccessProducts([]);
    setAccessOpen(true);
    setAccessLoading(true);
    try {
      const res = await apiFetch<{ products: ProductKey[] }>(`/v1/admin/access/users/${u.id}/products`);
      setAccessProducts((res.products || []) as ProductKey[]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load product access");
      setAccessOpen(false);
      setAccessUser(null);
    } finally {
      setAccessLoading(false);
    }
  }

  function toggleProduct(product: ProductKey, checked: boolean) {
    setAccessProducts((prev) => {
      if (checked) return Array.from(new Set([...prev, product]));
      return prev.filter((p) => p !== product);
    });
  }

  async function saveProductAccess() {
    if (!accessUser) return;
    setAccessSaving(true);
    try {
      await apiFetch(`/v1/admin/access/users/${accessUser.id}/products`, {
        method: "PUT",
        body: JSON.stringify({ products: accessProducts }),
      });
      toast.success(`Updated product access for ${accessUser.email}`);
      setAccessOpen(false);
      setAccessUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update product access");
    } finally {
      setAccessSaving(false);
    }
  }

  async function submitResetPassword() {
    if (!resetPasswordUser) return;
    setResetPasswordSaving(true);
    try {
      const res = await apiFetch<{ user: User; tempPassword: string }>(`/v1/admin/users/${resetPasswordUser.id}/reset-password`, {
        method: "POST",
      });
      toast.success(`Temporary password reset for ${res.user.email}`);
      setResetPasswordOpen(false);
      setGeneratedPassword(res.tempPassword);
      setGeneratedPasswordUser(res.user);
      setGeneratedPasswordOpen(true);
      setCopiedPassword(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setResetPasswordSaving(false);
    }
  }

  async function copyGeneratedPassword() {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      toast.success("Temporary password copied");
    } catch {
      toast.error("Failed to copy password");
    }
  }

  function roleBadge(role: Role) {
    if (role === "ADMIN") {
      return (
        <Badge className="gap-1">
          <Shield className="h-3 w-3" />
          ADMIN
        </Badge>
      );
    }
    return <Badge variant="outline">USER</Badge>;
  }

  function stateBadge(state?: UserState) {
    const value = state || "INACTIVE";
    if (value === "ACTIVE" || value === "ELIGIBLE") {
      return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{value}</Badge>;
    }
    if (value === "SUSPENDED") {
      return <Badge variant="destructive">{value}</Badge>;
    }
    if (value === "REGISTERED") {
      return <Badge variant="secondary">{value}</Badge>;
    }
    return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{value}</Badge>;
  }

  async function openRateOverrides(u: User) {
    setRateUser(u);
    setRateOpen(true);
    setRateLoading(true);
    try {
      const [prodRes, rateRes] = await Promise.all([
        listAdminInvestProducts(),
        listAdminInvestUserRates(u.id),
      ]);
      const rows: Record<string, { annualRatePct: string; isActive: boolean; overrideId?: string }> = {};
      const ratesByProduct = new Map<string, InvestmentUserRate>((rateRes.items || []).map((r) => [r.productId, r]));
      for (const p of prodRes.items || []) {
        const o = ratesByProduct.get(p.id);
        rows[p.id] = {
          annualRatePct: String(o ? o.annualRatePct : p.annualRatePct),
          isActive: o ? Boolean(o.isActive) : false,
          overrideId: o?.id,
        };
      }
      setInvestProducts(prodRes.items || []);
      setRateByProduct(rows);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load investment rate overrides");
      setRateOpen(false);
      setRateUser(null);
    } finally {
      setRateLoading(false);
    }
  }

  async function saveRateOverride(productId: string) {
    if (!rateUser) return;
    const row = rateByProduct[productId];
    if (!row) return;
    const rate = Number(row.annualRatePct);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error("Rate must be between 0 and 100.");
      return;
    }
    setRateSavingProductId(productId);
    try {
      await upsertAdminInvestUserRate({
        userId: rateUser.id,
        productId,
        annualRatePct: rate,
        isActive: row.isActive,
      });
      toast.success("Customer rate updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save customer rate");
    } finally {
      setRateSavingProductId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Admin Console
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">User management</h1>
        <p className="text-sm text-slate-500">Manage roles, product access, password resets, and account activation state.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Total users" value={userStats.total} hint="All user records in the system" icon={Users2} />
        <SummaryTile label="Admins" value={userStats.admins} hint="Accounts with admin console access" icon={ShieldCheck} />
        <SummaryTile label="Customers" value={userStats.standardUsers} hint="Standard user accounts" icon={UserRound} />
        <SummaryTile label="Visible results" value={userStats.visible} hint="Matches current search and role filter" icon={Search} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-950">Users</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Search users, adjust roles, and grant product access.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New User
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-2xl border bg-slate-50/80 p-4 md:grid-cols-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "ALL")}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All roles</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={allPageSelected} onChange={(e) => toggleSelectAllOnPage(e.target.checked)} />
                <span>Select page</span>
              </label>
              <span>{selectedUserIds.length} selected</span>
              <span>Page {page} of {totalPages}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedUserIds([])} disabled={selectedUserIds.length === 0 || bulkSaving}>
                Clear selection
              </Button>
              <Button variant="outline" size="sm" onClick={() => requestBulkRole("USER")} disabled={selectedUserIds.length === 0 || bulkSaving}>
                Set USER
              </Button>
              <Button size="sm" onClick={() => requestBulkRole("ADMIN")} disabled={selectedUserIds.length === 0 || bulkSaving}>
                Set ADMIN
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No users found for the current search or role filter.
              </div>
            ) : (
              pagedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="mr-1 inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => toggleUserSelection(u.id, e.target.checked)}
                        />
                      </label>
                      <div className="font-medium text-slate-950">{u.fullName || "—"}</div>
                      {roleBadge(u.role)}
                      {stateBadge(u.state)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{u.email}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Added {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button variant="secondary" size="sm" onClick={() => openProductAccess(u)}>
                      Products
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openRateOverrides(u)}>
                      Invest Rates
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setResetPasswordUser(u);
                        setResetPasswordOpen(true);
                      }}
                    >
                      Reset Password
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && filteredUsers.length > pageSize ? (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a USER or ADMIN account.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={createRole} onValueChange={(v) => setCreateRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Temporary password</Label>
              <Input value={createTempPassword} onChange={(e) => setCreateTempPassword(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rateOpen}
        onOpenChange={(open) => {
          setRateOpen(open);
          if (!open) setRateUser(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Investment Rates</DialogTitle>
            <DialogDescription>
              Set rate overrides per investment product for this customer. Active overrides also update active plans.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-950">{rateUser?.fullName || "Customer"}</div>
                  <div className="mt-1 text-sm text-slate-500">{rateUser?.email || "—"}</div>
                </div>
                <Badge variant="outline">Customer-specific pricing</Badge>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-xl border bg-white px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Scope</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">Investment products</div>
                </div>
                <div className="rounded-xl border bg-white px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Override mode</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">Per customer</div>
                </div>
                <div className="rounded-xl border bg-white px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Activation</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">Manual by product</div>
                </div>
              </div>
            </div>
            {rateLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading rates...
              </div>
            ) : (
              <div className="space-y-2">
                {investProducts.map((p) => {
                  const row = rateByProduct[p.id] || { annualRatePct: String(p.annualRatePct), isActive: false };
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-12 items-center gap-3 rounded-2xl border bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="col-span-5">
                        <div className="text-sm font-medium text-slate-950">{p.name}</div>
                        <div className="text-xs text-slate-500">Base rate {p.annualRatePct}%</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          <span className="rounded-full border bg-slate-50 px-2 py-1">
                            {p.minMonths} to {p.maxMonths} months
                          </span>
                          <span className="rounded-full border bg-slate-50 px-2 py-1">{p.isActive ? "Active product" : "Inactive product"}</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <Label className="mb-1 block text-xs text-slate-500">Override rate %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.annualRatePct}
                          onChange={(e) =>
                            setRateByProduct((prev) => ({
                              ...prev,
                              [p.id]: { ...row, annualRatePct: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <label className="col-span-2 flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(e) =>
                            setRateByProduct((prev) => ({
                              ...prev,
                              [p.id]: { ...row, isActive: e.target.checked },
                            }))
                          }
                        />
                        Active
                      </label>
                      <div className="col-span-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveRateOverride(p.id)}
                          disabled={rateSavingProductId === p.id}
                        >
                          {rateSavingProductId === p.id ? "Saving..." : "Save rate"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRateOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user profile and role.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-slate-50/80 p-4">
              <div className="font-medium text-slate-950">{editUser?.fullName || "User"}</div>
              <div className="mt-1 text-sm text-slate-500">{editUser?.email}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {editUser ? roleBadge(editUser.role) : null}
                {editUser ? stateBadge(editUser.state) : null}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Account state</Label>
              <Select value={editState} onValueChange={(v) => setEditState(v as UserState)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTERED">REGISTERED</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="ELIGIBLE">ELIGIBLE</SelectItem>
                  <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={saving || !editUser}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={accessOpen}
        onOpenChange={(open) => {
          setAccessOpen(open);
          if (!open) setAccessUser(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Access</DialogTitle>
            <DialogDescription>Grant or revoke product access for this user.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-950">{accessUser?.fullName || "User"}</div>
                  <div className="mt-1 text-sm text-slate-500">{accessUser?.email || "—"}</div>
                </div>
                <Badge variant="outline">{accessUser?.role === "ADMIN" ? "Admin account" : "Customer account"}</Badge>
              </div>
              <div className="mt-2 text-xs text-slate-400">Choose which products this account can access after login.</div>
            </div>

            {accessLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading access...
              </div>
            ) : (
              <div className="grid gap-3">
                {[
                  ...BASE_PRODUCTS,
                  ...(accessUser?.role === "ADMIN" ? (["ADMIN"] as ProductKey[]) : []),
                ].map((product) => {
                  const checked = accessProducts.includes(product);
                  return (
                    <label
                      key={product}
                      className="flex items-start justify-between gap-4 rounded-2xl border bg-white px-4 py-4 text-sm shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800">{PRODUCT_META[product].label}</div>
                        <div className="mt-1 text-xs text-slate-500">{PRODUCT_META[product].description}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={checked ? "default" : "outline"}>{checked ? "Enabled" : "Disabled"}</Badge>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleProduct(product, e.target.checked)}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAccessOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProductAccess} disabled={accessLoading || accessSaving || !accessUser}>
              {accessSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetPasswordOpen}
        onOpenChange={(open) => {
          setResetPasswordOpen(open);
          if (!open) setResetPasswordUser(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Generate a new temporary password for this user. The current password will stop working immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-slate-50/80 p-4">
              <div className="font-medium text-slate-950">{resetPasswordUser?.fullName || "User"}</div>
              <div className="mt-1 text-sm text-slate-500">{resetPasswordUser?.email || "—"}</div>
              <div className="mt-2 text-xs text-slate-400">
                A temporary password will be shown after reset. Share it securely with the user and ask them to change it.
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)} disabled={resetPasswordSaving}>
              Cancel
            </Button>
            <Button onClick={submitResetPassword} disabled={resetPasswordSaving || !resetPasswordUser}>
              {resetPasswordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate temporary password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={generatedPasswordOpen}
        onOpenChange={(open) => {
          setGeneratedPasswordOpen(open);
          if (!open) {
            setGeneratedPassword("");
            setGeneratedPasswordUser(null);
            setCopiedPassword(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Temporary Password Ready</DialogTitle>
            <DialogDescription>
              Copy this password and share it securely with {generatedPasswordUser?.email || "the user"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-slate-50/80 p-4">
              <div className="font-medium text-slate-950">{generatedPasswordUser?.fullName || "User"}</div>
              <div className="mt-1 text-sm text-slate-500">{generatedPasswordUser?.email || "—"}</div>
            </div>

            <div className="space-y-2">
              <Label>Temporary password</Label>
              <div className="flex items-center gap-2 rounded-2xl border bg-white p-2 shadow-sm">
                <Input
                  value={generatedPassword}
                  readOnly
                  className="border-0 bg-transparent font-mono text-base tracking-[0.18em] shadow-none focus-visible:ring-0"
                />
                <Button type="button" variant="outline" onClick={copyGeneratedPassword} className="shrink-0 bg-white">
                  {copiedPassword ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copiedPassword ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                This replaces the current password immediately. Ask the user to change it after first login.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setGeneratedPasswordOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk role update</DialogTitle>
            <DialogDescription>
              Set {selectedUserIds.length} selected user{selectedUserIds.length > 1 ? "s" : ""} to {bulkRoleTarget}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkSaving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setBulkConfirmOpen(false);
                await applyBulkRole(bulkRoleTarget);
              }}
              disabled={bulkSaving}
            >
              {bulkSaving ? "Updating..." : `Confirm ${bulkRoleTarget}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
