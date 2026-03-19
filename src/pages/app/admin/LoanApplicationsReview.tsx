import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { BadgeCheck, Clock3, Download, HandCoins, Landmark, Percent, WalletCards, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  listAdminLoanApplications,
  listAdminLoanEquityPayments,
  listAdminLoanProducts,
  reviewAdminLoanApplication,
  reviewAdminLoanEquityPayment,
  updateAdminLoanProduct,
  type AdminLoanEquityPayment,
} from "@/lib/adminLoansApi";
import { downloadLoanDocument, type LoanApplication, type LoanProduct } from "@/lib/loansApi";
import { AdminQueueFilterBar } from "@/components/admin/AdminQueueFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        <div className="space-y-1.5 min-w-0">
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

function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusTone(status: LoanApplication["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  if (status === "MORE_INFO_REQUIRED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "SUBMITTED") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (status === "DRAFT") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function equityPaymentTone(status: AdminLoanEquityPayment["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
}

type ProductFormState = {
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  minTermMonths: string;
  maxTermMonths: string;
  equityRequirementPct: string;
  minimumEquityAmount: string;
  isActive: boolean;
};

function productToForm(product: LoanProduct): ProductFormState {
  return {
    name: product.name,
    description: product.description || "",
    minAmount: String(product.minAmount),
    maxAmount: String(product.maxAmount),
    minTermMonths: String(product.minTermMonths),
    maxTermMonths: String(product.maxTermMonths),
    equityRequirementPct: String(Number(product.equityRequirementPct || 0) * 100),
    minimumEquityAmount: String(product.minimumEquityAmount || 0),
    isActive: product.isActive,
  };
}

export default function LoanApplicationsReview() {
  const [status, setStatus] = useState<"SUBMITTED" | "MORE_INFO_REQUIRED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [items, setItems] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<LoanProduct | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  const [equityStatus, setEquityStatus] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [equitySearch, setEquitySearch] = useState("");
  const [equityProductFilter, setEquityProductFilter] = useState<string>("ALL");
  const [equityDateRange, setEquityDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [equityItems, setEquityItems] = useState<AdminLoanEquityPayment[]>([]);
  const [loadingEquity, setLoadingEquity] = useState(true);
  const [equityReviewOpen, setEquityReviewOpen] = useState(false);
  const [activeEquity, setActiveEquity] = useState<AdminLoanEquityPayment | null>(null);
  const [equityDecision, setEquityDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [equityReviewNote, setEquityReviewNote] = useState("");
  const [equityPaymentRef, setEquityPaymentRef] = useState("");
  const [savingEquity, setSavingEquity] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [active, setActive] = useState<LoanApplication | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | "REQUEST_INFO">("APPROVE");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminLoanApplications(status);
      setItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan applications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await listAdminLoanProducts();
      setProducts(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load loan products");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadEquity = useCallback(async () => {
    setLoadingEquity(true);
    try {
      const res = await listAdminLoanEquityPayments(equityStatus);
      setEquityItems(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load equity payments");
      setEquityItems([]);
    } finally {
      setLoadingEquity(false);
    }
  }, [equityStatus]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadEquity();
  }, [loadEquity]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return items.filter((item) => {
      if (productFilter !== "ALL" && item.product.id !== productFilter) return false;
      if (
        dateRange !== "all" &&
        now - new Date(item.submittedAt).getTime() > (dateRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (!query) return true;
      const text = [item.user?.fullName, item.user?.email, item.product.name, item.purpose, item.reviewNote]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [items, search, productFilter, dateRange]);

  const filteredEquityItems = useMemo(() => {
    const query = equitySearch.trim().toLowerCase();
    const now = Date.now();
    return equityItems.filter((item) => {
      if (equityProductFilter !== "ALL" && item.application.product.id !== equityProductFilter) return false;
      if (
        equityDateRange !== "all" &&
        now - new Date(item.submittedAt).getTime() > (equityDateRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (!query) return true;
      const text = [
        item.user?.fullName,
        item.user?.email,
        item.application.product.name,
        item.userReference,
        item.providerRef,
        item.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [equityItems, equitySearch, equityProductFilter, equityDateRange]);

  const stats = useMemo(() => {
    const submitted = filteredItems.filter((item) => item.status === "SUBMITTED").length;
    const approved = filteredItems.filter((item) => item.status === "APPROVED").length;
    const info = filteredItems.filter((item) => item.status === "MORE_INFO_REQUIRED").length;
    const pendingEquity = filteredEquityItems.filter((item) => item.status === "SUBMITTED").length;
    return { submitted, approved, info, pendingEquity };
  }, [filteredItems, filteredEquityItems]);

  const equityTotals = useMemo(() => {
    const confirmed = equityItems
      .filter((item) => item.status === "APPROVED")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pending = equityItems
      .filter((item) => item.status === "SUBMITTED")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { confirmed, pending };
  }, [equityItems]);

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(item.product.id, item.product.name);
    for (const product of products) map.set(product.id, product.name);
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [items, products]);

  const hasActiveFilters = Boolean(search.trim()) || status !== "SUBMITTED" || productFilter !== "ALL" || dateRange !== "30d";
  const hasActiveEquityFilters =
    Boolean(equitySearch.trim()) || equityStatus !== "SUBMITTED" || equityProductFilter !== "ALL" || equityDateRange !== "30d";

  useEffect(() => {
    setPage(1);
  }, [search, status, productFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  function openReview(item: LoanApplication, nextDecision: "APPROVE" | "REJECT" | "REQUEST_INFO") {
    setActive(item);
    setDecision(nextDecision);
    setReviewNote(item.reviewNote || "");
    setReviewOpen(true);
  }

  function openProductEditor(product: LoanProduct) {
    setActiveProduct(product);
    setProductForm(productToForm(product));
    setProductDialogOpen(true);
  }

  function openEquityReview(item: AdminLoanEquityPayment, nextDecision: "APPROVE" | "REJECT") {
    setActiveEquity(item);
    setEquityDecision(nextDecision);
    setEquityReviewNote(item.reviewNote || item.note || "");
    setEquityPaymentRef(item.providerRef || item.userReference || "");
    setEquityReviewOpen(true);
  }

  async function submitReview() {
    if (!active) return;
    if (reviewNote.trim().length < 3) {
      toast.error("Add a short review note before submitting.");
      return;
    }

    setSaving(true);
    try {
      await reviewAdminLoanApplication(active.id, {
        decision,
        reviewNote: reviewNote.trim(),
      });
      toast.success("Loan application updated.");
      setReviewOpen(false);
      setActive(null);
      await loadApplications();
    } catch (e: any) {
      toast.error(e?.message || "Failed to review loan application");
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    if (!activeProduct || !productForm) return;
    setSavingProduct(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        minAmount: Number(productForm.minAmount),
        maxAmount: Number(productForm.maxAmount),
        minTermMonths: Number(productForm.minTermMonths),
        maxTermMonths: Number(productForm.maxTermMonths),
        equityRequirementPct: Number(productForm.equityRequirementPct) / 100,
        minimumEquityAmount: Number(productForm.minimumEquityAmount),
        isActive: productForm.isActive,
      };
      await updateAdminLoanProduct(activeProduct.id, payload);
      toast.success("Loan product updated.");
      setProductDialogOpen(false);
      setActiveProduct(null);
      await Promise.all([loadProducts(), loadApplications(), loadEquity()]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update loan product");
    } finally {
      setSavingProduct(false);
    }
  }

  async function submitEquityReview() {
    if (!activeEquity) return;
    if (equityDecision === "REJECT" && equityReviewNote.trim().length < 3) {
      toast.error("Add a short note so the user knows why this payment was rejected.");
      return;
    }
    if (equityDecision === "APPROVE" && equityPaymentRef.trim().length < 3) {
      toast.error("Enter a payment reference before approving the transfer.");
      return;
    }

    setSavingEquity(true);
    try {
      await reviewAdminLoanEquityPayment(activeEquity.id, {
        decision: equityDecision,
        reviewNote: equityReviewNote.trim() || undefined,
        paymentRef: equityDecision === "APPROVE" ? equityPaymentRef.trim() : undefined,
      });
      toast.success(equityDecision === "APPROVE" ? "Equity payment approved." : "Equity payment rejected.");
      setEquityReviewOpen(false);
      setActiveEquity(null);
      await Promise.all([loadEquity(), loadApplications()]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to review equity payment");
    } finally {
      setSavingEquity(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Loan applications</h1>
        <p className="text-sm text-slate-500">
          Manage loan products, confirm funded equity, and complete final loan review from one operations view.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Visible requests" value={filteredItems.length} hint="Current filtered result count" icon={HandCoins} />
        <SummaryTile label="Submitted" value={stats.submitted} hint="Waiting for admin action" icon={Clock3} />
        <SummaryTile label="Approved" value={stats.approved} hint="Reviewed positively" icon={BadgeCheck} />
        <SummaryTile label="Pending equity" value={stats.pendingEquity} hint="Manual transfers waiting for confirmation" icon={WalletCards} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-2xl border shadow-sm dashboard-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Loan product settings</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Set amount ranges, term windows, and the minimum equity requirement for each loan product.</p>
            </div>
            <Button variant="outline" onClick={loadProducts} disabled={productsLoading}>
              {productsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {productsLoading ? (
              <div className="text-sm text-slate-500">Loading products...</div>
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
                    <Button variant="outline" size="sm" onClick={() => openProductEditor(product)}>
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
                      <div className="text-xs uppercase tracking-wide text-slate-400">Equity requirement</div>
                      <div className="mt-1 font-medium text-slate-900">{(Number(product.equityRequirementPct || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Minimum equity</div>
                      <div className="mt-1 font-medium text-slate-900">{formatMoney(product.minimumEquityAmount, product.currency)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm dashboard-card">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-base">Equity funding review</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Approve manual bank transfers so the user’s funded equity becomes available to the application immediately.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Confirmed equity</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(equityTotals.confirmed)}</div>
                <div className="mt-1 text-xs text-slate-500">Total approved equity across loan applications</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Pending manual review</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(equityTotals.pending)}</div>
                <div className="mt-1 text-xs text-slate-500">Transfers waiting for admin confirmation</div>
              </div>
            </div>
            <AdminQueueFilterBar
              search={equitySearch}
              onSearchChange={setEquitySearch}
              searchPlaceholder="Search borrower, product, or payment reference"
              filters={
                <>
                  <Select value={equityStatus} onValueChange={(value) => setEquityStatus(value as typeof equityStatus)}>
                    <SelectTrigger className="w-full bg-white sm:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="ALL">All</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={equityProductFilter} onValueChange={setEquityProductFilter}>
                    <SelectTrigger className="w-full bg-white sm:w-[190px]">
                      <SelectValue placeholder="Product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All products</SelectItem>
                      {productOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={equityDateRange} onValueChange={(value) => setEquityDateRange(value as typeof equityDateRange)}>
                    <SelectTrigger className="w-full bg-white sm:w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7d</SelectItem>
                      <SelectItem value="30d">Last 30d</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              }
              badges={[
                `Status: ${equityStatus === "ALL" ? "All" : equityStatus}`,
                equityProductFilter === "ALL"
                  ? "Product: All"
                  : `Product: ${productOptions.find((item) => item.value === equityProductFilter)?.label || "Selected"}`,
                equityDateRange === "all" ? "Range: All time" : `Range: ${equityDateRange === "7d" ? "Last 7d" : "Last 30d"}`,
              ]}
              onClear={() => {
                setEquitySearch("");
                setEquityStatus("SUBMITTED");
                setEquityProductFilter("ALL");
                setEquityDateRange("30d");
              }}
              canClear={hasActiveEquityFilters}
              onRefresh={loadEquity}
              refreshing={loadingEquity}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingEquity ? (
              <div className="text-sm text-slate-500">Loading equity queue...</div>
            ) : filteredEquityItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No equity payments match the current filters.
              </div>
            ) : (
              filteredEquityItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-slate-950">{item.user?.fullName || item.user?.email}</div>
                        <Badge className={equityPaymentTone(item.status)}>{item.status}</Badge>
                      </div>
                      <div className="text-sm text-slate-500">
                        {item.application.product.name} · {formatMoney(item.amount, item.currency)} · {item.channel === "BANK_TRANSFER" ? "Bank transfer" : "Gateway"}
                      </div>
                      <div className="text-sm text-slate-700">
                        Reference: {item.userReference || item.providerRef || "-"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.status === "SUBMITTED" ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openEquityReview(item, "REJECT")}>
                            Reject
                          </Button>
                          <Button size="sm" onClick={() => openEquityReview(item, "APPROVE")}>
                            Approve
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Required equity</div>
                      <div className="mt-1 font-medium text-slate-900">{formatMoney(item.application.equity.requiredAmount, item.application.product.currency)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Confirmed so far</div>
                      <div className="mt-1 font-medium text-slate-900">{formatMoney(item.application.equity.confirmedAmount, item.application.product.currency)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Remaining after this</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {formatMoney(Math.max(item.application.equity.remainingAmount - item.amount, 0), item.application.product.currency)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Submitted</div>
                      <div className="mt-1 font-medium text-slate-900">{formatDate(item.submittedAt)}</div>
                    </div>
                  </div>

                  {item.note ? (
                    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">Customer note</div>
                      <div className="mt-1">{item.note}</div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-base">Application review queue</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Filter by status, product, or search by customer name and purpose.</p>
          </div>
          <AdminQueueFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search borrower, product, or purpose"
            filters={
              <>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger className="w-full bg-white sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="MORE_INFO_REQUIRED">More info</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="ALL">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-full bg-white sm:w-[190px]">
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All products</SelectItem>
                    {productOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRange)}>
                  <SelectTrigger className="w-full bg-white sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7d</SelectItem>
                    <SelectItem value="30d">Last 30d</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            badges={[
              `Status: ${status === "ALL" ? "All" : status.replaceAll("_", " ")}`,
              productFilter === "ALL"
                ? "Product: All"
                : `Product: ${productOptions.find((item) => item.value === productFilter)?.label || "Selected"}`,
              dateRange === "all" ? "Range: All time" : `Range: ${dateRange === "7d" ? "Last 7d" : "Last 30d"}`,
            ]}
            onClear={() => {
              setSearch("");
              setStatus("SUBMITTED");
              setProductFilter("ALL");
              setDateRange("30d");
            }}
            canClear={hasActiveFilters}
            onRefresh={loadApplications}
            refreshing={loading}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading loan queue...</div>
          ) : pagedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No loan applications match the current filters.
            </div>
          ) : (
            pagedItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-slate-950">{item.user?.fullName || item.user?.email}</div>
                      <Badge className={statusTone(item.status)}>{item.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                      {item.product.name} · {formatMoney(item.amountRequested, item.product.currency)} · {item.termMonths} months
                    </div>
                    <div className="text-sm text-slate-700">{item.purpose}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === "SUBMITTED" ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openReview(item, "REQUEST_INFO")}>
                          Request info
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openReview(item, "REJECT")}>
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => openReview(item, "APPROVE")} disabled={!item.equity.canApprove}>
                          Approve
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Borrower</div>
                    <div className="mt-1 font-medium text-slate-900">{item.user?.email || "-"}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Submitted</div>
                    <div className="mt-1 font-medium text-slate-900">{formatDate(item.submittedAt)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Income snapshot</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {item.monthlyIncomeSnapshot != null ? formatMoney(item.monthlyIncomeSnapshot) : "-"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Expense snapshot</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {item.monthlyExpenseSnapshot != null ? formatMoney(item.monthlyExpenseSnapshot) : "-"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Required equity</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.requiredAmount, item.product.currency)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Confirmed equity</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.confirmedAmount, item.product.currency)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Remaining equity</div>
                    <div className="mt-1 font-medium text-slate-900">{formatMoney(item.equity.remainingAmount, item.product.currency)}</div>
                  </div>
                </div>

                {(item.employmentStatus || item.employerName || item.businessName) ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Profile context:</span>{" "}
                    {[item.employmentStatus, item.employerName, item.businessName].filter(Boolean).join(" · ")}
                  </div>
                ) : null}

                {!item.equity.canApprove ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Approval is blocked until the borrower fully funds the required equity.
                  </div>
                ) : null}

                {item.reviewNote ? (
                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Latest admin note</div>
                    <div className="mt-1">{item.reviewNote}</div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-slate-900">Documents</div>
                  {item.documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      No documents uploaded.
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {item.documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">{document.originalName}</div>
                            <div className="text-xs text-slate-500">
                              {document.documentType.replaceAll("_", " ")} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadLoanDocument(item.id, document.id, document.originalName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit loan product</DialogTitle>
            <DialogDescription>Set the core loan product range and the equity amount a borrower must build before approval.</DialogDescription>
          </DialogHeader>
          {productForm ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Product name</Label>
                <Input value={productForm.name} onChange={(e) => setProductForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Description</Label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  value={productForm.description}
                  onChange={(e) => setProductForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum amount</Label>
                <Input inputMode="decimal" value={productForm.minAmount} onChange={(e) => setProductForm((prev) => (prev ? { ...prev, minAmount: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Maximum amount</Label>
                <Input inputMode="decimal" value={productForm.maxAmount} onChange={(e) => setProductForm((prev) => (prev ? { ...prev, maxAmount: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum term (months)</Label>
                <Input inputMode="numeric" value={productForm.minTermMonths} onChange={(e) => setProductForm((prev) => (prev ? { ...prev, minTermMonths: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Maximum term (months)</Label>
                <Input inputMode="numeric" value={productForm.maxTermMonths} onChange={(e) => setProductForm((prev) => (prev ? { ...prev, maxTermMonths: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Equity requirement (%)</Label>
                <Input inputMode="decimal" value={productForm.equityRequirementPct} onChange={(e) => setProductForm((prev) => (prev ? { ...prev, equityRequirementPct: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum equity amount</Label>
                <Input inputMode="decimal" value={productForm.minimumEquityAmount} onChange={(e) => setProductForm((prev) => (prev ? { ...prev, minimumEquityAmount: e.target.value } : prev))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Availability</Label>
                <Select
                  value={productForm.isActive ? "ACTIVE" : "INACTIVE"}
                  onValueChange={(value) => setProductForm((prev) => (prev ? { ...prev, isActive: value === "ACTIVE" } : prev))}
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
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProduct} disabled={savingProduct || !productForm}>
              {savingProduct ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={equityReviewOpen} onOpenChange={setEquityReviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review equity payment</DialogTitle>
            <DialogDescription>Confirm or reject this manual transfer so the loan application reflects the correct funded equity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={equityDecision} onValueChange={(value) => setEquityDecision(value as typeof equityDecision)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">Approve</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {equityDecision === "APPROVE" ? (
              <div className="space-y-1.5">
                <Label>Payment reference</Label>
                <Input
                  value={equityPaymentRef}
                  onChange={(e) => setEquityPaymentRef(e.target.value)}
                  placeholder="Reference to attach to confirmed equity"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Review note</Label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={equityReviewNote}
                onChange={(e) => setEquityReviewNote(e.target.value)}
                placeholder="Explain the approval or rejection clearly for operations history."
              />
            </div>
            {activeEquity ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1.5">
                <div className="font-medium text-slate-900">{activeEquity.user?.fullName || activeEquity.user?.email}</div>
                <div>{activeEquity.application.product.name} · {formatMoney(activeEquity.amount, activeEquity.currency)}</div>
                <div>Submitted {formatDate(activeEquity.submittedAt)}</div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquityReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEquityReview} disabled={savingEquity}>
              {savingEquity ? "Saving..." : "Save review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review loan application</DialogTitle>
            <DialogDescription>
              Record a clear admin decision so the customer understands the next step immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(value) => setDecision(value as typeof decision)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">Approve</SelectItem>
                  <SelectItem value="REQUEST_INFO">Request more info</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Review note</Label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Explain the approval, rejection, or the exact information the customer still needs."
              />
            </div>
            {active ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">{active.user?.fullName || active.user?.email}</div>
                <div className="mt-1">
                  {active.product.name} · {formatMoney(active.amountRequested, active.product.currency)} · {active.termMonths} months
                </div>
                <div className="mt-1">Equity funded: {formatMoney(active.equity.confirmedAmount, active.product.currency)} / {formatMoney(active.equity.requiredAmount, active.product.currency)}</div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={saving}>
              {saving ? "Saving..." : "Save decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
