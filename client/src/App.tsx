import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/Auth";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-xy">
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
      </div>
    );
  }

  if (!session) return <Redirect to="/login" />;
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/">
        <PrivateRoute component={Dashboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
