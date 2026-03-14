import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { createContribution } from "@/lib/contributionsApi";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getPlanMembers, getPlanSummary, type PlanMembersResponse, type PlanSummaryResponse } from "@/lib/planDetailsApi";
import { listContributions, type Contribution, confirmContribution, type ConfirmContributionPayload } from "@/lib/contributionsApi";
import { listPayouts, markPayoutSent, type Payout } from "@/lib/payoutsApi";
import { submitGatewayPayment, submitManualTransfer } from "@/lib/contributionPaymentsApi";
import { getPlanPaymentOptions, type PlanPaymentOption, type PaymentMethodCode } from "@/lib/paymentOptionsApi";
import { getPauseOptions, listPlanPauses, requestPlanPause, type PauseOptions, type PlanPause } from "@/lib/planPausesApi";
import { CheckCircle2, Clock, Users, Wallet, BadgeCheck } from "lucide-react";


function formatMoney(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function badgeVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "PAID" || s === "SENT") return "default";
  if (s === "PENDING") return "secondary";
  if (s === "LATE" || s === "MISSED" || s === "CANCELLED") return "destructive";
  return "secondary";
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div
        className="h-2 rounded-full bg-slate-700 transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}


type TabKey = "overview" | "members" | "contributions" | "payouts";
type ReceiptData = {
  contributionId: string;
  cycleIndex: number;
  amount: number;
  status: string;
  paymentRef: string | null;
  paidAt: string | null;
};

export default function PlanDetailsPage() {
  const nav = useNavigate();
  const { planId } = useParams();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<TabKey>("overview");

  const [summary, setSummary] = useState<PlanSummaryResponse | null>(null);
  const [members, setMembers] = useState<PlanMembersResponse | null>(null);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const [loading, setLoading] = useState(true);

  // Confirm contribution modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeContrib, setActiveContrib] = useState<Contribution | null>(null);
  const [cStatus, setCStatus] = useState<ConfirmContributionPayload["status"]>("PAID");
  const [cRef, setCRef] = useState("");
  const [cPaidAt, setCPaidAt] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethodCode>("CARD");
  const [paymentOptions, setPaymentOptions] = useState<PlanPaymentOption[]>([]);
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payReceiptUrl, setPayReceiptUrl] = useState("");
  const [payAt, setPayAt] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pauseOptions, setPauseOptions] = useState<PauseOptions | null>(null);
  const [pauseHistory, setPauseHistory] = useState<PlanPause[]>([]);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseMonths, setPauseMonths] = useState("1");
  const [pauseRef, setPauseRef] = useState("");
  const [pauseNote, setPauseNote] = useState("");
  const [pauseSubmitting, setPauseSubmitting] = useState(false);

  // Mark payout sent modal
  const [markOpen, setMarkOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [activePayout, setActivePayout] = useState<Payout | null>(null);
  const [pRef, setPRef] = useState("");
  const [pNote, setPNote] = useState("");
  const [pSentAt, setPSentAt] = useState("");


  const currency = summary?.plan.currency || "GBP";


  const cycleNow = summary?.plan.currentCycleIndex ?? 0;
  const totalCycles = summary?.plan.memberCount ?? 0;
const settledContributionCount = useMemo(
  () => contribs.filter((c) => c.status === "PAID" || c.status === "LATE").length,
  [contribs]
);
const progressPct = totalCycles ? ((Math.min(settledContributionCount, totalCycles) / totalCycles) * 100) : 0;


  const isCompleted = summary?.plan.status === "COMPLETED" || (summary?.plan.currentCycleIndex ?? 0) >= (summary?.plan.memberCount ?? Infinity);


const currentCycleContribution = useMemo(() => {
  // Contribution row for the CURRENT cycle only
  return contribs.find((c) => c.cycleIndex === cycleNow) || null;
}, [contribs, cycleNow]);
const yourPayoutCycleIndex = summary?.you?.payoutCycleIndex ?? -1;
const yourPayoutRecord = useMemo(
  () => payouts.find((p) => p.cycleIndex === yourPayoutCycleIndex) || null,
  [payouts, yourPayoutCycleIndex]
);
const yourPayoutAmount = useMemo(() => {
  if (!summary) return 0;
  return (
    summary.plan.memberCount *
    summary.plan.contributionAmount *
    (1 + Number(summary.plan.positionInterestRate || 0))
  );
}, [summary]);

const canCreateCurrentContribution = !isCompleted && !currentCycleContribution;
const isYourPayoutCycle = (summary?.you?.payoutCycleIndex ?? -1) === cycleNow;
const requiredPaidCyclesForPayout = cycleNow + 1;
const paidCyclesForPayout = useMemo(
  () => contribs.filter((c) => c.cycleIndex <= cycleNow && (c.status === "PAID" || c.status === "LATE")).length,
  [contribs, cycleNow]
);
const payoutEligibilityBlocked = isYourPayoutCycle && paidCyclesForPayout < requiredPaidCyclesForPayout;



  async function loadAll() {
    if (!planId) return;
    setLoading(true);
    try {
      const [s, m, c, p, paymentOptionsRes, pauseOptionsRes, pauseHistoryRes] = await Promise.all([
        getPlanSummary(planId),
        getPlanMembers(planId),
        listContributions(planId),
        listPayouts(planId),
        getPlanPaymentOptions(planId),
        getPauseOptions(planId),
        listPlanPauses(planId),
      ]);
      setSummary(s);
      setMembers(m);
      setContribs(c.items || []);
      setPayouts(p.items || []);
      setPaymentOptions(paymentOptionsRes.methods || []);
      setPauseOptions(pauseOptionsRes);
      setPauseHistory(pauseHistoryRes.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load plan details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "overview" || tabParam === "members" || tabParam === "contributions" || tabParam === "payouts") {
      setTab(tabParam);
    }
  }, [searchParams]);

  function openConfirm(c: Contribution) {
    setActiveContrib(c);
    setCStatus("PAID");
    setCRef("");
    setCPaidAt("");
    setConfirmOpen(true);
  }

  async function onConfirmContribution() {
    if (!planId || !activeContrib) return;

    setConfirming(true);
    try {
      const payload: ConfirmContributionPayload = {
        status: cStatus,
        ...(cRef.trim() ? { paymentRef: cRef.trim() } : {}),
        ...(cPaidAt ? { paidAt: new Date(cPaidAt).toISOString() } : {}),
      };
      await confirmContribution(planId, activeContrib.id, payload);
      toast.success("Contribution updated");
      setConfirmOpen(false);
      setActiveContrib(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to confirm contribution");
    } finally {
      setConfirming(false);
    }
  }

  function openPay(c: Contribution) {
    setActiveContrib(c);
    const firstAvailable = paymentOptions.find((m) => m.availableNow);
    setPayMethod((firstAvailable?.code || "CARD") as PaymentMethodCode);
    setPayRef("");
    setPayNote("");
    setPayReceiptUrl("");
    setPayAt("");
    setPayOpen(true);
  }

  async function onPayContribution() {
    if (!planId || !activeContrib) return;
    const selectedMethod = paymentOptions.find((m) => m.code === payMethod);
    if (!selectedMethod || !selectedMethod.availableNow) {
      toast.error("Selected payment method is currently unavailable.");
      return;
    }
    setPaying(true);
    try {
      if (selectedMethod.submissionMode === "GATEWAY") {
        const ref = payRef.trim() || `GW-${Date.now()}`;
        const res = await submitGatewayPayment(planId, activeContrib.id, {
          providerRef: ref,
          ...(payNote.trim() ? { note: payNote.trim() } : {}),
        });
        setPayOpen(false);
        setReceipt({
          contributionId: res.contribution.id,
          cycleIndex: res.contribution.cycleIndex,
          amount: res.contribution.amount,
          status: res.contribution.status,
          paymentRef: res.contribution.paymentRef,
          paidAt: res.contribution.paidAt,
        });
        setReceiptOpen(true);
        toast.success("Gateway payment captured and posted.");
      } else if (selectedMethod.submissionMode === "BANK_TRANSFER") {
        await submitManualTransfer(planId, activeContrib.id, {
          userReference: payRef.trim(),
          ...(payNote.trim() ? { note: payNote.trim() } : {}),
          ...(payReceiptUrl.trim() ? { receiptUrl: payReceiptUrl.trim() } : {}),
        });
        setPayOpen(false);
        toast.success("Transfer submitted. Admin will review within 24 hours.");
      } else {
        toast.error("This payment method is not yet available.");
        return;
      }
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to process payment");
    } finally {
      setPaying(false);
    }
  }

  function openReceipt(c: Contribution) {
    setReceipt({
      contributionId: c.id,
      cycleIndex: c.cycleIndex,
      amount: c.amount,
      status: c.status,
      paymentRef: c.paymentRef,
      paidAt: c.paidAt,
    });
    setReceiptOpen(true);
  }

  function openMarkSent(p: Payout) {
    setActivePayout(p);
    setPRef("");
    setPNote("");
    setPSentAt("");
    setMarkOpen(true);
  }

  async function onMarkSent() {
    if (!activePayout) return;
    setMarking(true);
    try {
      await markPayoutSent(activePayout.id, {
        ...(pRef.trim() ? { reference: pRef.trim() } : {}),
        ...(pNote.trim() ? { note: pNote.trim() } : {}),
        ...(pSentAt ? { sentAt: new Date(pSentAt).toISOString() } : {}),
      });
      toast.success("Payout marked as SENT");
      setMarkOpen(false);
      setActivePayout(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark payout sent");
    } finally {
      setMarking(false);
    }
  }

  async function onCreateCurrentContribution() {
  if (!planId) return;
  try {
    await createContribution(planId);
    toast.success("Contribution created (PENDING)");
    await loadAll();
    setTab("contributions");
  } catch (e: any) {
    toast.error(e?.message || "Failed to create contribution");
  }
}

  async function onRequestPause() {
    if (!planId || !pauseOptions) return;
    const months = Number(pauseMonths);
    if (!Number.isInteger(months) || months < 1) {
      return toast.error("Pause months must be at least 1.");
    }
    if (months > Number(pauseOptions.maxRequestableMonths || 0)) {
      return toast.error(`Maximum allowable pause months is ${pauseOptions.maxRequestableMonths}.`);
    }

    setPauseSubmitting(true);
    try {
      await requestPlanPause(planId, {
        months,
        ...(pauseRef.trim() ? { paymentRef: pauseRef.trim() } : {}),
        ...(pauseNote.trim() ? { note: pauseNote.trim() } : {}),
      });
      toast.success("Pause request submitted for admin approval.");
      setPauseOpen(false);
      setPauseMonths("1");
      setPauseRef("");
      setPauseNote("");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to request pause");
    } finally {
      setPauseSubmitting(false);
    }
  }


  const pendingPayouts = useMemo(() => payouts.filter((x) => x.status === "PENDING"), [payouts]);
  const selectedPayOption = useMemo(
    () => paymentOptions.find((m) => m.code === payMethod) || null,
    [paymentOptions, payMethod]
  );

  if (!planId) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Missing planId</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => nav("/app/thrift/goals")}>Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold truncate">{summary?.plan.name || "Plan"}</h1>
            {summary?.plan.status && <Badge variant="secondary">{summary.plan.status}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Goal plan details: cycle progress, your payout, contributions and payouts.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>
      {payoutEligibilityBlocked ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Payout for this cycle is blocked until all contributions up to month {requiredPaidCyclesForPayout} are PAID/LATE
          ({paidCyclesForPayout}/{requiredPaidCyclesForPayout} cleared).
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "overview" ? "default" : "outline"} onClick={() => setTab("overview")}>
          Overview
        </Button>
        <Button variant={tab === "members" ? "default" : "outline"} onClick={() => setTab("members")}>
          Member
        </Button>
        <Button variant={tab === "contributions" ? "default" : "outline"} onClick={() => setTab("contributions")}>
          Contributions
        </Button>
        <Button variant={tab === "payouts" ? "default" : "outline"} onClick={() => setTab("payouts")}>
          Payouts {pendingPayouts.length ? <span className="ml-2">({pendingPayouts.length})</span> : null}
        </Button>
      </div>

      {loading && (
        <Card className="rounded-2xl">
          <CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent>
        </Card>
      )}

{!loading && summary && tab === "overview" && (
  <div className="grid gap-4 lg:grid-cols-3">
    {/* Main */}
    <Card className="rounded-2xl lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-700" />
          Cycle progress
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <div className="text-muted-foreground">
              Settled contributions <span className="font-medium text-foreground">{Math.min(settledContributionCount, totalCycles)}</span> of{" "}
              <span className="font-medium text-foreground">{totalCycles}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
              Current cycle month: <span className="font-medium text-foreground">{cycleNow + 1}</span>{" "}
              •{" "}
              Contribution/cycle:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(summary.plan.effectiveContributionAmount ?? summary.plan.contributionAmount, currency)}
              </span>{" "}
              {summary.plan.positionInterestRate != null ? (
                <>
                  • Interest adjustment:{" "}
                  <span className="font-medium text-foreground">
                    {summary.plan.positionInterestRate >= 0 ? "+" : ""}
                    {(summary.plan.positionInterestRate * 100).toFixed(2)}%
                  </span>{" "}
                </>
              ) : null}
              • Pot:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(summary.plan.memberCount * summary.plan.contributionAmount, currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <Badge variant="default" className="gap-1">
                <BadgeCheck className="h-4 w-4" /> Completed
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-4 w-4" /> In progress
              </Badge>
            )}
          </div>
        </div>

        <ProgressBar value={progressPct} />

        {/* Your payout highlight */}
        {summary.you.payoutCycleIndex >= 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  Your payout
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Payout month {summary.you.payoutCycleIndex + 1}
                  {yourPayoutRecord ? (
                    <> • Status: <span className="text-foreground font-medium">{yourPayoutRecord.status}</span></>
                  ) : (
                    <> • Status: <span className="text-foreground font-medium">Pending cycle</span></>
                  )}
                </div>
              </div>

              <div className="text-sm font-semibold">
                {formatMoney(yourPayoutAmount, currency)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
            Your payout information is not available yet.
          </div>
        )}

        {/* Smart CTA row */}
        {!isCompleted && (
          <div className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium">Current cycle action</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentCycleContribution
                    ? `You have a ${currentCycleContribution.status} contribution for this cycle.`
                    : "No contribution created for this cycle yet."}
                </div>
              </div>

              <div className="flex gap-2">
                {!currentCycleContribution ? (
                  <Button onClick={onCreateCurrentContribution} disabled={!canCreateCurrentContribution}>
                    Create due contribution
                  </Button>
                ) : currentCycleContribution.status === "PENDING" ? (
                  <>
                    <Button onClick={() => openPay(currentCycleContribution)}>Pay now</Button>
                    <Button variant="outline" onClick={() => openConfirm(currentCycleContribution)}>
                      Status update
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setTab("contributions")}>
                      View contributions
                    </Button>
                    {(currentCycleContribution.status === "PAID" || currentCycleContribution.status === "LATE") ? (
                      <Button variant="outline" onClick={() => openReceipt(currentCycleContribution)}>
                        Receipt
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Side */}
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-700" />
          You
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div>
          Name: <span className="font-medium">{summary.you.displayName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Position</span>
          <span className="font-medium">{summary.you.position ?? "-"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Your payout cycle</span>
          <Badge variant="secondary">{summary.you.payoutCycleIndex + 1}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Already paid</span>
          <Badge variant={summary.you.alreadyPaid ? "default" : "secondary"}>
            {summary.you.alreadyPaid ? "YES" : "NO"}
          </Badge>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          Payouts created: {summary.stats.payoutsCreated}
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3 space-y-2">
          <div className="text-xs text-slate-500">Pause</div>
          <div className="text-xs text-muted-foreground">
            {pauseOptions?.canRequest
              ? `You can pause up to ${pauseOptions.maxRequestableMonths} month(s). Fee: ${formatMoney(
                  Number(pauseOptions.pauseFeePerMonth || 0),
                  currency
                )} per month.`
              : "Pause is not currently available."}
          </div>
          {pauseOptions?.activePause ? (
            <div className="text-xs text-slate-600">
              Active pause: cycle {pauseOptions.activePause.startCycleIndex + 1} to{" "}
              {pauseOptions.activePause.endCycleIndex + 1}
            </div>
          ) : null}
          {pauseOptions?.pendingPause ? (
            <div className="text-xs text-slate-600">
              Pending request: cycle {pauseOptions.pendingPause.startCycleIndex + 1} to{" "}
              {pauseOptions.pendingPause.endCycleIndex + 1}
            </div>
          ) : null}
          {pauseHistory.length > 0 ? (
            <div className="text-xs text-slate-600">Pause history records: {pauseHistory.length}</div>
          ) : null}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setPauseOpen(true)}
            disabled={!pauseOptions?.canRequest}
          >
            Request Pause
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)}


{!loading && members && tab === "members" && (
  <Card className="rounded-2xl">
    <CardHeader>
      <CardTitle className="text-base">Member Position</CardTitle>
    </CardHeader>

    <CardContent className="p-0">
      {members.items.filter((m) => m.type === "REAL").length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No real members found.</div>
      ) : (
        <div className="divide-y">
          {members.items
            .filter((m) => m.type === "REAL")
            .map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-4 transition hover:bg-slate-50 bg-white"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {m.displayName} <Badge className="ml-2" variant="default">You</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Position {m.position}
                  </div>
                </div>

                <Badge variant="secondary">ACTIVE</Badge>
              </div>
            ))}
        </div>
      )}
    </CardContent>
  </Card>
)}

      {!loading && tab === "contributions" && (
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contributions</CardTitle>
            {canCreateCurrentContribution ? (
              <Button onClick={onCreateCurrentContribution}>Add contribution</Button>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            {contribs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No contributions yet.</div>
            ) : (
              <div className="divide-y">
                {contribs.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">Cycle {c.cycleIndex + 1}</div>
                        <Badge variant={badgeVariant(c.status)}>{c.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Amount: {formatMoney(c.amount, currency)}
                        {c.paymentRef ? ` • Ref: ${c.paymentRef}` : ""}
                        {c.paidAt ? ` • Paid: ${new Date(c.paidAt).toLocaleDateString()}` : ""}
                        {c.creditsAwarded ? ` • Credits: ${c.creditsAwarded}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.status === "PENDING" ? (
                        <>
                          <Button onClick={() => openPay(c)}>Pay now</Button>
                          <Button variant="outline" onClick={() => openConfirm(c)}>
                            Status update
                          </Button>
                        </>
                      ) : null}
                      {(c.status === "PAID" || c.status === "LATE") ? (
                        <Button variant="outline" onClick={() => openReceipt(c)}>
                          Receipt
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && tab === "payouts" && (
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Payouts</CardTitle>
            <div className="text-xs text-muted-foreground">Pending: {pendingPayouts.length}</div>
          </CardHeader>
          <CardContent className="p-0">
            {payouts.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No payouts yet.</div>
            ) : (
              <div className="divide-y">
{payouts.map((p) => {
  const isYourPayout = summary?.you?.payoutCycleIndex === p.cycleIndex;

  return (
    <div
      key={p.id}
      className={`flex flex-col gap-2 p-4 transition hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between ${
        isYourPayout ? "bg-slate-100" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium">Cycle {p.cycleIndex + 1}</div>

          <Badge variant={badgeVariant(p.status)}>{p.status}</Badge>
          {isYourPayout ? (
            <Badge className="ml-2" variant="default">
              Your payout
            </Badge>
          ) : null}
        </div>

        <div className="text-xs text-muted-foreground">
          {p.sentAt ? `Sent: ${new Date(p.sentAt).toLocaleDateString()}` : "Awaiting release"}
          {p.reference ? ` • Ref: ${p.reference}` : ""}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold">
          {formatMoney(p.amount, p.currency || currency)}
        </div>

        {p.status === "PENDING" && p.recipientType !== "VIRTUAL" ? (
          <Button variant="outline" onClick={() => openMarkSent(p)}>
            Mark sent
          </Button>
        ) : null}
      </div>
    </div>
  );
})}

              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm contribution modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm contribution</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {activeContrib ? `Cycle ${activeContrib.cycleIndex + 1} • ${formatMoney(activeContrib.amount, currency)}` : ""}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={cStatus}
                onChange={(e) => setCStatus(e.target.value as any)}
              >
                <option value="PAID">PAID</option>
                <option value="LATE">LATE</option>
                <option value="MISSED">MISSED</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Payment reference (optional)</Label>
              <Input value={cRef} onChange={(e) => setCRef(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Paid at (optional)</Label>
              <Input type="datetime-local" value={cPaidAt} onChange={(e) => setCPaidAt(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={confirming}>
                Cancel
              </Button>
              <Button onClick={onConfirmContribution} disabled={confirming}>
                {confirming ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay contribution modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pay contribution</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3 text-sm">
              {activeContrib ? `Cycle ${activeContrib.cycleIndex + 1} • ${formatMoney(activeContrib.amount, currency)} is due.` : ""}
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <select
                className="h-10 w-full rounded-md border border-sky-200 bg-white px-3 text-sm"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethodCode)}
              >
                {paymentOptions.map((opt) => (
                  <option key={opt.code} value={opt.code} disabled={!opt.availableNow}>
                    {opt.label}
                    {!opt.availableNow ? " (Coming soon)" : ""}
                  </option>
                ))}
              </select>
              <div className="text-xs text-muted-foreground">
                {selectedPayOption?.description || "Choose a payment method."}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {selectedPayOption?.submissionMode === "GATEWAY" ? "Provider reference (optional)" : "Transfer reference"}
              </Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder={
                  selectedPayOption?.submissionMode === "GATEWAY" ? "Provider ref" : "Bank transfer reference"
                }
              />
            </div>

            {selectedPayOption?.submissionMode === "BANK_TRANSFER" ? (
              <div className="space-y-2">
                <Label>Receipt URL (optional)</Label>
                <Input value={payReceiptUrl} onChange={(e) => setPayReceiptUrl(e.target.value)} placeholder="https://..." />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Any note" />
            </div>

            {selectedPayOption?.submissionMode === "GATEWAY" ? (
              <div className="space-y-2">
                <Label>Paid at (optional)</Label>
                <Input type="datetime-local" value={payAt} onChange={(e) => setPayAt(e.target.value)} />
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paying}>
                Cancel
              </Button>
              <Button
                onClick={onPayContribution}
                disabled={
                  paying ||
                  !selectedPayOption ||
                  !selectedPayOption.availableNow ||
                  (selectedPayOption.submissionMode === "BANK_TRANSFER" && !payRef.trim())
                }
              >
                {paying
                  ? "Processing..."
                  : selectedPayOption?.submissionMode === "BANK_TRANSFER"
                  ? "Submit transfer for review"
                  : "Pay and confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt modal */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Pause</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3 text-sm">
              {pauseOptions
                ? `Max allowable pause: ${pauseOptions.maxRequestableMonths} month(s) • Fee: ${formatMoney(
                    Number(pauseOptions.pauseFeePerMonth || 0),
                    currency
                  )} per month`
                : "Loading pause options..."}
            </div>

            <div className="space-y-2">
              <Label>Pause months</Label>
              <Input
                inputMode="numeric"
                value={pauseMonths}
                onChange={(e) => setPauseMonths(e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment reference (optional)</Label>
              <Input value={pauseRef} onChange={(e) => setPauseRef(e.target.value)} placeholder="PAUSE-REF-001" />
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={pauseNote} onChange={(e) => setPauseNote(e.target.value)} placeholder="Any note" />
            </div>

            <div className="text-xs text-muted-foreground">
              Total pause fee:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(
                  Math.max(0, Number(pauseMonths || 0)) * Number(pauseOptions?.pauseFeePerMonth || 0),
                  currency
                )}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPauseOpen(false)} disabled={pauseSubmitting}>
                Cancel
              </Button>
              <Button onClick={onRequestPause} disabled={pauseSubmitting || !pauseOptions?.canRequest}>
                {pauseSubmitting ? "Submitting..." : "Pay Fee and Pause"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment receipt</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Contribution ID</span>
                <span className="font-mono text-xs">{receipt?.contributionId || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cycle</span>
                <span className="font-medium">{receipt ? receipt.cycleIndex + 1 : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium">{formatMoney(Number(receipt?.amount || 0), currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <Badge variant={badgeVariant(String(receipt?.status || "PENDING"))}>{receipt?.status || "—"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Reference</span>
                <span className="font-medium">{receipt?.paymentRef || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Paid at</span>
                <span className="font-medium">
                  {receipt?.paidAt ? new Date(receipt.paidAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setReceiptOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark payout sent modal */}
      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark payout as sent</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {activePayout
                ? `Cycle ${activePayout.cycleIndex + 1} • ${formatMoney(activePayout.amount, currency)}`
                : ""}
            </div>

            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input value={pRef} onChange={(e) => setPRef(e.target.value)} placeholder="Bank ref" />
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={pNote} onChange={(e) => setPNote(e.target.value)} placeholder="Any note" />
            </div>

            <div className="space-y-2">
              <Label>Sent at (optional)</Label>
              <Input type="datetime-local" value={pSentAt} onChange={(e) => setPSentAt(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMarkOpen(false)} disabled={marking}>
                Cancel
              </Button>
              <Button onClick={onMarkSent} disabled={marking}>
                {marking ? "Saving…" : "Mark sent"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
