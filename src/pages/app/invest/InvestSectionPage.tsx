import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { type ReactNode } from "react";

type Stat = { label: string; value: string };
type FocusItem = { title: string; detail: string };
type ActionItem = { title: string; detail: string; to?: string; onClick?: () => void };

export default function InvestSectionPage({
  title,
  subtitle,
  stats,
  focusItems,
  actions,
  loading = false,
  error = null,
  children,
}: {
  title: string;
  subtitle: string;
  stats: Stat[];
  focusItems: FocusItem[];
  actions: ActionItem[];
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="rounded-3xl border-indigo-100 bg-white shadow-sm">
        <CardContent className="p-6 text-sm text-slate-500">Loading live investment data...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-3xl border-red-100 bg-white shadow-sm">
        <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-indigo-100 bg-white shadow-sm">
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl border-indigo-100 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {focusItems.map((item) => (
              <div key={item.title} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-indigo-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-indigo-600" />
              Suggested Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.map((item) => (
              <div key={item.title} className="rounded-xl border border-indigo-100 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-600">{item.detail}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                      return;
                    }
                    if (item.to) navigate(item.to);
                  }}
                  disabled={!item.to && !item.onClick}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {children}
    </div>
  );
}
