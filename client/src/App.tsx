import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/Auth";
import ProfilePage, { ProfileEditPage } from "@/pages/Profile";
import RiskEnginePage from "@/pages/RiskEngine";
import PortfolioPage from "@/pages/Portfolio";
import TransactionsPage from "@/pages/Transactions";
import AlertsPage from "@/pages/Alerts";
import MfaPage from "@/pages/Mfa";
import ResetPasswordPage from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { PrivateLayout } from "@/components/AppSidebar";
import { AutoLogout } from "@/components/AutoLogout";
import { hasSupabaseEnv } from "@/lib/supabase";
import { ChatBot } from "@/components/ChatBot";

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { session, loading, mfaStatus } = useAuth();

  if (loading) {
    return (
      <div className="center-xy bg-background">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!session) return <Redirect to="/login" />;

  // User specifically requested to ALWAYS enforce MFA code on every login
  if (!mfaStatus.verified) {
    if (window.location.pathname !== "/mfa") {
      sessionStorage.setItem("postMfaRedirect", window.location.pathname);
      return <Redirect to="/mfa" />;
    }
  }

  return (
    <PrivateLayout>
      <Component />
    </PrivateLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/mfa" component={MfaPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/risk">
        <PrivateRoute component={RiskEnginePage} />
      </Route>
      <Route path="/portfolio">
        <PrivateRoute component={PortfolioPage} />
      </Route>
      <Route path="/transactions">
        <PrivateRoute component={TransactionsPage} />
      </Route>
      <Route path="/alerts">
        <PrivateRoute component={AlertsPage} />
      </Route>
      <Route path="/profile/edit">
        <PrivateRoute component={ProfileEditPage} />
      </Route>
      <Route path="/profile">
        <PrivateRoute component={ProfilePage} />
      </Route>
      <Route path="/">
        <PrivateRoute component={Dashboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  if (!hasSupabaseEnv) {
    return (
      <>
        <Toaster />
        <ParticleBackground />
        <div className="app-shell">
          <main className="container" style={{ marginTop: "32px", maxWidth: "820px" }}>
            <div className="card" style={{ padding: 18 }}>
              <h1 className="mono" style={{ fontSize: "1.35rem", marginBottom: 8 }}>
                Supabase not configured
              </h1>
              <p className="text-secondary" style={{ marginBottom: 10 }}>
                This deploy is missing <span className="mono">VITE_SUPABASE_URL</span> and <span className="mono">VITE_SUPABASE_ANON_KEY</span>, so authentication and profile data can’t load.
              </p>
              <div className="divider" />
              <p className="text-muted" style={{ marginTop: 10 }}>
                If you’re using Netlify drag-and-drop, you must rebuild locally with a <span className="mono">.env</span> file present, then upload <span className="mono">dist/public</span>.
              </p>
              <p className="text-muted" style={{ marginTop: 8 }}>
                If you’re deploying from Git, set these environment variables in Netlify Site settings → Environment variables, then redeploy.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <AutoLogout />
      <ParticleBackground />
      <ChatBot />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
