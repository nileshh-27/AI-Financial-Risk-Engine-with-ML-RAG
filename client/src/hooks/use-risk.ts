import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, riskInputSchema } from "@shared/routes";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type RiskInput = import("zod").infer<typeof riskInputSchema>;
type RiskComputeResponse = import("zod").infer<(typeof api)["risk"]["assess"]["responses"][200]>;

function calculateRisk(input: RiskInput): RiskComputeResponse {
  let score = 10;

  if (input.transactionAmount > 5000) score += 20;
  if (input.transactionAmount > 10000) score += 20;
  if (input.transactionAmount > 50000) score += 20;

  if (input.isInternational) score += 30;

  const riskyCategories = ["gambling", "crypto", "jewelry"];
  if (riskyCategories.includes(input.merchantCategory.toLowerCase())) {
    score += 40;
  }

  score += input.previousChargebacks * 50;

  score = Math.min(100, Math.max(0, score));

  let level = "Low";
  let recommendation = "Approve";

  if (score > 75) {
    level = "High";
    recommendation = "Decline";
  } else if (score > 30) {
    level = "Medium";
    recommendation = "Manual Review";
  }

  return api.risk.assess.responses[200].parse({ score, level, recommendation });
}

export function useRiskAssessment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RiskInput) => {
      const supabase = requireSupabase();
      // Validate input client-side using shared schema
      const validated = api.risk.assess.input.parse(data);

      // For now, compute risk locally (no model/backend wired up yet).
      // This keeps Netlify deploy static-only while still persisting to Supabase.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please sign in to run an assessment");

      const computed = calculateRisk(validated);

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
