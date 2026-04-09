import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { PDFAnalysisResponse } from "@shared/schema";

/**
 * Upload PDF bank statements for analysis.
 * Sends files to Express → Python backend pipeline.
 */
export function useUploadStatements() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (files: File[]): Promise<PDFAnalysisResponse> => {
            const supabase = requireSupabase();
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) throw new Error("Please sign in first");

            const formData = new FormData();
            for (const file of files) {
                formData.append("files", file);
            }

            const response = await fetch(api.analysis.upload.path, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: "Upload failed" }));
                throw new Error(err.message || err.detail || "Analysis failed");
            }

            const data = await response.json();
            console.log("[Analysis] Received result:", data);
            return data as PDFAnalysisResponse;
        },
        onSuccess: (_data) => {
            queryClient.invalidateQueries({ queryKey: ["analysis-history"] });
            toast({
                title: "Analysis Complete",
                description: "Your bank statements have been analyzed successfully.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Analysis Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

/**
 * Get prediction based on all previously uploaded data.
 */
export function usePrediction() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: async () => {
            const supabase = requireSupabase();
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) throw new Error("Please sign in first");

            const response = await fetch(api.analysis.predict.path, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: "Prediction failed" }));
                throw new Error(err.message || "Prediction failed");
            }

            return await response.json();
        },
        onError: (error: Error) => {
            toast({
                title: "Prediction Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

/**
 * Fetch analysis history from Supabase.
 */
export function useAnalysisHistory() {
    return useQuery({
        queryKey: ["analysis-history"],
        queryFn: async () => {
            const supabase = requireSupabase();
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) return [];

            const { data, error } = await supabase
                .from("pdf_analyses")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            return data || [];
        },
    });
}
