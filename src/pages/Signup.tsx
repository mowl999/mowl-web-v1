import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/app/AuthContext";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductKey = "THRIFT" | "INVEST" | "LOANS" | "FUND_TRANSFERS";
type SignupMode = "start" | "email-sent" | "complete";

const PRODUCT_OPTIONS: Array<{ key: ProductKey; label: string; desc: string }> = [
  { key: "THRIFT", label: "MyContributions", desc: "Goal-based contribution planning and payout access." },
  {
    key: "INVEST",
    label: "MyInvestment",
    desc: "Structured savings and investment plans for long-term and family goals.",
  },
  { key: "LOANS", label: "MyLoan", desc: "Loan access, repayment tracking, and account history." },
  {
    key: "FUND_TRANSFERS",
    label: "MyFundTransfers",
    desc: "International remittance and multi-currency settlement support.",
  },
];

function parseProducts(rawProducts: string | null, rawProduct: string | null) {
  const items = [
    ...(rawProducts ? rawProducts.split(",") : []),
    ...(rawProduct ? [rawProduct] : []),
  ].filter(Boolean);
  const unique = Array.from(new Set(items));
  return unique.filter((item): item is ProductKey =>
    ["THRIFT", "INVEST", "LOANS", "FUND_TRANSFERS"].includes(item)
  );
}

export default function Signup() {
  const nav = useNavigate();
  const { loginWithToken } = useAuth();
  const [params] = useSearchParams();

  const queryEmail = params.get("email") || "";
  const queryToken = params.get("token") || "";
  const queryMode = params.get("mode");
  const queryProducts = parseProducts(params.get("products"), params.get("product"));

  const [mode, setMode] = useState<SignupMode>(queryMode === "complete" ? "complete" : queryMode === "email-sent" ? "email-sent" : "start");
  const [email, setEmail] = useState(queryEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [otherMonthlyEarnings, setOtherMonthlyEarnings] = useState("0");
  const [selectedProducts, setSelectedProducts] = useState<ProductKey[]>(queryProducts);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [linkChecking, setLinkChecking] = useState(queryMode === "complete");
  const [linkReady, setLinkReady] = useState(queryMode !== "complete");
  const [linkError, setLinkError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [devVerificationLink, setDevVerificationLink] = useState("");

  const canStart = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const canComplete = useMemo(
    () =>
      !!firstName.trim() &&
      !!lastName.trim() &&
      !!password &&
      password === confirmPassword &&
      Number(monthlyIncome) > 0 &&
      Number(monthlyExpenses) >= 0 &&
      Number(otherMonthlyEarnings || 0) >= 0 &&
      selectedProducts.length > 0,
    [
      confirmPassword,
      firstName,
      lastName,
      monthlyExpenses,
      monthlyIncome,
      otherMonthlyEarnings,
      password,
      selectedProducts.length,
    ]
  );

  useEffect(() => {
    let active = true;
    if (mode !== "complete") {
      setLinkChecking(false);
      setLinkReady(true);
      setLinkError("");
      return;
    }
    if (!queryEmail || !queryToken) {
      setLinkChecking(false);
      setLinkReady(false);
      setLinkError("This signup link is incomplete. Request a new verification email.");
      return;
    }

    setLinkChecking(true);
    setLinkReady(false);
    setLinkError("");

    apiFetch<{ ok: boolean; email: string; products?: ProductKey[] }>(
      `/v1/auth/signup/link-status?email=${encodeURIComponent(queryEmail)}&token=${encodeURIComponent(queryToken)}`
    )
      .then((res) => {
        if (!active) return;
        setEmail(res.email || queryEmail);
        if ((res.products || []).length > 0) setSelectedProducts(res.products || []);
        setLinkReady(true);
      })
      .catch((err: any) => {
        if (!active) return;
        setLinkError(err?.message || "This signup link is invalid or expired.");
      })
      .finally(() => {
        if (active) setLinkChecking(false);
      });

    return () => {
      active = false;
    };
  }, [mode, queryEmail, queryToken]);

  function toggleProduct(product: ProductKey) {
    setSelectedProducts((prev) =>
      prev.includes(product) ? prev.filter((p) => p !== product) : [...prev, product]
    );
  }

  async function submitEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canStart) {
      toast.error("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        dev?: { verificationLink?: string };
      }>("/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          products: queryProducts,
        }),
      });
      setDevVerificationLink(res?.dev?.verificationLink || "");
      setMode("email-sent");
      toast.success("Verification link sent. Check your email to continue.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start signup");
    } finally {
      setLoading(false);
    }
  }

  async function resendSignupLink() {
    if (!email.trim()) return;
    setResending(true);
    try {
      const res = await apiFetch<{ dev?: { verificationLink?: string } }>("/v1/auth/resend-signup-link", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setDevVerificationLink(res?.dev?.verificationLink || "");
      toast.success("Verification link sent again.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend verification link");
    } finally {
      setResending(false);
    }
  }

  async function submitComplete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canComplete) {
      toast.error("Complete all required fields before continuing.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: any }>("/v1/auth/signup/complete", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: queryToken,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password,
          products: selectedProducts,
          monthlyIncome: Number(monthlyIncome),
          monthlyExpenses: Number(monthlyExpenses),
          otherMonthlyEarnings: Number(otherMonthlyEarnings || 0),
        }),
      });

      await loginWithToken(res.token);
      localStorage.setItem("userName", res?.user?.fullName || res?.user?.email || email);
      localStorage.setItem("userRole", (res?.user?.role || "user").toString().toLowerCase());
      localStorage.setItem("userId", res?.user?.id || "");

      toast.success("Signup complete. Welcome to mowl.");
      nav("/app/products", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete signup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center space-y-2">
          <div className="text-3xl font-bold tracking-tight text-indigo-700">mowl</div>
          <div className="text-sm text-muted-foreground">
            {mode === "start"
              ? "Start with your email. We will send a secure link to continue."
              : mode === "email-sent"
                ? "Your email link is on the way."
                : "Complete your profile to finish creating your account."}
          </div>
        </div>

        <Card className="rounded-2xl border-indigo-300 bg-white shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">
              {mode === "start" ? "Create account" : mode === "email-sent" ? "Check your email" : "Complete signup"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {mode === "start" ? (
              <form onSubmit={submitEmail} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <div className="text-xs text-muted-foreground">
                    We will send a verification link before asking for any other signup information.
                  </div>
                </div>

                <Button className="w-full bg-indigo-700 hover:bg-indigo-800 text-white" disabled={loading} type="submit">
                  {loading ? "Sending link..." : "Continue with email"}
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  Already have an account?{" "}
                  <button type="button" className="underline" onClick={() => nav("/login")}>
                    Sign in
                  </button>
                </div>
              </form>
            ) : null}

            {mode === "email-sent" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
                  We sent a secure signup link to <span className="font-medium">{email}</span>. Open that email and click the link to continue.
                </div>

                {devVerificationLink ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 break-all">
                    Dev link: <span className="font-mono">{devVerificationLink}</span>
                  </div>
                ) : null}

                <Button type="button" variant="outline" className="w-full" onClick={resendSignupLink} disabled={resending}>
                  {resending ? "Sending again..." : "Resend verification link"}
                </Button>

                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("start")}>
                  Use a different email
                </Button>
              </div>
            ) : null}

            {mode === "complete" ? (
              linkChecking ? (
                <div className="p-6 text-sm text-slate-500 text-center">Checking your signup link...</div>
              ) : !linkReady ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    {linkError || "This signup link is invalid or expired."}
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setMode("start")}>
                    Request a new verification link
                  </Button>
                </div>
              ) : (
                <form onSubmit={submitComplete} className="space-y-4">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
                    Email verified for <span className="font-medium">{email}</span>. Complete the details below to activate your account.
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Use at least 10 characters with letters and numbers. Avoid your name or email.</span>
                      <button type="button" className="underline" onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyIncome">Monthly income</Label>
                      <Input
                        id="monthlyIncome"
                        inputMode="decimal"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        placeholder="5000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyExpenses">Monthly expenses</Label>
                      <Input
                        id="monthlyExpenses"
                        inputMode="decimal"
                        value={monthlyExpenses}
                        onChange={(e) => setMonthlyExpenses(e.target.value)}
                        placeholder="2000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otherMonthlyEarnings">Other monthly earnings</Label>
                    <Input
                      id="otherMonthlyEarnings"
                      inputMode="decimal"
                      value={otherMonthlyEarnings}
                      onChange={(e) => setOtherMonthlyEarnings(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select products</Label>
                    <div className="grid gap-2">
                      {PRODUCT_OPTIONS.map((product) => (
                        <label
                          key={product.key}
                          className="flex items-center justify-between rounded-md border border-indigo-100 px-3 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{product.label}</div>
                            <div className="text-xs text-slate-500">{product.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.key)}
                            onChange={() => toggleProduct(product.key)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full bg-indigo-700 hover:bg-indigo-800 text-white" disabled={loading} type="submit">
                    {loading ? "Finishing signup..." : "Complete signup"}
                  </Button>
                </form>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
