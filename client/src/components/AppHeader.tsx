import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShieldCheck, Wallet, ReceiptText, Bell, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { requireSupabase } from "@/lib/supabase";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/risk", label: "Risk Engine", icon: <ShieldCheck size={16} /> },
  { href: "/portfolio", label: "Portfolio", icon: <Wallet size={16} /> },
  { href: "/transactions", label: "Transactions", icon: <ReceiptText size={16} /> },
  { href: "/alerts", label: "Alerts", icon: <Bell size={16} /> },
  { href: "/profile", label: "Profile", icon: <User size={16} /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppHeader() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const [checkedGates, setCheckedGates] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user?.id) {
        setCheckedGates(false);
        return;
      }
      if (checkedGates) return;
      if (location.startsWith("/mfa") || location.startsWith("/reset-password")) return;

      try {
        const supabase = requireSupabase();
        // 1) MFA gate
        const { data: assurance, error: assuranceErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceErr) throw assuranceErr;

        const { data: factors, error: factorsErr } = await supabase.auth.mfa.listFactors();
        if (factorsErr) throw factorsErr;

        const totp = (factors as any)?.totp ?? [];
        const hasTotp = Array.isArray(totp) && totp.length > 0;
        const currentLevel = (assurance as any)?.currentLevel;

        if (hasTotp && currentLevel !== "aal2") {
          sessionStorage.setItem("postMfaRedirect", location || "/");
          setLocation("/mfa");
          return;
        }

        if (!hasTotp) {
          sessionStorage.setItem("postMfaRedirect", location || "/");
          setLocation("/mfa");
          return;
        }

        // 2) Profile completion gate
        if (location.startsWith("/profile")) {
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("banker_profile")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        const bp = (data?.banker_profile ?? {}) as any;
        const fullName = typeof bp?.fullName === "string" ? bp.fullName.trim() : "";
        if (!fullName) {
          setLocation("/profile/edit");
        }
      } catch {
        // If profile lookup fails, do not block the user.
      } finally {
        if (!cancelled) setCheckedGates(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, location, checkedGates, setLocation]);

  return (
    <header className="app-header">
      <div className="container header-content">
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <div className="brand mono" style={{ whiteSpace: "nowrap" }}>
            <span>RISK</span>.ENGINE
          </div>

          <nav className="app-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a className={`nav-link ${isActive(location, item.href) ? "active" : ""}`.trim()}>
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </Link>
            ))}
          </nav>
        </div>

        <div className="header-right">
          <div className="header-user" title={user?.email ?? ""}>
            {user?.email ?? ""}
          </div>
          <button
            onClick={signOut}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.85rem", width: "auto" }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
