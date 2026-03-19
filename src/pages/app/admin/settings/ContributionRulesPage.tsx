import { useEffect, useMemo, useState } from "react";
import { Banknote, Percent, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentAdminRuleConfig, updateCurrentAdminRuleConfig, type AdminRuleConfig } from "@/lib/adminConfigApi";

import { AdminSetupIntro, PAYMENT_METHOD_OPTIONS, RuleField, SummaryTile } from "./shared";

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

export default function ContributionRulesPage() {
  const [rule, setRule] = useState<AdminRuleConfig | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getCurrentAdminRuleConfig();
      setRule(res.rule);
      setForm(toForm(res.rule));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load contribution rules");
      setRule(null);
      setForm(null);
    } finally {
      setLoading(false);
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
      toast.success("Contribution rules updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update contribution rules");
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
        ? prev.contributionsEnabledPaymentMethods.filter((item) => item !== method)
        : [...prev.contributionsEnabledPaymentMethods, method];
      return { ...prev, contributionsEnabledPaymentMethods: next };
    });
  }

  const ruleSummary = useMemo(() => {
    if (!rule) return null;
    return {
      version: `v${rule.version}`,
      paymentMethods: rule.contributionsEnabledPaymentMethods.length,
      pauseEnabled: rule.pauseFeatureEnabled ? "Enabled" : "Disabled",
      country: rule.contributionsCountryCode || "—",
    };
  }, [rule]);

  return (
    <div className="space-y-6">
      <AdminSetupIntro
        badge="Admin Setup / MyContributions"
        title="MyContributions pricing & rules"
        description="Manage contribution pricing, affordability controls, payment options, and pause behaviour."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Rule version" value={ruleSummary?.version || "—"} hint="Currently active rule set" icon={Settings2} />
        <SummaryTile
          label="Affordability limit"
          value={rule ? `${Math.round(rule.maxDisposableCommitmentPct * 100)}%` : "—"}
          hint="Disposable income cap"
          icon={Percent}
        />
        <SummaryTile
          label="Payment methods"
          value={ruleSummary?.paymentMethods || 0}
          hint={`Country ${ruleSummary?.country || "—"}`}
          icon={Banknote}
        />
        <SummaryTile label="Pause feature" value={ruleSummary?.pauseEnabled || "—"} hint="Post-payout pause control" icon={RefreshCw} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-slate-950">Contribution rules</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Configure pricing, swap behaviour, penalties, affordability checks, and payment availability.
            </p>
          </div>
          <Button variant="outline" className="bg-white" onClick={load} disabled={loading || saving}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading || !form ? (
            <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-slate-500">Loading contribution rules…</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <RuleField label="Early position charge (%)" hint="Charge applied to earlier payout positions">
                  <Input value={form.positionEarlyChargePct} onChange={(e) => setField("positionEarlyChargePct", e.target.value)} type="number" step="0.01" min="0" max="0.5" />
                </RuleField>
                <RuleField label="Late position compensation (%)" hint="Compensation applied to later payout positions">
                  <Input value={form.positionLateCompensationPct} onChange={(e) => setField("positionLateCompensationPct", e.target.value)} type="number" step="0.01" min="0" max="0.5" />
                </RuleField>
                <RuleField label="Affordability limit (%)" hint="Maximum disposable income commitment ratio">
                  <Input value={form.maxDisposableCommitmentPct} onChange={(e) => setField("maxDisposableCommitmentPct", e.target.value)} type="number" step="0.01" min="0.1" max="1" />
                </RuleField>
                <RuleField label="Swap base factor">
                  <Input value={form.swapFactor} onChange={(e) => setField("swapFactor", e.target.value)} type="number" step="0.01" min="0" />
                </RuleField>
                <RuleField label="Swap discount rate">
                  <Input value={form.swapDiscountRate} onChange={(e) => setField("swapDiscountRate", e.target.value)} type="number" step="0.0001" min="0" max="1" />
                </RuleField>
                <RuleField label="Swap fee floor amount">
                  <Input value={form.feeFloorAmount} onChange={(e) => setField("feeFloorAmount", e.target.value)} type="number" step="0.01" min="0" />
                </RuleField>
                <RuleField label="Max swaps per plan">
                  <Input value={form.maxSwapsPerPlan} onChange={(e) => setField("maxSwapsPerPlan", e.target.value)} type="number" step="1" min="0" max="24" />
                </RuleField>
                <RuleField label="Missed payment penalty credits">
                  <Input value={form.missedPaymentCredits} onChange={(e) => setField("missedPaymentCredits", e.target.value)} type="number" step="1" max="0" />
                </RuleField>
                <RuleField label="Post-payout missed multiplier">
                  <Input value={form.postPayoutMissedPenaltyMultiplier} onChange={(e) => setField("postPayoutMissedPenaltyMultiplier", e.target.value)} type="number" step="0.1" min="1" />
                </RuleField>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                <RuleField label="Country code" hint="Used to load country-specific payment methods for MyContributions">
                  <Input value={form.contributionsCountryCode} onChange={(e) => setField("contributionsCountryCode", e.target.value)} placeholder="GB" maxLength={2} />
                </RuleField>
                <RuleField label="Enabled payment methods" hint="Choose which payment methods should appear for contribution funding">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PAYMENT_METHOD_OPTIONS.map(([code, label]) => (
                      <label key={code} className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.contributionsEnabledPaymentMethods.includes(code)}
                          onChange={() => togglePaymentMethod(code)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </RuleField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <RuleField label="Pause feature enabled">
                  <label className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                    <input type="checkbox" checked={form.pauseFeatureEnabled} onChange={(e) => setBooleanField("pauseFeatureEnabled", e.target.checked)} />
                    <span>Allow post-payout pause requests</span>
                  </label>
                </RuleField>
                <RuleField label="Pause fee per month">
                  <Input value={form.pauseFeePerMonth} onChange={(e) => setField("pauseFeePerMonth", e.target.value)} type="number" step="0.01" min="0" />
                </RuleField>
                <RuleField label="Max pause months">
                  <Input value={form.maxPauseMonths} onChange={(e) => setField("maxPauseMonths", e.target.value)} type="number" step="1" min="0" max="24" />
                </RuleField>
              </div>

              <div className="flex justify-end">
                <Button onClick={onSave} disabled={loading || saving || !form}>
                  {saving ? "Saving..." : "Save rules"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
