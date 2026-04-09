import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock } from "lucide-react";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

function decodeHtmlEntities(value: string) {
  // Supabase may return an escaped SVG string in some environments.
  // Decode it so it can be rendered as SVG markup.
  if (!value.includes("&")) return value;
  if (typeof document === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function buildSvgDataUrl(svgMarkup: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

export default function MfaPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"setup" | "verify">("verify");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [generatedQrSrc, setGeneratedQrSrc] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);

  const qrImageSrc = useMemo(() => {
    if (!qrSvg) return null;

    const raw = qrSvg.trim();
    if (!raw) return null;

    // Some SDK versions/environments may return a data URL instead of SVG markup.
    if (raw.startsWith("data:image/")) return raw;

    // Handle escaped SVG (e.g. "&lt;svg ...&gt;").
    const decoded = raw.includes("&lt;") ? decodeHtmlEntities(raw) : raw;
    const svgStart = decoded.indexOf("<svg");
    if (svgStart === -1) return null;

    const svgMarkup = decoded.slice(svgStart);
    return buildSvgDataUrl(svgMarkup);
  }, [qrSvg]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setGeneratedQrSrc(null);
      if (!totpUri) return;
      if (!totpUri.startsWith("otpauth://")) return;

      try {
        const mod = await import("qrcode");
        const QRCode = (mod as any).default ?? mod;
        const dataUrl = await QRCode.toDataURL(totpUri, {
          errorCorrectionLevel: "M",
          width: 200,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        if (!cancelled) setGeneratedQrSrc(typeof dataUrl === "string" ? dataUrl : null);
      } catch {
        // If QR generation fails, fall back to Supabase qr_code rendering.
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [totpUri]);

  const redirectTo = useMemo(() => {
    return sessionStorage.getItem("postMfaRedirect") || "/";
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setInlineError(null);
      setLoading(true);

      try {
        const supabase = requireSupabase();
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          setLocation("/login");
          return;
        }

        const { data: assurance, error: assuranceErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceErr) throw assuranceErr;

        const { data: factors, error: factorsErr } = await supabase.auth.mfa.listFactors();
        if (factorsErr) throw factorsErr;

        const totpFactors = (factors as any)?.totp ?? [];

        if (!totpFactors.length) {
          setStep("setup");
        } else {
          setStep("verify");
          setFactorId(String(totpFactors[0].id));

          if ((assurance as any)?.currentLevel === "aal2") {
            if (!cancelled) setLocation(redirectTo);
            return;
          }
        }
      } catch (err: any) {
        setInlineError(err?.message ?? "Unable to initialize MFA.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [redirectTo, setLocation]);

  const startSetup = async () => {
    setInlineError(null);
    setLoading(true);
    try {
        const supabase = requireSupabase();
        const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator",
      } as any);
      if (error) throw error;

      const id = String((data as any)?.id ?? "");
      const qrCode = (data as any)?.totp?.qr_code as unknown;
      const uri = (data as any)?.totp?.uri as unknown;
      const secret = (data as any)?.totp?.secret as unknown;

      const qrString = typeof qrCode === "string" ? qrCode : "";
      const uriString = typeof uri === "string" ? uri : "";
      const secretString = typeof secret === "string" ? secret : "";

      if (!id || (!qrString && !uriString && !secretString)) {
        throw new Error("Failed to enroll MFA.");
      }

      setFactorId(id);
      // Supabase returns qr_code as an SVG markup string (not an image URL).
      // We render it inline and also keep URI/secret as a manual fallback.
      setQrSvg(qrString);
      setTotpUri(uriString || null);
      setTotpSecret(secretString || null);
      setStep("verify");

      toast({
        title: "MFA enrolled",
        description: "Scan the QR code in your authenticator app, then enter the 6-digit code.",
      });
    } catch (err: any) {
      setInlineError(err?.message ?? "Failed to enroll MFA.");
      toast({ title: "MFA setup failed", description: err?.message ?? "Failed to enroll MFA.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async () => {
    if (!factorId) {
      setInlineError("No MFA factor found.");
      return;
    }

    setInlineError(null);
    setLoading(true);
    try {
        const supabase = requireSupabase();
        const { data, error } = await supabase.auth.mfa.challenge({ factorId } as any);
      if (error) throw error;

      const cid = String((data as any)?.id ?? "");
      if (!cid) throw new Error("Failed to start MFA challenge.");
      setChallengeId(cid);
    } catch (err: any) {
      setInlineError(err?.message ?? "Failed to start challenge.");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    if (!factorId) {
      setInlineError("No MFA factor found.");
      return;
    }
    if (!challengeId) {
      setInlineError("Click “Start verification” first.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setInlineError("Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
        const supabase = requireSupabase();
        const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      } as any);
      if (error) throw error;

      sessionStorage.removeItem("postMfaRedirect");
      toast({ title: "MFA verified", description: "You’re signed in securely." });
      setLocation(redirectTo);
    } catch (err: any) {
      setInlineError(err?.message ?? "Invalid code.");
      toast({ title: "Verification failed", description: err?.message ?? "Invalid code.", variant: "destructive" });
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
            Multi-factor authentication
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
            <h2>{step === "setup" ? "Set up MFA" : "Verify MFA"}</h2>
            <p className="text-secondary" style={{ marginTop: "8px" }}>
              {step === "setup"
                ? "Set up an authenticator app (TOTP) to continue."
                : "Enter a code from your authenticator app to continue."}
            </p>
          </div>

          {loading ? (
            <div className="text-secondary" style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
              <Loader2 className="animate-spin" />
              Loading…
            </div>
          ) : null}

          {!loading && step === "setup" ? (
            <div>
              <button className="btn btn-primary" onClick={startSetup} style={{ marginTop: 4 }}>
                Enroll authenticator
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
            </div>
          ) : null}

          {!loading && step === "verify" ? (
            <>
              {generatedQrSrc || qrImageSrc ? (
                <div
                  style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}
                  aria-label="MFA QR code"
                >
                  <div
                    style={{
                      width: 220,
                      height: 220,
                      padding: 10,
                      borderRadius: 12,
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#000000",
                    }}
                  >
                    <img
                      src={generatedQrSrc ?? qrImageSrc ?? ""}
                      alt="Authenticator QR code"
                      width={200}
                      height={200}
                      style={{ width: 200, height: 200, display: "block" }}
                    />
                  </div>
                </div>
              ) : null}

              {!generatedQrSrc && !qrImageSrc && (totpUri || totpSecret) ? (
                <div className="text-secondary" style={{ marginBottom: 14, fontSize: "0.9rem" }}>
                  QR code unavailable — use the manual setup below.
                </div>
              ) : null}

              {totpUri ? (
                <div className="form-group">
                  <label className="form-label">Manual setup URI</label>
                  <input className="form-input" value={totpUri} readOnly />
                </div>
              ) : null}

              {totpSecret ? (
                <div className="form-group">
                  <label className="form-label">Manual secret</label>
                  <input className="form-input" value={totpSecret} readOnly />
                </div>
              ) : null}

              <button className="btn btn-secondary" onClick={startChallenge} disabled={!factorId || loading}>
                {challengeId ? "Restart verification" : "Start verification"}
              </button>

              <form onSubmit={onVerify} style={{ marginTop: 14 }}>
                <div className="form-group">
                  <label className="form-label">6-digit code</label>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="form-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    required
                    disabled={!challengeId}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading || !challengeId} style={{ marginTop: 8 }}>
                  {loading ? <Loader2 className="animate-spin" /> : "Verify"}
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
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
