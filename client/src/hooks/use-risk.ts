import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, riskInputSchema } from "@shared/routes";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type RiskInput = import("zod").infer<typeof riskInputSchema>;
type RiskComputeResponse = import("zod").infer<(typeof api)["risk"]["assess"]["responses"][200]>;


export function useRiskAssessment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RiskInput) => {
      const supabase = requireSupabase();
      // Validate input client-side using shared schema
      const validated = api.risk.assess.input.parse(data);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please sign in to run an assessment");

      // Fetch AI evaluation from new backend endpoint
      const response = await fetch("/api/risk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(validated),
      });

      if (!response.ok) {
        throw new Error("Failed to reach Risk Engine API");
      }

      const computed = await response.json();

      // Persist to Supabase (RLS enforces per-user access).
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userData.user?.id;
      if (!userId) throw new Error("No authenticated user");

      const { data: inserted, error: insertErr } = await supabase
        .from("risk_assessments")
        .insert({
          // user_id defaults to auth.uid()
          input_data: validated,
          risk_score: computed.score,
          risk_level: computed.level,
          recommendation: computed.recommendation,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      if (!inserted?.id) throw new Error("Failed to persist assessment");

      return {
        ...computed,
        assessmentId: String(inserted.id),
      };
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
      const supabase = requireSupabase();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data, error } = await supabase
        .from("risk_assessments")
        .select("id,user_id,input_data,risk_score,risk_level,recommendation,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped = (data ?? []).map((row: any) => ({
        id: String(row.id),
        userId: String(row.user_id),
        inputData: row.input_data,
        riskScore: Number(row.risk_score ?? 0),
        riskLevel: String(row.risk_level ?? "Low"),
        recommendation: typeof row.recommendation === "string" ? row.recommendation : undefined,
        createdAt: row.created_at,
      }));

      return api.risk.history.responses[200].parse(mapped);
    },
  });
}
