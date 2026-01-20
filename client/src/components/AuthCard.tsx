import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        setLocation("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: "Account created", description: "Please check your email to verify your account." });
      }
    } catch (error: any) {
      toast({ 
        title: "Authentication Error", 
        description: error.message, 
        variant: "destructive" 
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
            placeholder="analyst@fintech.com"
          />
        </div>

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

        <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '16px' }}>
          {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
        </button>
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
