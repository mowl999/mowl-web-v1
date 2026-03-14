import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/AuthContext";

import { apiFetch } from "@/lib/api";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { loginWithToken } = useAuth();

  // After login, go to where they tried to access, else product selector.
  const from = loc.state?.from || "/app/products";

  // Login creds
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("rememberMe") !== "0");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);

    try {
      const data = await apiFetch<{ token: string; user: any }>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data?.token) throw new Error("Login response missing token");

      await loginWithToken(data.token, rememberMe);

      // ✅ store user display fields for topbar/sidebar (optional but useful)
      const userName = data?.user?.fullName || data?.user?.email || email;
      const userRole = (data?.user?.role || "user").toString().toLowerCase();

      localStorage.setItem("userName", userName);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", data?.user?.id || "");

      toast.success("Logged in");

      if (data?.user?.role === "ADMIN") {
        nav("/app/admin", { replace: true });
        return;
      }

      // If user was deep-linking to a protected page, honor it.
      // Otherwise open the product selector.
      nav(from, { replace: true });

    } catch (err: any) {
      const msg = err?.message || "Login failed";
      if (String(msg).toLowerCase().includes("verify your email")) {
        nav(`/signup?mode=email-sent&email=${encodeURIComponent(email.trim())}`);
      }
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center space-y-2">
          <div className="text-3xl font-bold tracking-tight text-indigo-700">mowl</div>
          <div className="text-sm text-muted-foreground">
            Sign in to access your products
          </div>
        </div>

        <Card className="rounded-2xl border-indigo-300 bg-white shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Sign in</CardTitle>
            <p className="text-xs text-slate-400 text-muted-foreground text-center">
              Enter your account details to continue.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  className="border border-indigo-300 focus:border-indigo-500 focus:ring-indigo-600"
                  id="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => nav("/forgot-password")}
                  >
                    Forgot password?
                  </button>
                </div>

                <Input
                  className="border border-indigo-300 focus:border-indigo-500 focus:ring-indigo-600"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>

              <Button
                className="w-full bg-indigo-700 hover:bg-indigo-800 text-white"
                disabled={loading}
                type="submit"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                By continuing, you agree with MOwl access policy.
              </div>

              <div className="text-xs text-muted-foreground text-center">
                New to mowl?{" "}
                <button type="button" className="underline" onClick={() => nav("/signup")}>
                  Create account
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} mowl. All rights reserved.
        </div>
      </div>
    </div>
  );
}
