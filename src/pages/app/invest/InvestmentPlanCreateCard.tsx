import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type InvestmentProductKey } from "@/lib/investApi";
import { useInvestDashboardData } from "./useInvestData";

export default function InvestmentPlanCreateCard({
  productKey,
  defaultName,
}: {
  productKey: InvestmentProductKey;
  defaultName: string;
}) {
  const { getProductByKey, createPlan } = useInvestDashboardData();
  const product = getProductByKey(productKey);

  const [name, setName] = useState(defaultName);
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<"MONTHS" | "YEARS">("YEARS");
  const [submitting, setSubmitting] = useState(false);

  const durationMonths =
    Number(durationValue || 0) * (durationUnit === "YEARS" ? 12 : 1);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product) return toast.error("Investment product is unavailable.");
    const monthly = Number(monthlyContribution);
    if (!name.trim()) return toast.error("Plan name is required.");
    if (!Number.isFinite(monthly) || monthly <= 0) return toast.error("Monthly contribution must be greater than 0.");
    if (!Number.isFinite(durationMonths) || !Number.isInteger(durationMonths)) return toast.error("Duration is invalid.");
    if (durationMonths < product.minMonths || durationMonths > product.maxMonths) {
      return toast.error(`Duration must be between ${product.minMonths} and ${product.maxMonths} months.`);
    }

    setSubmitting(true);
    try {
      await createPlan({
        productId: product.id,
        name: name.trim(),
        monthlyContribution: monthly,
        durationMonths,
      });
      toast.success("Investment plan created.");
      setMonthlyContribution("");
      setDurationValue("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create plan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!product) return null;

  return (
    <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Create {product.name} Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Plan Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Monthly Contribution</Label>
            <Input
              inputMode="decimal"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="500"
            />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex items-center gap-2">
              <Input
                inputMode="numeric"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                placeholder={durationUnit === "YEARS" ? "5" : "60"}
              />
              <select
                className="h-10 rounded-md border border-indigo-200 bg-white px-3 text-sm"
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as "MONTHS" | "YEARS")}
              >
                <option value="YEARS">Years</option>
                <option value="MONTHS">Months</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">
              {Number.isFinite(durationMonths) && durationMonths > 0 ? `${durationMonths} months` : "Enter duration"} · allowed {product.minMonths} to {product.maxMonths} months
            </p>
          </div>
          <div className="space-y-2">
            <Label>Rate</Label>
            <Input value={`${product.effectiveAnnualRatePct ?? product.annualRatePct}% per year`} disabled />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

