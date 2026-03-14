import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCurrentAdminRuleConfig,
  updateCurrentAdminRuleConfig,
  type AdminRuleConfig,
} from "@/lib/adminConfigApi";
import { listAdminInvestProducts, updateAdminInvestProduct, type InvestmentProduct } from "@/lib/investApi";

type FormState = {
  maxDisposableCommitmentPct: string;
  positionEarlyChargePct: string;
  positionLateCompensationPct: string;
  swapFactor: string;
  swapDiscountRate: string;
  feeFloorAmount: string;
  maxSwapsPerPlan: string;
  missedPaymentCredits: string;
  postPayoutMissedPenaltyMultiplier: string;
  contributionsCountryCode: string;
  contributionsEnabledPaymentMethods: Array<"CARD" | "PAY_BY_BANK" | "DIRECT_DEBIT" | "BANK_TRANSFER_MANUAL">;
  pauseFeatureEnabled: boolean;
  pauseFeePerMonth: string;
  maxPauseMonths: string;
};

function toForm(rule: AdminRuleConfig): FormState {
  return {
    maxDisposableCommitmentPct: String(rule.maxDisposableCommitmentPct),
    positionEarlyChargePct: String(rule.positionEarlyChargePct),
    positionLateCompensationPct: String(rule.positionLateCompensationPct),
    swapFactor: String(rule.swapFactor),
    swapDiscountRate: String(rule.swapDiscountRate),
    feeFloorAmount: String(rule.feeFloorAmount),
    maxSwapsPerPlan: String(rule.maxSwapsPerPlan),
    missedPaymentCredits: String(rule.missedPaymentCredits),
    postPayoutMissedPenaltyMultiplier: String(rule.postPayoutMissedPenaltyMultiplier),
    contributionsCountryCode: String(rule.contributionsCountryCode || "GB"),
    contributionsEnabledPaymentMethods: rule.contributionsEnabledPaymentMethods || [
      "CARD",
      "PAY_BY_BANK",
      "DIRECT_DEBIT",
      "BANK_TRANSFER_MANUAL",
    ],
    pauseFeatureEnabled: Boolean(rule.pauseFeatureEnabled),
    pauseFeePerMonth: String(rule.pauseFeePerMonth ?? 0),
    maxPauseMonths: String(rule.maxPauseMonths ?? 0),
  };
}

export default function AdminRulesSettings() {
  const [rule, setRule] = useState<AdminRuleConfig | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [investProducts, setInvestProducts] = useState<InvestmentProduct[]>([]);
  const [savingInvestId, setSavingInvestId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [res, investRes] = await Promise.all([getCurrentAdminRuleConfig(), listAdminInvestProducts()]);
      setRule(res.rule);
      setForm(toForm(res.rule));
      setInvestProducts(investRes.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load rules");
      setRule(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveInvestRate(product: InvestmentProduct) {
    setSavingInvestId(product.id);
    try {
      const res = await updateAdminInvestProduct(product.id, {
        annualRatePct: Number(product.annualRatePct),
        minMonths: Number(product.minMonths),
        maxMonths: Number(product.maxMonths),
        isActive: Boolean(product.isActive),
      });
      setInvestProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)));
      toast.success(`${product.name} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update investment product");
    } finally {
      setSavingInvestId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave() {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        maxDisposableCommitmentPct: Number(form.maxDisposableCommitmentPct),
        positionEarlyChargePct: Number(form.positionEarlyChargePct),
        positionLateCompensationPct: Number(form.positionLateCompensationPct),
        swapFactor: Number(form.swapFactor),
        swapDiscountRate: Number(form.swapDiscountRate),
        feeFloorAmount: Number(form.feeFloorAmount),
        maxSwapsPerPlan: Number(form.maxSwapsPerPlan),
        missedPaymentCredits: Number(form.missedPaymentCredits),
        postPayoutMissedPenaltyMultiplier: Number(form.postPayoutMissedPenaltyMultiplier),
        contributionsCountryCode: form.contributionsCountryCode.trim().toUpperCase(),
        contributionsEnabledPaymentMethods: form.contributionsEnabledPaymentMethods,
        pauseFeatureEnabled: form.pauseFeatureEnabled,
        pauseFeePerMonth: Number(form.pauseFeePerMonth),
        maxPauseMonths: Number(form.maxPauseMonths),
      };
      const res = await updateCurrentAdminRuleConfig(payload);
      setRule(res.rule);
      setForm(toForm(res.rule));
      toast.success("Rules updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update rules");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }
  function setBooleanField<K extends keyof FormState>(key: K, value: boolean) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function togglePaymentMethod(method: "CARD" | "PAY_BY_BANK" | "DIRECT_DEBIT" | "BANK_TRANSFER_MANUAL") {
    setForm((prev) => {
      if (!prev) return prev;
      const exists = prev.contributionsEnabledPaymentMethods.includes(method);
      const next = exists
        ? prev.contributionsEnabledPaymentMethods.filter((m) => m !== method)
        : [...prev.contributionsEnabledPaymentMethods, method];
      return { ...prev, contributionsEnabledPaymentMethods: next };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pricing & Rules</h1>
          <p className="text-sm text-muted-foreground">
            Configure interest, discounts, and charges used by MyContributions.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading || saving}>
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            Current Rule Config {rule ? `(v${rule.version})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !form ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Early position charge (%)</Label>
                <Input
                  value={form.positionEarlyChargePct}
                  onChange={(e) => setField("positionEarlyChargePct", e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Late position compensation (%)</Label>
                <Input
                  value={form.positionLateCompensationPct}
                  onChange={(e) => setField("positionLateCompensationPct", e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Swap base factor</Label>
                <Input
                  value={form.swapFactor}
                  onChange={(e) => setField("swapFactor", e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Swap discount rate</Label>
                <Input
                  value={form.swapDiscountRate}
                  onChange={(e) => setField("swapDiscountRate", e.target.value)}
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Swap fee floor amount</Label>
                <Input
                  value={form.feeFloorAmount}
                  onChange={(e) => setField("feeFloorAmount", e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max swaps per plan</Label>
                <Input
                  value={form.maxSwapsPerPlan}
                  onChange={(e) => setField("maxSwapsPerPlan", e.target.value)}
                  type="number"
                  step="1"
                  min="0"
                  max="24"
                />
              </div>
              <div className="space-y-2">
                <Label>Missed payment penalty credits</Label>
                <Input
                  value={form.missedPaymentCredits}
                  onChange={(e) => setField("missedPaymentCredits", e.target.value)}
                  type="number"
                  step="1"
                  max="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Post-payout missed multiplier</Label>
                <Input
                  value={form.postPayoutMissedPenaltyMultiplier}
                  onChange={(e) => setField("postPayoutMissedPenaltyMultiplier", e.target.value)}
                  type="number"
                  step="0.1"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Affordability limit (%)</Label>
                <Input
                  value={form.maxDisposableCommitmentPct}
                  onChange={(e) => setField("maxDisposableCommitmentPct", e.target.value)}
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Country code (MyContributions)</Label>
                <Input
                  value={form.contributionsCountryCode}
                  onChange={(e) => setField("contributionsCountryCode", e.target.value)}
                  placeholder="GB"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Enabled payment methods (MyContributions)</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ["CARD", "Card"],
                    ["PAY_BY_BANK", "Pay by Bank"],
                    ["DIRECT_DEBIT", "Direct Debit"],
                    ["BANK_TRANSFER_MANUAL", "Manual Bank Transfer"],
                  ].map(([code, label]) => (
                    <label key={code} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.contributionsEnabledPaymentMethods.includes(
                          code as "CARD" | "PAY_BY_BANK" | "DIRECT_DEBIT" | "BANK_TRANSFER_MANUAL"
                        )}
                        onChange={() =>
                          togglePaymentMethod(
                            code as "CARD" | "PAY_BY_BANK" | "DIRECT_DEBIT" | "BANK_TRANSFER_MANUAL"
                          )
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pause feature enabled</Label>
                <label className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.pauseFeatureEnabled}
                    onChange={(e) => setBooleanField("pauseFeatureEnabled", e.target.checked)}
                  />
                  <span>Allow post-payout pause requests</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label>Pause fee per month</Label>
                <Input
                  value={form.pauseFeePerMonth}
                  onChange={(e) => setField("pauseFeePerMonth", e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max pause months</Label>
                <Input
                  value={form.maxPauseMonths}
                  onChange={(e) => setField("maxPauseMonths", e.target.value)}
                  type="number"
                  step="1"
                  min="0"
                  max="24"
                />
              </div>
            </div>
          )}
          <div className="mt-6">
            <Button onClick={onSave} disabled={loading || saving || !form}>
              {saving ? "Saving..." : "Save rules"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Investment Product Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : investProducts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No investment products available.</div>
          ) : (
            <div className="space-y-3">
              {investProducts.map((p) => (
                <div key={p.id} className="grid gap-3 rounded-xl border border-indigo-100 bg-white p-3 md:grid-cols-5">
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.key}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Annual Rate %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={p.annualRatePct}
                      onChange={(e) =>
                        setInvestProducts((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, annualRatePct: Number(e.target.value) } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Min Months</Label>
                    <Input
                      type="number"
                      step="1"
                      value={p.minMonths}
                      onChange={(e) =>
                        setInvestProducts((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, minMonths: Number(e.target.value) } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Months</Label>
                    <Input
                      type="number"
                      step="1"
                      value={p.maxMonths}
                      onChange={(e) =>
                        setInvestProducts((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, maxMonths: Number(e.target.value) } : x))
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-5 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(p.isActive)}
                        onChange={(e) =>
                          setInvestProducts((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, isActive: e.target.checked } : x))
                          )
                        }
                      />
                      Active
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingInvestId === p.id}
                      onClick={() => saveInvestRate(p)}
                    >
                      {savingInvestId === p.id ? "Saving..." : "Save Product"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
