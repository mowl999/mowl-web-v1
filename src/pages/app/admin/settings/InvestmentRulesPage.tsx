import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, LineChart, ShieldCheck, TimerReset } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminInvestProducts, updateAdminInvestProduct, type InvestmentProduct } from "@/lib/investApi";

import { AdminSetupIntro, RuleField, SummaryTile } from "./shared";

export default function InvestmentRulesPage() {
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminInvestProducts();
      setProducts(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load investment products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProduct(product: InvestmentProduct) {
    setSavingId(product.id);
    try {
      const res = await updateAdminInvestProduct(product.id, {
        annualRatePct: Number(product.annualRatePct),
        minMonths: Number(product.minMonths),
        maxMonths: Number(product.maxMonths),
        isActive: Boolean(product.isActive),
      });
      setProducts((prev) => prev.map((item) => (item.id === product.id ? res.product : item)));
      toast.success(`${product.name} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update investment product");
    } finally {
      setSavingId(null);
    }
  }

  const stats = useMemo(() => {
    const active = products.filter((item) => item.isActive).length;
    const avgRate = products.length ? products.reduce((sum, item) => sum + Number(item.annualRatePct || 0), 0) / products.length : 0;
    const maxTerm = products.reduce((max, item) => Math.max(max, Number(item.maxMonths || 0)), 0);
    return { active, avgRate, maxTerm };
  }, [products]);

  return (
    <div className="space-y-6">
      <AdminSetupIntro
        badge="Admin Setup / MyInvestment"
        title="MyInvestment pricing & rules"
        description="Control base rates, duration bounds, and product availability for investment plans."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Products" value={products.length} hint="Configured investment products" icon={BarChart3} />
        <SummaryTile label="Active" value={stats.active} hint="Available for new plans" icon={ShieldCheck} />
        <SummaryTile label="Average rate" value={`${stats.avgRate.toFixed(2)}%`} hint="Across all products" icon={LineChart} />
        <SummaryTile label="Longest term" value={`${stats.maxTerm} months`} hint="Current maximum commitment window" icon={TimerReset} />
      </div>

      <Card className="rounded-2xl border shadow-sm dashboard-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-950">Investment product rates</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Update annual rates and duration limits for each investment product.</p>
          </div>
          <Button variant="outline" className="bg-white" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-slate-500">Loading investment products…</div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-500">No investment products available.</div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{product.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{product.key}</div>
                      <div className="mt-2 text-sm text-slate-500">{product.description || "No description set."}</div>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(product.isActive)}
                        onChange={(e) =>
                          setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, isActive: e.target.checked } : item)))
                        }
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <RuleField label="Annual rate %">
                      <Input
                        type="number"
                        step="0.01"
                        value={product.annualRatePct}
                        onChange={(e) =>
                          setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, annualRatePct: Number(e.target.value) } : item)))
                        }
                      />
                    </RuleField>
                    <RuleField label="Min months">
                      <Input
                        type="number"
                        step="1"
                        value={product.minMonths}
                        onChange={(e) =>
                          setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, minMonths: Number(e.target.value) } : item)))
                        }
                      />
                    </RuleField>
                    <RuleField label="Max months">
                      <Input
                        type="number"
                        step="1"
                        value={product.maxMonths}
                        onChange={(e) =>
                          setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, maxMonths: Number(e.target.value) } : item)))
                        }
                      />
                    </RuleField>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button size="sm" variant="outline" disabled={savingId === product.id} onClick={() => saveProduct(product)}>
                      {savingId === product.id ? "Saving..." : "Save product"}
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
