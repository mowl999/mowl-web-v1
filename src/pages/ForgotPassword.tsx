import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg(null);
    setLoading(true);

    try {
      // Backend: POST /v1/auth/forgot-password
      await apiFetch("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setDone(true);
    } catch (err: any) {
      if (err?.status === 404) {
        setErrMsg("No account was found with that email address.");
      } else {
        setErrMsg(err?.message || "Failed to request password reset");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <button
        className="text-sm text-muted-foreground hover:underline"
        onClick={() => nav("/login")}
        type="button"
      >
        ← Back to sign in
      </button>

      <h1 className="mt-4 text-2xl font-semibold">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we’ll send you instructions to reset your password.
      </p>

      {errMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {done ? (
        <div className="mt-6 rounded-lg border p-4 text-sm">
          If an account exists for <span className="font-medium">{email}</span>, you’ll receive a reset link shortly.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <Button disabled={loading} className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
