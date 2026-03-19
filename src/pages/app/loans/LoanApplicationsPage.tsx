import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CreditCard, Download, FileUp, HandCoins, Info, LoaderCircle, PencilLine, Plus, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import {
  createLoanApplicationDraft,
  deleteLoanDocument,
  downloadLoanDocument,
  getLoanEquityPaymentOptions,
  listLoanApplications,
  listLoanProducts,
  listLoanEquityPayments,
  respondToLoanInfoRequest,
  submitLoanApplication,
  submitLoanEquityGatewayPayment,
  submitLoanEquityManualPayment,
  updateLoanApplication,
  uploadLoanDocument,
  type LoanApplication,
  type LoanDocumentType,
  type LoanProduct,
} from "@/lib/loansApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FormState = {
  productId: string;
  amountRequested: string;
  termMonths: string;
  purpose: string;
  employmentStatus: string;
  employerName: string;
  businessName: string;
  monthlyIncomeSnapshot: string;
  monthlyExpenseSnapshot: string;
  applicantNote: string;
};

const DOCUMENT_OPTIONS: Array<{ value: LoanDocumentType; label: string }> = [
  { value: "IDENTITY", label: "Identity document" },
  { value: "EMPLOYMENT_EVIDENCE", label: "Employment evidence" },
  { value: "BANK_STATEMENT", label: "Last 3 months statement" },
  { value: "BUSINESS_PROOF", label: "Business evidence" },
  { value: "ADDRESS_PROOF", label: "Address proof" },
  { value: "OTHER", label: "Other supporting document" },
];

function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function emptyForm(products: LoanProduct[]): FormState {
  return {
    productId: products[0]?.id || "",
    amountRequested: "",
    termMonths: "",
    purpose: "",
    employmentStatus: "",
    employerName: "",
    businessName: "",
    monthlyIncomeSnapshot: "",
    monthlyExpenseSnapshot: "",
    applicantNote: "",
  };
}

function applicationToForm(item: LoanApplication): FormState {
  return {
    productId: item.product.id,
    amountRequested: item.amountRequested ? String(item.amountRequested) : "",
    termMonths: item.termMonths ? String(item.termMonths) : "",
    purpose: item.purpose || "",
    employmentStatus: item.employmentStatus || "",
    employerName: item.employerName || "",
    businessName: item.businessName || "",
    monthlyIncomeSnapshot: item.monthlyIncomeSnapshot != null ? String(item.monthlyIncomeSnapshot) : "",
    monthlyExpenseSnapshot: item.monthlyExpenseSnapshot != null ? String(item.monthlyExpenseSnapshot) : "",
    applicantNote: item.applicantNote || "",
  };
}

function statusTone(status: LoanApplication["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  if (status === "MORE_INFO_REQUIRED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "SUBMITTED") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (status === "DRAFT") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusLabel(status: LoanApplication["status"]) {
  if (status === "MORE_INFO_REQUIRED") return "More info required";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  if (status === "IN_REVIEW") return "In review";
  return "Draft";
}

export default function LoanApplicationsPage() {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeApplication, setActiveApplication] = useState<LoanApplication | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm([]));
  const [documentType, setDocumentType] = useState<LoanDocumentType>("BANK_STATEMENT");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<
    Array<{ code: "STRIPE_CARD" | "BANK_TRANSFER_MANUAL"; label: string; description: string; submissionMode: "GATEWAY" | "BANK_TRANSFER" }>
  >([]);
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE_CARD" | "BANK_TRANSFER_MANUAL">("STRIPE_CARD");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [responseNote, setResponseNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, applicationsRes] = await Promise.all([listLoanProducts(), listLoanApplications()]);
      setProducts(productsRes.items || []);
      setApplications(applicationsRes.items || []);
      if (!dialogOpen) {
        setForm(emptyForm(productsRes.items || []));
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan applications");
    } finally {
      setLoading(false);
    }
  }, [dialogOpen]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const drafts = applications.filter((item) => item.status === "DRAFT").length;
    const submitted = applications.filter((item) => item.status === "SUBMITTED").length;
    const moreInfo = applications.filter((item) => item.status === "MORE_INFO_REQUIRED").length;
    const approved = applications.filter((item) => item.status === "APPROVED").length;
    return { drafts, submitted, moreInfo, approved };
  }, [applications]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === form.productId) || null,
    [products, form.productId]
  );
  const selectedPaymentMethod = useMemo(
    () => paymentOptions.find((item) => item.code === paymentMethod) || null,
    [paymentOptions, paymentMethod]
  );

  function openNew() {
    setActiveApplication(null);
    setForm(emptyForm(products));
    setDocumentType("BANK_STATEMENT");
    setSelectedFile(null);
    setPaymentOptions([]);
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNote("");
    setResponseNote("");
    setDialogOpen(true);
  }

  function openExisting(item: LoanApplication) {
    setActiveApplication(item);
    setForm(applicationToForm(item));
    setDocumentType("BANK_STATEMENT");
    setSelectedFile(null);
    setPaymentAmount(item.equity.remainingAmount > 0 ? String(item.equity.remainingAmount.toFixed(2)) : "");
    setPaymentReference("");
    setPaymentNote("");
    setResponseNote("");
    setDialogOpen(true);
  }

  const canEditCurrent = !activeApplication || ["DRAFT", "MORE_INFO_REQUIRED"].includes(activeApplication.status);
  const canSubmitCurrent =
    !!activeApplication &&
    ["DRAFT", "MORE_INFO_REQUIRED"].includes(activeApplication.status) &&
    activeApplication.documents.length > 0;

  async function refreshApplicationState(applicationId: string) {
    const res = await listLoanApplications();
    setApplications(res.items || []);
    const latest = (res.items || []).find((item) => item.id === applicationId) || null;
    setActiveApplication(latest);
    return latest;
  }

  useEffect(() => {
    const applicationId = activeApplication?.id;
    async function loadWallet() {
      if (!applicationId || !dialogOpen) return;
      setLoadingWallet(true);
      try {
        const [optionsRes, walletRes] = await Promise.all([
          getLoanEquityPaymentOptions(applicationId),
          listLoanEquityPayments(applicationId),
        ]);
        setPaymentOptions(optionsRes.methods || []);
        if (optionsRes.methods?.length) {
          setPaymentMethod(optionsRes.methods[0].code);
        }
        setActiveApplication((current) =>
          current
            ? {
                ...current,
                equity: walletRes.equity,
                equityContributions: walletRes.contributions,
                equityPayments: walletRes.payments,
              }
            : current
        );
      } catch (e: any) {
        toast.error(e?.message || "Failed to load equity wallet");
      } finally {
        setLoadingWallet(false);
      }
    }
    loadWallet();
  }, [activeApplication?.id, dialogOpen]);

  async function saveDraft(e: FormEvent) {
    e.preventDefault();
    if (!form.productId) {
      toast.error("Select a loan product first.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        productId: form.productId,
        amountRequested: Number(form.amountRequested),
        termMonths: Number(form.termMonths),
        purpose: form.purpose,
        employmentStatus: form.employmentStatus || undefined,
        employerName: form.employerName || undefined,
        businessName: form.businessName || undefined,
        monthlyIncomeSnapshot: form.monthlyIncomeSnapshot ? Number(form.monthlyIncomeSnapshot) : undefined,
        monthlyExpenseSnapshot: form.monthlyExpenseSnapshot ? Number(form.monthlyExpenseSnapshot) : undefined,
        applicantNote: form.applicantNote || undefined,
      };

      const res = activeApplication
        ? await updateLoanApplication(activeApplication.id, payload)
        : await createLoanApplicationDraft(payload);

      setActiveApplication(res.item);
      setForm(applicationToForm(res.item));
      toast.success(activeApplication ? "Loan draft updated." : "Loan draft created. Upload your supporting documents next.");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument() {
    if (!activeApplication) {
      toast.error("Save the application draft before uploading documents.");
      return;
    }
    if (!selectedFile) {
      toast.error("Choose a file to upload.");
      return;
    }

    setUploading(true);
    try {
      await uploadLoanDocument(activeApplication.id, {
        documentType,
        file: selectedFile,
      });
      setSelectedFile(null);
      toast.success("Document uploaded.");
      await refreshApplicationState(activeApplication.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(documentId: string) {
    if (!activeApplication) return;
    try {
      await deleteLoanDocument(activeApplication.id, documentId);
      toast.success("Document removed.");
      await refreshApplicationState(activeApplication.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove document");
    }
  }

  async function submitEquityPayment() {
    if (!activeApplication) {
      toast.error("Save your loan draft first.");
      return;
    }
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid equity amount.");
      return;
    }

    setSubmittingPayment(true);
    try {
      if (selectedPaymentMethod?.submissionMode === "BANK_TRANSFER") {
        if (!paymentReference.trim()) {
          toast.error("Enter your transfer reference.");
          return;
        }
        await submitLoanEquityManualPayment(activeApplication.id, {
          amount,
          userReference: paymentReference.trim(),
          note: paymentNote.trim() || undefined,
        });
        toast.success("Manual equity payment submitted for admin confirmation.");
      } else {
        await submitLoanEquityGatewayPayment(activeApplication.id, {
          amount,
          providerRef: paymentReference.trim() || undefined,
          note: paymentNote.trim() || undefined,
        });
        toast.success("Equity payment confirmed.");
      }

      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNote("");
      await refreshApplicationState(activeApplication.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit equity payment");
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function sendApplication() {
    if (!activeApplication) return;
    try {
      const res = await submitLoanApplication(activeApplication.id);
      toast.success("Loan application submitted to admin.");
      setActiveApplication(res.item);
      await load();
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit application");
    }
  }

  async function submitResponseUpdate() {
    if (!activeApplication) return;
    if (responseNote.trim().length < 3) {
      toast.error("Add a short response note before resubmitting.");
      return;
    }
    try {
      const res = await respondToLoanInfoRequest(activeApplication.id, { note: responseNote.trim() });
      toast.success("Update sent back to admin.");
      setActiveApplication(res.item);
      setResponseNote("");
      await load();
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to resubmit update");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Loan applications</h1>
          <p className="text-sm text-slate-500">
            Choose a loan product, complete your request, and upload supporting documents before admin review.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Start loan request
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">Drafts</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{stats.drafts}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">Submitted</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">Needs action</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{stats.moreInfo}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
          <CardContent className="p-5">
            <div className="text-sm text-slate-500">Approved</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{stats.approved}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm dashboard-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Your requests</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Keep your application complete with supporting documents so admin can review quickly.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-sm text-slate-600">
              No loan requests yet. Start with a draft, upload your documents, then submit to admin for review.
            </div>
          ) : (
            applications.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-slate-950">{item.product.name}</div>
                      <Badge className={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                      {formatMoney(item.amountRequested, item.product.currency)} over {item.termMonths} months
                    </div>
                    <div className="text-sm text-slate-600">{item.purpose}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.equity.remainingAmount > 0 ? (
                      <Button variant="outline" onClick={() => openExisting(item)}>
                        <WalletCards className="h-4 w-4" />
                        Fund equity
                      </Button>
                    ) : null}
                    {["DRAFT", "MORE_INFO_REQUIRED"].includes(item.status) ? (
                      <Button variant="outline" onClick={() => openExisting(item)}>
                        <PencilLine className="h-4 w-4" />
                        Continue
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => openExisting(item)}>
                        <Info className="h-4 w-4" />
                        View details
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Documents</div>
                    <div className="mt-1 font-medium text-slate-900">{item.documents.length}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Required equity</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.requiredAmount, item.product.currency)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Funded</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.confirmedAmount, item.product.currency)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Pending</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.pendingAmount, item.product.currency)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Remaining</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.remainingAmount, item.product.currency)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Submitted</div>
                    <div className="mt-1 font-medium text-slate-900">{formatDate(item.submittedAt)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Reviewed</div>
                    <div className="mt-1 font-medium text-slate-900">{formatDate(item.reviewedAt)}</div>
                  </div>
                </div>

                {item.reviewNote ? (
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Admin note</div>
                    <div className="mt-1">{item.reviewNote}</div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{activeApplication ? "Manage loan application" : "Start a loan request"}</DialogTitle>
            <DialogDescription>
              Save your details first, then upload supporting documents before submitting to admin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form className="space-y-4" onSubmit={saveDraft}>
              {activeApplication?.reviewNote && activeApplication.status === "MORE_INFO_REQUIRED" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-medium">Admin requested more information</div>
                  <div className="mt-1">{activeApplication.reviewNote}</div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Loan product</Label>
                  <Select
                    value={form.productId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, productId: value }))}
                    disabled={!canEditCurrent}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount requested</Label>
                  <Input
                    value={form.amountRequested}
                    onChange={(e) => setForm((prev) => ({ ...prev, amountRequested: e.target.value }))}
                    placeholder="5000"
                    inputMode="decimal"
                    disabled={!canEditCurrent}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Term (months)</Label>
                  <Input
                    value={form.termMonths}
                    onChange={(e) => setForm((prev) => ({ ...prev, termMonths: e.target.value }))}
                    placeholder="12"
                    inputMode="numeric"
                    disabled={!canEditCurrent}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Employment status</Label>
                  <Input
                    value={form.employmentStatus}
                    onChange={(e) => setForm((prev) => ({ ...prev, employmentStatus: e.target.value }))}
                    placeholder="Employed / Self-employed"
                    disabled={!canEditCurrent}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Employer name</Label>
                  <Input
                    value={form.employerName}
                    onChange={(e) => setForm((prev) => ({ ...prev, employerName: e.target.value }))}
                    placeholder="Optional"
                    disabled={!canEditCurrent}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Business name</Label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
                    placeholder="If this is for business"
                    disabled={!canEditCurrent}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly income snapshot</Label>
                  <Input
                    value={form.monthlyIncomeSnapshot}
                    onChange={(e) => setForm((prev) => ({ ...prev, monthlyIncomeSnapshot: e.target.value }))}
                    placeholder="Optional"
                    inputMode="decimal"
                    disabled={!canEditCurrent}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly expense snapshot</Label>
                  <Input
                    value={form.monthlyExpenseSnapshot}
                    onChange={(e) => setForm((prev) => ({ ...prev, monthlyExpenseSnapshot: e.target.value }))}
                    placeholder="Optional"
                    inputMode="decimal"
                    disabled={!canEditCurrent}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-400"
                  value={form.purpose}
                  onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Tell us what the loan is for and how it supports your financial need."
                  disabled={!canEditCurrent}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Additional note</Label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-400"
                  value={form.applicantNote}
                  onChange={(e) => setForm((prev) => ({ ...prev, applicantNote: e.target.value }))}
                  placeholder="Optional context for admin."
                  disabled={!canEditCurrent}
                />
              </div>

              {selectedProduct ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">{selectedProduct.name} range</div>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <span>
                      Amount: {formatMoney(selectedProduct.minAmount, selectedProduct.currency)} -{" "}
                      {formatMoney(selectedProduct.maxAmount, selectedProduct.currency)}
                    </span>
                    <span>
                      Term: {selectedProduct.minTermMonths} - {selectedProduct.maxTermMonths} months
                    </span>
                    <span>
                      Equity: {(selectedProduct.equityRequirementPct * 100).toFixed(0)}% with minimum{" "}
                      {formatMoney(selectedProduct.minimumEquityAmount, selectedProduct.currency)}
                    </span>
                    <span>
                      Rate: {(Number(selectedProduct.annualInterestRatePct || 0) * 100).toFixed(2)}% yearly
                    </span>
                  </div>
                  {selectedProduct.requiredDocuments?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedProduct.requiredDocuments.map((item) => (
                        <Badge key={item} variant="outline">
                          {item.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                {canEditCurrent ? (
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save draft"
                    )}
                  </Button>
                ) : null}
              </DialogFooter>
            </form>

            <div className="space-y-4">
              <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Equity wallet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Some loan products require you to fund part of the request as equity before final approval.
                  </p>

                  {activeApplication ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Required equity</div>
                          <div className="mt-1 font-semibold text-slate-950">
                            {formatMoney(activeApplication.equity.requiredAmount, activeApplication.product.currency)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Confirmed</div>
                          <div className="mt-1 font-semibold text-slate-950">
                            {formatMoney(activeApplication.equity.confirmedAmount, activeApplication.product.currency)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Pending review</div>
                          <div className="mt-1 font-semibold text-slate-950">
                            {formatMoney(activeApplication.equity.pendingAmount, activeApplication.product.currency)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Remaining</div>
                          <div className="mt-1 font-semibold text-slate-950">
                            {formatMoney(activeApplication.equity.remainingAmount, activeApplication.product.currency)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                          <span>Funding progress</span>
                          <span>{Math.round(activeApplication.equity.progressPct * 100)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, Math.round(activeApplication.equity.progressPct * 100)))}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label>Payment method</Label>
                          <Select
                            value={paymentMethod}
                            onValueChange={(value) => setPaymentMethod(value as "STRIPE_CARD" | "BANK_TRANSFER_MANUAL")}
                            disabled={loadingWallet || submittingPayment}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentOptions.map((option) => (
                                <SelectItem key={option.code} value={option.code}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedPaymentMethod ? (
                            <p className="text-xs text-slate-500">{selectedPaymentMethod.description}</p>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Amount to fund</Label>
                          <Input
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            inputMode="decimal"
                            placeholder="0.00"
                            className="bg-white"
                            disabled={submittingPayment || loadingWallet}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>
                            {selectedPaymentMethod?.submissionMode === "BANK_TRANSFER"
                              ? "Transfer reference"
                              : "Stripe reference (optional)"}
                          </Label>
                          <Input
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder={
                              selectedPaymentMethod?.submissionMode === "BANK_TRANSFER"
                                ? "Bank transfer reference"
                                : "Gateway reference"
                            }
                            className="bg-white"
                            disabled={submittingPayment || loadingWallet}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Note</Label>
                          <Input
                            value={paymentNote}
                            onChange={(e) => setPaymentNote(e.target.value)}
                            placeholder="Optional payment note"
                            className="bg-white"
                            disabled={submittingPayment || loadingWallet}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={submitEquityPayment}
                          disabled={
                            !activeApplication ||
                            submittingPayment ||
                            loadingWallet ||
                            paymentOptions.length === 0 ||
                            activeApplication.equity.remainingAmount <= 0
                          }
                        >
                          {submittingPayment ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" />
                              {selectedPaymentMethod?.submissionMode === "BANK_TRANSFER" ? "Submit manual payment" : "Fund with Stripe"}
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-slate-900">Wallet activity</div>
                        {activeApplication.equityContributions.length === 0 && activeApplication.equityPayments.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                            No equity funding activity yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {activeApplication.equityContributions.map((entry) => (
                              <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="font-medium text-slate-900">
                                      Confirmed {entry.channel === "GATEWAY" ? "gateway" : "bank transfer"} funding
                                    </div>
                                    <div className="text-xs text-slate-500">{formatDate(entry.paidAt || entry.createdAt)}</div>
                                  </div>
                                  <div className="font-semibold text-slate-950">
                                    {formatMoney(entry.amount, entry.currency)}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {activeApplication.equityPayments
                              .filter((entry) => entry.status === "SUBMITTED")
                              .map((entry) => (
                                <div key={entry.id} className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="font-medium text-slate-900">Pending manual confirmation</div>
                                      <div className="text-xs text-slate-500">{entry.userReference || entry.providerRef || "Awaiting review"}</div>
                                    </div>
                                    <div className="font-semibold text-slate-950">
                                      {formatMoney(entry.amount, entry.currency)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Save your draft first to unlock the equity wallet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Supporting documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Upload employment evidence, the last 3 months statement, or other product-specific support.
                  </p>

                  {selectedProduct?.requiredDocuments?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.requiredDocuments.map((item) => (
                        <Badge key={item} variant="outline">
                          {item.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label>Document type</Label>
                      <Select value={documentType} onValueChange={(value) => setDocumentType(value as LoanDocumentType)} disabled={!activeApplication || !canEditCurrent}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Choose file</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        disabled={!activeApplication || !canEditCurrent}
                        className="bg-white"
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={uploadDocument} disabled={!activeApplication || !selectedFile || uploading || !canEditCurrent}>
                      {uploading ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FileUp className="h-4 w-4" />
                          Upload document
                        </>
                      )}
                    </Button>
                  </div>

                  {!activeApplication ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Save your draft first to unlock document uploads.
                    </div>
                  ) : activeApplication.documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeApplication.documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">{document.originalName}</div>
                            <div className="text-xs text-slate-500">
                              {document.documentType.replaceAll("_", " ")} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => downloadLoanDocument(activeApplication.id, document.id, document.originalName)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {canEditCurrent ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => removeDocument(document.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Submit to admin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Once submitted, admin can approve, reject, or ask for more information. Final approval also depends on whether your required equity has been funded.
                  </p>
                  {activeApplication?.status === "MORE_INFO_REQUIRED" ? (
                    <div className="space-y-3">
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-400"
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        placeholder="Tell admin what you updated or added before resubmitting."
                      />
                      <Button type="button" className="w-full" onClick={submitResponseUpdate}>
                        <HandCoins className="h-4 w-4" />
                        Resubmit update
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" className="w-full" disabled={!canSubmitCurrent} onClick={sendApplication}>
                      <HandCoins className="h-4 w-4" />
                      Submit application
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Application timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!activeApplication ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Save your draft first to see timeline updates.
                    </div>
                  ) : activeApplication.updates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Timeline updates will appear here as your application progresses.
                    </div>
                  ) : (
                    activeApplication.updates.map((update) => (
                      <div key={update.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{update.title}</div>
                            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{update.actorType}</div>
                          </div>
                          <div className="text-xs text-slate-500">{formatDate(update.createdAt)}</div>
                        </div>
                        {update.note ? <div className="mt-2 text-slate-600">{update.note}</div> : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
