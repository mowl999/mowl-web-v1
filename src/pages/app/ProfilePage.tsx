import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, getMe, type Me, updateProfile } from "@/lib/api";

function initialsFromUser(me: Me | null) {
  const first = String(me?.firstName || me?.name || me?.email || "").trim().charAt(0);
  const second = String(me?.lastName || "").trim().charAt(0);
  return `${first}${second}`.toUpperCase() || "MO";
}

function stateTone(state?: string) {
  if (state === "ACTIVE" || state === "ELIGIBLE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (state === "SUSPENDED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (state === "REGISTERED") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { refreshMe, user } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await getMe();
      setMe(res);
      setFirstName(res.firstName || "");
      setLastName(res.lastName || "");
    } catch (e: any) {
      toast.error(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const displayName = useMemo(() => {
    return me?.name || [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.email || "User";
  }, [me]);

  async function saveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      return toast.error("First name and last name are required.");
    }

    setSavingProfile(true);
    try {
      const res = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setMe((prev) => ({
        ...(prev || {}),
        ...res.user,
        name: res.user.fullName || `${firstName.trim()} ${lastName.trim()}`.trim(),
      }));
      localStorage.setItem("userName", res.user.fullName || `${firstName.trim()} ${lastName.trim()}`.trim());
      await refreshMe();
      toast.success("Profile updated.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error("Complete all password fields.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("New password and confirmation do not match.");
    }

    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Account
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500">Maintain your account details and keep your sign-in credentials up to date.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Account Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-semibold text-white">
                {initialsFromUser(me)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-slate-950">{displayName}</div>
                <div className="truncate text-sm text-slate-500">{me?.email || user?.email || "—"}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Role</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{me?.role || user?.role || "—"}</div>
              </div>
              <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">State</div>
                <div className="mt-1">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stateTone(me?.state)}`}>
                    {me?.state || "—"}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border bg-white px-4 py-3 shadow-sm sm:col-span-2">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Products</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(me?.entitlements || []).map((entitlement) => (
                    <span key={entitlement} className="rounded-full border bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {entitlement}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {user?.role !== "ADMIN" && me?.entitlements?.includes("THRIFT") ? (
              <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3 shadow-sm">
                <div className="text-sm font-medium text-slate-900">Income Profile</div>
                <div className="mt-1 text-xs text-slate-500">
                  Update affordability-related information from your contributions workspace when needed.
                </div>
                <Button className="mt-3" variant="outline" onClick={() => navigate("/app/thrift/affordability-summary")}>
                  Open Affordability Summary
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-1">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={me?.email || ""} readOnly className="bg-slate-50" />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={loading || savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-sky-100 bg-sky-50/40 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Current password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>New password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Confirm new password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Use at least 10 characters with letters and numbers. Avoid using your name or email in the password.
              </p>
              <div className="flex justify-end">
                <Button onClick={savePassword} disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
