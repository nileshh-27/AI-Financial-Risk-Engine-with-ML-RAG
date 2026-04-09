import { useEffect, useState } from "react";
import { getSupabaseConfig, hasSupabaseEnv, requireSupabase } from "@/lib/supabase";
import { Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Allow routes like /login?mode=signup to pre-select mode.
  // We only apply this on first mount so user toggles still work.
  useEffect(() => {
    try {
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "signup") setIsLogin(false);
      if (mode === "login") setIsLogin(true);

      const prefillEmail = new URLSearchParams(window.location.search).get("email");
      if (prefillEmail) setEmail(prefillEmail);
    } catch {
      // ignore
    }
  }, []);

  const onForgotPassword = async () => {
    setInlineError(null);

    if (!email.trim()) {
      const msg = "Enter your email first.";
      setInlineError(msg);
      toast({ title: "Missing email", description: msg, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      if (!hasSupabaseEnv) {
        const msg =
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (build-time) or fill /runtime-config.js (runtime), then redeploy.";
        setInlineError(msg);
        toast({ title: "Configuration error", description: msg, variant: "destructive" });
        return;
      }

      const supabase = requireSupabase();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      toast({
        title: "Password reset sent",
        description: "Check your email for the reset link.",
      });
    } catch (err: any) {
      setInlineError(err?.message ?? "Failed to send reset email.");
      toast({
        title: "Reset failed",
        description: err?.message ?? "Failed to send reset email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    setIsLoading(true);

    try {
      if (!hasSupabaseEnv) {
        const msg =
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (build-time) or fill /runtime-config.js (runtime), then redeploy.";
        setInlineError(msg);
        toast({ title: "Configuration error", description: msg, variant: "destructive" });
        return;
      }

      const supabase = requireSupabase();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        setLocation("/");
      } else {
        if (!phone.trim()) {
          const msg = "Phone number is required.";
          setInlineError(msg);
          toast({ title: "Missing phone", description: msg, variant: "destructive" });
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: phone.trim(),
            },
          },
        });
        if (error) throw error;

        toast({
          title: "Account created",
          description: "Now sign in with your email and password.",
        });
        setIsLogin(true);
        setPassword("");
        setLocation(`/login?mode=login&email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      const message = typeof error?.message === "string" ? error.message : "Authentication failed.";

      // supabase-js uses fetch under the hood; connection issues often surface as TypeError: Failed to fetch
      const isFetchFailure =
        error instanceof TypeError ||
        /Failed to fetch|NetworkError|ERR_CONNECTION_TIMED_OUT|Load failed/i.test(message);

      if (isFetchFailure) {
        const { url } = getSupabaseConfig();
        const friendly =
          "Unable to reach Supabase from this browser/network. " +
          "Check your internet connection, VPN/proxy, firewall/antivirus, or try a different network (e.g. mobile hotspot)." +
          (url ? ` Supabase URL: ${url}` : "");
        setInlineError(friendly);
        toast({ title: "Network error", description: friendly, variant: "destructive" });
        return;
      }

      setInlineError(message);
      toast({
        title: "Authentication Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ 
          width: '48px', height: '48px', 
          background: 'rgba(59, 130, 246, 0.1)', 
          borderRadius: '12px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          margin: '0 auto 16px',
          color: 'var(--accent-primary)'
        }}>
          <Lock size={24} />
        </div>
        <h2>{isLogin ? "Sign In" : "Create Account"}</h2>
        <p className="text-secondary" style={{ marginTop: '8px' }}>
          Secure access to Risk Engine
        </p>
      </div>

      <form onSubmit={handleAuth}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="XYZ@mail.com"
          />
        </div>

        {!isLogin ? (
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+14155552671"
            />
            <div className="text-secondary" style={{ marginTop: 6, fontSize: "0.85rem" }}>
              Use E.164 format (starts with + and country code)
            </div>
          </div>
        ) : null}

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        {isLogin ? (
          <div style={{ marginTop: 8, textAlign: "right", fontSize: "0.9rem" }}>
            <button
              type="button"
              className="btn-link"
              onClick={onForgotPassword}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '16px' }}>
          {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
        </button>

        {inlineError ? (
          <div
            role="alert"
            style={{
              marginTop: "14px",
              borderRadius: "12px",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              background: "rgba(239, 68, 68, 0.08)",
              color: "#fecaca",
              padding: "10px 12px",
              fontSize: "0.9rem",
            }}
          >
            {inlineError}
          </div>
        ) : null}
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
        <button 
          className="btn-link" 
          onClick={() => setIsLogin(!isLogin)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
