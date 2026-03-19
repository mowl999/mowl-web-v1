import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, Percent, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

import {
  createAdminLoanProduct,
  getAdminLoanSettings,
  listAdminLoanProducts,
  updateAdminLoanProduct,
  updateAdminLoanSettings,
  type LoanReminderSettings,
} from "@/lib/adminLoansApi";
import type { LoanProduct } from "@/lib/loansApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SummaryTile, emptyProductForm, formatMoney, type ProductFormState, productToForm } from "./shared";

const DOCUMENT_OPTIONS = [
  ["IDENTITY", "Identity document"],
  ["EMPLOYMENT_EVIDENCE", "Employment evidence"],
  ["BANK_STATEMENT", "Last 3 months statement"],
  ["BUSINESS_PROOF", "Business evidence"],
  ["ADDRESS_PROOF", "Address proof"],
  ["OTHER", "Other supporting document"],
] as const;

export default function LoanProductsAdminPage({ mode = "operations" }: { mode?: "operations" | "settings" }) {
  const location = useLocation();
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<LoanProduct | null>(null);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LoanReminderSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    upcomingReminderDays: "7",
    overdueReminderRepeatDays: "7",
    emailRemindersEnabled: true,
    inAppRemindersEnabled: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, settingsRes] = await Promise.all([listAdminLoanProducts(), getAdminLoanSettings()]);
      setProducts(productsRes.items || []);
      setSettings(settingsRes.settings);
      setSettingsForm({
        upcomingReminderDays: String(settingsRes.settings.upcomingReminderDays || 7),
        overdueReminderRepeatDays: String(settingsRes.settings.overdueReminderRepeatDays || 7),
        emailRemindersEnabled: Boolean(settingsRes.settings.emailRemindersEnabled),
        inAppRemindersEnabled: Boolean(settingsRes.settings.inAppRemindersEnabled),
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan products");
      setProducts([]);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const active = products.filter((item) => item.isActive).length;
    const avgRequirement = products.length
      ? products.reduce((sum, item) => sum + Number(item.equityRequirementPct || 0), 0) / products.length
      : 0;
    const highestMinimum = products.reduce((max, item) => Math.max(max, Number(item.minimumEquityAmount || 0)), 0);
    return { active, avgRequirement, highestMinimum };
  }, [products]);
  const inSettingsMode = mode === "settings" || location.pathname.startsWith("/app/admin/settings/");

  function openEditor(product: LoanProduct) {
    setActiveProduct(product);
    setForm(productToForm(product));
    setDialogOpen(true);
  }

  function openCreate() {
    setActiveProduct(null);
    setForm(emptyProductForm());
    setDialogOpen(true);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        minAmount: Number(form.minAmount),
        maxAmount: Number(form.maxAmount),
        minTermMonths: Number(form.minTermMonths),
        maxTermMonths: Number(form.maxTermMonths),
        annualInterestRatePct: Number(form.annualInterestRatePct) / 100,
        processingFeePct: Number(form.processingFeePct) / 100,
        equityRequirementPct: Number(form.equityRequirementPct) / 100,
        minimumEquityAmount: Number(form.minimumEquityAmount),
        requiredDocuments: form.requiredDocuments,
        isActive: form.isActive,
      };
      if (activeProduct) {
        await updateAdminLoanProduct(activeProduct.id, payload);
        toast.success("Loan product updated.");
      } else {
        await createAdminLoanProduct(payload);
        toast.success("Loan product added.");
      }
      setDialogOpen(false);
      setActiveProduct(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update loan product");
    } finally {
      setSaving(false);
    }
  }

  async function saveReminderSettings() {
    setSavingSettings(true);
    try {
      const payload = {
        upcomingReminderDays: Number(settingsForm.upcomingReminderDays),
        overdueReminderRepeatDays: Number(settingsForm.overdueReminderRepeatDays),
        emailRemindersEnabled: settingsForm.emailRemindersEnabled,
        inAppRemindersEnabled: settingsForm.inAppRemindersEnabled,
      };
      const res = await updateAdminLoanSettings(payload);
      setSettings(res.settings);
      setSettingsForm({
        upcomingReminderDays: String(res.settings.upcomingReminderDays),
        overdueReminderRepeatDays: String(res.settings.overdueReminderRepeatDays),
        emailRemindersEnabled: res.settings.emailRemindersEnabled,
        inAppRemindersEnabled: res.settings.inAppRemindersEnabled,
      });
      toast.success("Loan reminder settings updated.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update loan reminder settings");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          {inSettingsMode ? "Admin Setup / MyLoan" : "Admin Console"}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          {inSettingsMode ? "MyLoan pricing & rules" : "Loan products"}
        </h1>
        <p className="text-sm text-slate-500">
          {inSettingsMode
            ? "Manage amount ranges, repayment terms, and minimum equity rules for each loan product."
            : "Maintain amount ranges, repayment terms, and equity requirements for each loan product."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Products" value={products.length} hint="Configured loan products" icon={Landmark} />
        <SummaryTile label="Active" value={stats.active} hint="Available for new applications" icon={ShieldCheck} />
        <SummaryTile
          label="Average equity"
          value={`${Math.round(stats.avgRequirement * 100)}%`}
          hint="Across all configured products"
          icon={Percent}
        />
        <SummaryTile
          label="Highest minimum"
          value={formatMoney(stats.highestMinimum)}
          hint="Largest minimum equity amount"
          icon={WalletCards}
        />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Repayment reminder settings</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Control how early borrowers are reminded and how often overdue reminders repeat.</p>
          </div>
          {settings ? (
            <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
              {settings.emailRemindersEnabled ? "Email on" : "Email off"} · {settings.inAppRemindersEnabled ? "In-app on" : "In-app off"}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Upcoming reminder lead time (days)</Label>
            <Input
              inputMode="numeric"
              value={settingsForm.upcomingReminderDays}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, upcomingReminderDays: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Overdue reminder repeat cadence (days)</Label>
            <Input
              inputMode="numeric"
              value={settingsForm.overdueReminderRepeatDays}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, overdueReminderRepeatDays: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email reminders</Label>
            <Select
              value={settingsForm.emailRemindersEnabled ? "enabled" : "disabled"}
              onValueChange={(value) => setSettingsForm((prev) => ({ ...prev, emailRemindersEnabled: value === "enabled" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>In-app reminders</Label>
            <Select
              value={settingsForm.inAppRemindersEnabled ? "enabled" : "disabled"}
              onValueChange={(value) => setSettingsForm((prev) => ({ ...prev, inAppRemindersEnabled: value === "enabled" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 xl:col-span-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div>Render Cron still controls when the job runs. These settings control the reminder window and repeat cadence once the job executes.</div>
            <Button onClick={saveReminderSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save reminder settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Product settings</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Each product can enforce its own percentage equity requirement and minimum funded amount.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button onClick={openCreate}>Add product</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading loan products...</div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No loan products available yet.
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-slate-950">{product.name}</div>
                      <Badge className={product.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500">{product.description || "No description set."}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEditor(product)}>
                    Edit product
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Amount range</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(product.minAmount, product.currency)} - {formatMoney(product.maxAmount, product.currency)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Term range</div>
                    <div className="mt-1 font-medium text-slate-900">{product.minTermMonths} - {product.maxTermMonths} months</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Annual rate</div>
                    <div className="mt-1 font-medium text-slate-900">{(Number(product.annualInterestRatePct || 0) * 100).toFixed(2)}%</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Processing fee</div>
                    <div className="mt-1 font-medium text-slate-900">{(Number(product.processingFeePct || 0) * 100).toFixed(2)}%</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Equity requirement</div>
                    <div className="mt-1 font-medium text-slate-900">{(Number(product.equityRequirementPct || 0) * 100).toFixed(0)}%</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Minimum equity</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(product.minimumEquityAmount, product.currency)}</div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Required documents</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {(product.requiredDocuments || []).length
                      ? (product.requiredDocuments || []).map((item) => item.replaceAll("_", " ")).join(", ")
                      : "No required documents configured"}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeProduct ? "Edit loan product" : "Add loan product"}</DialogTitle>
            <DialogDescription>
              Set the range, pricing, and required equity before this product becomes available to borrowers.
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Product name</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Description</Label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  value={form.description}
                  onChange={(e) => setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum amount</Label>
                <Input inputMode="decimal" value={form.minAmount} onChange={(e) => setForm((prev) => (prev ? { ...prev, minAmount: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Maximum amount</Label>
                <Input inputMode="decimal" value={form.maxAmount} onChange={(e) => setForm((prev) => (prev ? { ...prev, maxAmount: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum term (months)</Label>
                <Input inputMode="numeric" value={form.minTermMonths} onChange={(e) => setForm((prev) => (prev ? { ...prev, minTermMonths: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Maximum term (months)</Label>
                <Input inputMode="numeric" value={form.maxTermMonths} onChange={(e) => setForm((prev) => (prev ? { ...prev, maxTermMonths: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Annual interest rate (%)</Label>
                <Input inputMode="decimal" value={form.annualInterestRatePct} onChange={(e) => setForm((prev) => (prev ? { ...prev, annualInterestRatePct: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Processing fee (%)</Label>
                <Input inputMode="decimal" value={form.processingFeePct} onChange={(e) => setForm((prev) => (prev ? { ...prev, processingFeePct: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Equity requirement (%)</Label>
                <Input inputMode="decimal" value={form.equityRequirementPct} onChange={(e) => setForm((prev) => (prev ? { ...prev, equityRequirementPct: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum equity amount</Label>
                <Input inputMode="decimal" value={form.minimumEquityAmount} onChange={(e) => setForm((prev) => (prev ? { ...prev, minimumEquityAmount: e.target.value } : prev))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Required documents</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DOCUMENT_OPTIONS.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.requiredDocuments.includes(value)}
                        onChange={() =>
                          setForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  requiredDocuments: prev.requiredDocuments.includes(value)
                                    ? prev.requiredDocuments.filter((item) => item !== value)
                                    : [...prev.requiredDocuments, value],
                                }
                              : prev
                          )
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Availability</Label>
                <Select
                  value={form.isActive ? "ACTIVE" : "INACTIVE"}
                  onValueChange={(value) => setForm((prev) => (prev ? { ...prev, isActive: value === "ACTIVE" } : prev))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form}>
              {saving ? "Saving..." : activeProduct ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
