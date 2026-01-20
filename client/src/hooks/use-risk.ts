import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type RiskInput } from "@shared/routes";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Helper to get authenticated headers
async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  if (!token) throw new Error("No active session");
  
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

export function useRiskAssessment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RiskInput) => {
      // Validate input client-side using shared schema
      const validated = api.risk.assess.input.parse(data);
      
      const headers = await getAuthHeaders();
      const res = await fetch(api.risk.assess.path, {
        method: api.risk.assess.method,
        headers,
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        const error = await res.json();
        throw new Error(error.message || "Assessment failed");
      }

      return api.risk.assess.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate history query so the list updates immediately
      queryClient.invalidateQueries({ queryKey: [api.risk.history.path] });
      toast({
        title: "Assessment Complete",
        description: "The risk analysis has been processed successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assessment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRiskHistory() {
  return useQuery({
    queryKey: [api.risk.history.path],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(api.risk.history.path, {
        method: api.risk.history.method,
        headers,
      });

      if (!res.ok) {
        if (res.status === 401) return null; // Handle unauthorized gracefully
        throw new Error("Failed to fetch history");
      }

      return api.risk.history.responses[200].parse(await res.json());
    },
  });
}
