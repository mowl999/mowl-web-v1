import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInvestPlan,
  getInvestDashboard,
  getInvestProducts,
  getInvestReports,
  type InvestDashboardResponse,
  type InvestmentProduct,
  type InvestmentProductKey,
  type InvestReportsResponse,
} from "@/lib/investApi";

export function formatMoney(amount: number, currency = "GBP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function useInvestDashboardData() {
  const [data, setData] = useState<InvestDashboardResponse | null>(null);
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, productRes] = await Promise.all([getInvestDashboard(), getInvestProducts()]);
      setData(dash);
      setProducts(productRes.items || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load investment dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currency = useMemo(
    () => data?.productBalances?.[0]?.currency || products?.[0]?.currency || "GBP",
    [data?.productBalances, products]
  );

  const byCategory = useMemo(() => {
    const map = new Map<
      InvestmentProductKey,
      { plans: number; activePlans: number; totalMonthlyCommitment: number; totalTargetAmount: number; currentBalance: number; annualRatePct: number }
    >();
    const monthlyByProduct = new Map<InvestmentProductKey, number>();
    for (const plan of data?.plans || []) {
      if (plan.status !== "ACTIVE") continue;
      monthlyByProduct.set(
        plan.productKey,
        Number((monthlyByProduct.get(plan.productKey) || 0) + Number(plan.monthlyContribution || 0))
      );
    }
    for (const item of data?.productBalances || []) {
      map.set(item.productKey, {
        plans: item.plansCount,
        activePlans: item.activePlans,
        totalMonthlyCommitment: Number((monthlyByProduct.get(item.productKey) || 0).toFixed(2)),
        totalTargetAmount: item.totalContributed,
        currentBalance: item.currentBalance,
        annualRatePct: item.annualRatePct,
      });
    }
    return map;
  }, [data?.plans, data?.productBalances]);

  const getCategory = useCallback(
    (category: InvestmentProductKey) =>
      byCategory.get(category) || {
        plans: 0,
        activePlans: 0,
        totalMonthlyCommitment: 0,
        totalTargetAmount: 0,
        currentBalance: 0,
        annualRatePct: 0,
      },
    [byCategory]
  );

  const createPlan = useCallback(
    async (payload: { productId: string; name: string; monthlyContribution: number; durationMonths: number }) => {
      await createInvestPlan(payload);
      await load();
    },
    [load]
  );

  const getProductByKey = useCallback(
    (key: InvestmentProductKey) => products.find((p) => p.key === key) || null,
    [products]
  );

  return { data, products, loading, error, reload: load, currency, getCategory, getProductByKey, createPlan };
}

export function useInvestReportsData(months = 6) {
  const [data, setData] = useState<InvestReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getInvestReports(months);
        if (active) setData(res);
      } catch (err: any) {
        if (active) setError(err?.message || "Failed to load investment reports.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [months, reloadKey]);

  return { data, loading, error, reload };
}
