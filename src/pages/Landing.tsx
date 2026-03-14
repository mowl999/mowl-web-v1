import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  ShieldCheck,
  Wallet,
  TrendingUp,
  HandCoins,
  Send,
  ArrowRight,
  CircleCheckBig,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-slate-300 bg-slate-100/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white">
              M
            </div>
            <div className="text-lg font-bold tracking-tight text-slate-900">Money Owl</div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              onClick={() =>
                document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Products
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              How it works
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                document.getElementById("why-money-owl")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Why Money Owl
            </Button>
            <Button variant="outline" onClick={() => nav("/login")}>
              Sign in
            </Button>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => nav("/signup")}>
              Get started
            </Button>
          </div>
          <div className="md:hidden">
            <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => nav("/signup")}>
              Start
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-14 md:pb-12 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Financial freedom, structured and measurable
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              One platform to plan goals, grow wealth, and move money with confidence.
            </h1>

            <p className="max-w-xl text-lg text-slate-600">
              From paying off credit cards and building home equity to saving for your child’s education, Money Owl helps you stay consistent and financially stronger month after month.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => nav("/signup")}>
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore products
              </Button>
            </div>

            <div className="grid gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600" /> Goal-based contributions for real life priorities
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600" /> Investment tracks for long-term and short-term plans
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600" /> International transfers and settlements in one account
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600" /> Progress visibility that keeps you on track
              </div>
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Money Owl Platform</div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                  <CircleCheckBig className="h-3.5 w-3.5" />
                  Active
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly target</div>
                  <div className="text-2xl font-bold text-slate-900">£5,000</div>
                  <div className="mt-1 text-xs text-slate-500">Structured by your selected product</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Wallet className="h-4 w-4 text-indigo-600" />
                      MyContributions
                    </div>
                    <div className="text-xs text-slate-500">Goal planning and payout timeline</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      MyInvestment
                    </div>
                    <div className="text-xs text-slate-500">Growth tracks and rate-led outcomes</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <HandCoins className="h-4 w-4 text-indigo-600" />
                      MyLoan
                    </div>
                    <div className="text-xs text-slate-500">Credit support with structured repayment</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Send className="h-4 w-4 text-indigo-600" />
                      MyFundTransfers
                    </div>
                    <div className="text-xs text-slate-500">Cross-border payments and settlements</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-7xl px-4 pb-8 md:pb-12">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Secure account access
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-indigo-600" />
            Product-level controls
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-indigo-600" />
            Statement-ready records
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-indigo-600" />
            Built for long-term financial discipline
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-8 max-w-3xl space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">One platform. Four focused financial products.</h2>
          <p className="text-slate-600">
            Select the product that matches your current objective and onboard in minutes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              key: "THRIFT",
              title: "MyContributions",
              icon: Wallet,
              desc:
                "Plan and fund practical goals like credit payoff, home equity down payment, school fees, or car purchase.",
            },
            {
              key: "INVEST",
              title: "MyInvestment",
              icon: TrendingUp,
              desc:
                "Create long-term and short-term plans for retirement, family legacy, and children’s future.",
            },
            {
              key: "LOANS",
              title: "MyLoan",
              icon: HandCoins,
              desc:
                "Access loan support with clear repayment visibility and stronger accountability.",
            },
            {
              key: "FUND_TRANSFERS",
              title: "MyFundTransfers",
              icon: Send,
              desc:
                "Send international remittances and settle family, school, or business payments across currencies.",
            },
          ].map((f) => (
            <Card
              key={f.title}
              className="group rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500 hover:bg-indigo-600 hover:shadow-xl"
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 transition-colors group-hover:border-indigo-200 group-hover:bg-white/15 group-hover:text-white">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 text-slate-300 transition-colors group-hover:text-indigo-200">
                    <CircleCheckBig className="h-3.5 w-3.5" />
                    <CircleCheckBig className="h-3.5 w-3.5" />
                    <CircleCheckBig className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mb-2 font-semibold text-slate-900 transition-colors group-hover:text-white">{f.title}</div>
                <div className="mb-4 text-sm text-slate-600 transition-colors group-hover:text-indigo-100">{f.desc}</div>
                <Button
                  variant="outline"
                  className="mt-auto transition-colors group-hover:border-indigo-200 group-hover:bg-white group-hover:text-indigo-700"
                  onClick={() => nav(`/signup?product=${f.key}`)}
                >
                  Start with this product
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-8 max-w-3xl space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          <p className="text-slate-600">
            A simple onboarding flow to help users move from account creation to active financial planning.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Create account",
              desc: "Sign up, verify your email with OTP, and complete your profile.",
            },
            {
              step: "02",
              title: "Choose product",
              desc: "Select the product that matches your immediate goal and financial need.",
            },
            {
              step: "03",
              title: "Start monthly progress",
              desc: "Contribute consistently, track performance, and download statements anytime.",
            },
          ].map((item) => (
            <Card key={item.step} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-3 p-6">
                <div className="text-xs font-semibold tracking-wide text-indigo-600">STEP {item.step}</div>
                <div className="text-lg font-semibold text-slate-900">{item.title}</div>
                <div className="text-sm text-slate-600">{item.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why section */}
      <section id="why-money-owl" className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-8 max-w-3xl space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Why Money Owl</h2>
          <p className="text-slate-600">
            Built to help users become financially freer while still achieving real life goals.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Pay down credit obligations with structure and discipline.",
            "Plan confidently for home equity, car purchase, and education goals.",
            "Keep affordability visible before creating new commitments.",
            "Manage contributions, investment, loans, and transfers from one account.",
          ].map((line) => (
            <div key={line} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-8 text-center">
          <div className="mx-auto max-w-2xl space-y-3">
            <h3 className="text-2xl font-bold text-slate-900">Build your financial momentum today.</h3>
            <p className="text-slate-600">
              Start with one product, stay consistent monthly, and expand as your financial confidence grows.
            </p>
          </div>
          <Button size="lg" className="mt-6 bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => nav("/signup")}>
            Get started with Money Owl
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-300 bg-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} Money Owl. All rights reserved.
          </div>
          <div className="text-xs text-slate-600">
            Built for freedom. Built for consistency. Built for outcomes.
          </div>
        </div>
      </footer>
    </div>
  );
}
