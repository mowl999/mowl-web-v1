import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clearAuthSession, getMe, getToken, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Role = "USER" | "ADMIN";
type Entitlement = "THRIFT" | "INVEST" | "LOANS" | "FUND_TRANSFERS" | "ADMIN";

type AuthState = {
  token: string;
  loading: boolean;
  isAuthenticated: boolean;
  user: null | {
    id: string;
    name?: string;
    email: string;
    role: Role;
    entitlements: Entitlement[];
    state?: string;
  };
};

type AuthContextValue = AuthState & {
  refreshMe: () => Promise<void>;
  loginWithToken: (token: string, remember?: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const WARNING_BEFORE_LOGOUT_MS = 30 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialToken = getToken();
  const warningTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const logoutDeadlineRef = useRef<number | null>(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(30);
  const [state, setState] = useState<AuthState>({
    token: initialToken,
    loading: !!initialToken,
    isAuthenticated: !!initialToken,
    user: null,
  });

  const clearIdleTimers = useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    logoutDeadlineRef.current = null;
  }, []);

  const forceLogout = useCallback(() => {
    clearIdleTimers();
    setShowIdleWarning(false);
    setIdleSecondsLeft(30);
    clearAuthSession();
    setState({ token: "", loading: false, isAuthenticated: false, user: null });
  }, [clearIdleTimers]);

  const resetIdleTimer = useCallback(() => {
    clearIdleTimers();
    setShowIdleWarning(false);
    setIdleSecondsLeft(30);

    const now = Date.now();
    const warningAt = now + IDLE_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS;
    const logoutAt = now + IDLE_TIMEOUT_MS;
    logoutDeadlineRef.current = logoutAt;

    warningTimerRef.current = window.setTimeout(() => {
      setShowIdleWarning(true);
      const updateCountdown = () => {
        if (!logoutDeadlineRef.current) return;
        const leftMs = Math.max(0, logoutDeadlineRef.current - Date.now());
        setIdleSecondsLeft(Math.max(0, Math.ceil(leftMs / 1000)));
      };
      updateCountdown();
      countdownIntervalRef.current = window.setInterval(updateCountdown, 1000);
    }, Math.max(0, warningAt - now));

    logoutTimerRef.current = window.setTimeout(() => {
      forceLogout();
    }, Math.max(0, logoutAt - now));
  }, [clearIdleTimers, forceLogout]);

  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ token: "", loading: false, isAuthenticated: false, user: null });
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    try {
      const me = await getMe();
      setState({
        token,
        loading: false,
        isAuthenticated: true,
        user: {
          id: me.id,
          name: me.name,
          email: me.email,
          role: (me.role || "USER") as Role,
          entitlements: (
            (me.entitlements?.length ? me.entitlements : me.products || []) as Entitlement[]
          ),
          state: me.state,
        },
      });
    } catch {
      // token invalid
      clearAuthSession();
      setState({ token: "", loading: false, isAuthenticated: false, user: null });
    }
  }, []);

  const loginWithToken = useCallback(async (token: string, remember = true) => {
    setToken(token, remember);
    await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(() => {
    forceLogout();
  }, [forceLogout]);

  useEffect(() => {
    if (!initialToken) return;
    const timer = window.setTimeout(() => {
      void refreshMe();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [initialToken, refreshMe]);

  useEffect(() => {
    if (!state.isAuthenticated || state.loading) {
      clearIdleTimers();
      return;
    }

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer);
    });

    const timer = window.setTimeout(() => {
      resetIdleTimer();
    }, 0);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
      window.clearTimeout(timer);
      clearIdleTimers();
    };
  }, [clearIdleTimers, resetIdleTimer, state.isAuthenticated, state.loading]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      refreshMe,
      loginWithToken,
      logout,
    }),
    [state, refreshMe, loginWithToken, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Dialog open={showIdleWarning} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session expiring soon</DialogTitle>
            <DialogDescription>
              You will be logged out in {idleSecondsLeft}s due to inactivity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={forceLogout}>
              Logout now
            </Button>
            <Button onClick={resetIdleTimer}>Stay signed in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
