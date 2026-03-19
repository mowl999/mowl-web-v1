import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandCoins, LineChart, BadgeDollarSign, Send } from "lucide-react";
import { useAuth } from "@/app/AuthContext";

type Entitlement = "THRIFT" | "INVEST" | "LOANS" | "FUND_TRANSFERS" | "ADMIN";

function Tile({
  title,
  desc,
  icon,
  onOpen,
  hasAccess,
  comingSoon = false,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onOpen: () => void;
  hasAccess: boolean;
  comingSoon?: boolean;
}) {
  return (
    <Card
      className={`group rounded-2xl transition ${
        comingSoon ? "border-slate-200 bg-slate-50/70 opacity-90" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-muted/30">
            {icon}
          </div>
          {comingSoon ? (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-indigo-700">
              Not available right now
            </span>
          ) : null}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={onOpen}
          variant={comingSoon ? "outline" : hasAccess ? "default" : "outline"}
          disabled={comingSoon}
        >
          {comingSoon ? "Unavailable" : hasAccess ? "Open" : "Access required"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function WorkspaceSelectPage() {
  const navigate = useNavigate();
  const { loading, user } = useAuth();

  const entitlements: Entitlement[] = useMemo(() => {
    return (user?.entitlements || []) as Entitlement[];
  }, [user]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      navigate("/app/admin", { replace: true });
    }
  }, [navigate, user?.role]);

  if (loading) return null;
  if (user?.role === "ADMIN") return null;

  const tiles = [
    {
      key: "THRIFT",
      title: "MyContributions (THRIFT)",
      desc: "Manage groups, dues, payouts, and member activity.",
      icon: <HandCoins className="h-5 w-5" />,
      to: "/app/thrift",
      hasAccess: entitlements.includes("THRIFT"),
    },
    {
      key: "INVEST",
      title: "MyInvestment",
      desc: "Long-term, short-term, retirement, legacy, and children future planning.",
      icon: <LineChart className="h-5 w-5" />,
      to: "/app/invest",
      hasAccess: entitlements.includes("INVEST"),
      comingSoon: true,
    },
    {
      key: "LOANS",
      title: "MyLoan",
      desc: "Apply, review offers, and monitor repayments.",
      icon: <BadgeDollarSign className="h-5 w-5" />,
      to: "/app/loans",
      hasAccess: entitlements.includes("LOANS"),
    },
    {
      key: "FUND_TRANSFERS",
      title: "MyFundTransfers",
      desc: "International remittances and multi-currency settlements.",
      icon: <Send className="h-5 w-5" />,
      to: "/app/fund-transfers",
      hasAccess: entitlements.includes("FUND_TRANSFERS"),
      comingSoon: true,
    },
  ].sort((a, b) => {
    const aRank = a.comingSoon ? 2 : a.hasAccess ? 0 : 1;
    const bRank = b.comingSoon ? 2 : b.hasAccess ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Choose a product</h1>
      <p className="mb-8 text-muted-foreground">
        MyContributions is currently available on your account. Additional products will appear here when they are enabled for your market and service availability.
      </p>

      {entitlements.length === 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">No products assigned</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Contact support/admin to assign a product to your account.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Tile
            key={t.key}
            title={t.title}
            desc={t.desc}
            icon={t.icon}
            hasAccess={t.hasAccess}
            comingSoon={t.comingSoon}
            onOpen={() => {
              if (t.comingSoon) {
                toast.message(`${t.title} is not available right now.`);
                return;
              }
              if (!t.hasAccess) {
                toast.error(`Access not granted for ${t.title}.`);
                return;
              }
              navigate(t.to);
            }}
          />
        ))}
      </div>
    </div>
  );
}
