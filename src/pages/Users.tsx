import { useEffect, useMemo, useState } from "react";
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
import { Loader2, Plus, Search, Shield } from "lucide-react";
import {
  listAdminInvestProducts,
  listAdminInvestUserRates,
  upsertAdminInvestUserRate,
  type InvestmentProduct,
  type InvestmentUserRate,
} from "@/lib/investApi";

type Role = "USER" | "ADMIN";
type ProductKey = "THRIFT" | "INVEST" | "LOANS" | "FUND_TRANSFERS" | "ADMIN";

type User = {
  id: string;
  email: string;
  role: Role;
  fullName?: string | null;
  createdAt?: string;
};

const BASE_PRODUCTS: ProductKey[] = ["THRIFT", "INVEST", "LOANS", "FUND_TRANSFERS"];

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
  const [saving, setSaving] = useState(false);

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">Manage users and assign product access.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Users</CardTitle>
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
          <div className="grid gap-3 md:grid-cols-3">
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

          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-50 text-xs font-medium text-muted-foreground px-4 py-3">
              <div className="col-span-5">User</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-5 text-right">Actions</div>
            </div>

            {loading ? (
              <div className="p-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6 text-muted-foreground">No users found.</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="grid grid-cols-12 px-4 py-3 border-t items-center">
                  <div className="col-span-5">
                    <div className="font-medium">{u.fullName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="col-span-2">{roleBadge(u.role)}</div>
                  <div className="col-span-5 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openProductAccess(u)}>
                      Products
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openRateOverrides(u)}>
                      Invest Rates
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Investment Rates</DialogTitle>
            <DialogDescription>
              Set rate overrides per investment product for this customer. Active overrides also update active plans.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{rateUser?.email || "—"}</div>
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
                      className="grid grid-cols-12 items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="col-span-5">
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">Base: {p.annualRatePct}%</div>
                      </div>
                      <div className="col-span-3">
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
                      <label className="col-span-2 flex items-center gap-2 text-sm">
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
                          {rateSavingProductId === p.id ? "Saving..." : "Save"}
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
            <div className="text-sm text-muted-foreground">{editUser?.email}</div>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Product Access</DialogTitle>
            <DialogDescription>Grant or revoke product access for this user.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{accessUser?.email || "—"}</div>

            {accessLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading access...
              </div>
            ) : (
              <div className="grid gap-2">
                {[
                  ...BASE_PRODUCTS,
                  ...(accessUser?.role === "ADMIN" ? (["ADMIN"] as ProductKey[]) : []),
                ].map((product) => {
                  const checked = accessProducts.includes(product);
                  return (
                    <label
                      key={product}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{product}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleProduct(product, e.target.checked)}
                      />
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
    </div>
  );
}
