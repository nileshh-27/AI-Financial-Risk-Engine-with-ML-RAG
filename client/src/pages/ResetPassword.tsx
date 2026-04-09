import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock } from "lucide-react";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    // The recovery link should establish a session; if not, user can request again.
    const supabase = requireSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Don’t hard-fail; show page with message.
      }
    });
  }, []);

  const onSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    if (password.length < 8) {
      setInlineError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setInlineError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      await supabase.auth.signOut();
      setLocation("/login?mode=login");
    } catch (err: any) {
      setInlineError(err?.message ?? "Failed to update password.");
      toast({ title: "Reset failed", description: err?.message ?? "Failed to update password.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-xy">
      <div className="container">
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <h1 className="mono" style={{ fontSize: "2rem", letterSpacing: "-0.05em" }}>
            <span style={{ color: "var(--accent-primary)" }}>RISK</span>.ENGINE
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            Reset your password
          </p>
        </div>

        <div className="card animate-fade-in" style={{ maxWidth: "420px", width: "100%", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "rgba(59, 130, 246, 0.1)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--accent-primary)",
              }}
            >
              <Lock size={24} />
            </div>
            <h2>Set a new password</h2>
            <p className="text-secondary" style={{ marginTop: "8px" }}>
              Use at least 8 characters.
            </p>
          </div>

          <form onSubmit={onSetPassword}>
            <div className="form-group">
              <label className="form-label">New password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input
                type="password"
                className="form-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "10px" }}>
              {loading ? <Loader2 className="animate-spin" /> : "Update password"}
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
        </div>
      </div>
    </div>
  );
}
