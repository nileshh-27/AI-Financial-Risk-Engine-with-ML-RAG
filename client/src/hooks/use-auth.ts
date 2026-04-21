import { useEffect, useState } from "react";
import { requireSupabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [mfaStatus, setMfaStatus] = useState({ verified: false, required: false });

  useEffect(() => {
    const supabase = requireSupabase();

    const checkMfa = (currentSession: Session | null) => {
      if (!currentSession) {
        setMfaStatus({ verified: false, required: false });
        return;
      }
      try {
        let currentLevel = "aal1";
        if (currentSession.access_token) {
          try {
            const base64Url = currentSession.access_token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload.aal) currentLevel = payload.aal;
          } catch (e) {
            console.error("Failed to parse JWT", e);
          }
        }

        const hasFactors = currentSession.user?.factors?.some(
          (f: any) => f.factor_type === "totp" && f.status === "verified"
        );

        setMfaStatus({
          verified: currentLevel === "aal2",
          required: !!hasFactors,
        });
      } catch (e) {
        console.error("MFA check failed", e);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        checkMfa(session);
      }
      setLoading(false);
    }).catch(err => {
      console.error("getSession error", err);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Clear all cached queries so the new user gets fresh data
      queryClient.clear();

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession) {
        checkMfa(newSession);
      } else {
        setMfaStatus({ verified: false, required: false });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = requireSupabase();
    await supabase.auth.signOut();
    setLocation("/login");
  };

  return { session, user, loading, mfaStatus, signOut };
}
