import { useState, useEffect } from "react";
import { useRiskAssessment, useRiskHistory } from "@/hooks/use-risk";
import { useUploadStatements, useAnalysisHistory } from "@/hooks/use-analysis";
import { RiskForm } from "@/components/RiskForm";
import { RiskResult } from "@/components/RiskResult";
import { HistoryTable } from "@/components/HistoryTable";
import { PDFUploadZone } from "@/components/PDFUploadZone";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import type { RiskResponse, PDFAnalysisResponse } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, FileText } from "lucide-react";

function calculateFastRisk(input: any) {
  let score = 10;
  if (input.transactionAmount > 5000) score += 20;
  if (input.transactionAmount > 10000) score += 20;
  if (input.transactionAmount > 50000) score += 20;
  if (input.isInternational) score += 30;
  const riskyCategories = ["gambling", "crypto", "jewelry"];
  if (riskyCategories.includes(input.merchantCategory?.toLowerCase() || "")) {
    score += 40;
  }
  score += (input.previousChargebacks || 0) * 50;
  score = Math.min(100, Math.max(0, score));

  let level = "Low";
  if (score > 75) level = "High";
  else if (score > 30) level = "Medium";

  return { 
    score, 
    level, 
    recommendation: "AI is analyzing this transaction. This usually takes 5-10 seconds depending on your hardware, please wait...",
    assessmentId: "pending..."
  };
}

export default function RiskEnginePage() {
  const { mutate, isPending } = useRiskAssessment();
  const { data: history, isLoading: isHistoryLoading } = useRiskHistory();
  const [lastResult, setLastResult] = useState<RiskResponse | null>(null);

  const uploadMutation = useUploadStatements();
  const { data: analysisHistory, isLoading: isAnalysisHistoryLoading } = useAnalysisHistory();
  const [analysisResult, setAnalysisResult] = useState<PDFAnalysisResponse | null>(null);

  // Watch for uploadMutation.data changes to update the dashboard
  useEffect(() => {
    if (uploadMutation.data) {
      console.log("[RiskEngine] Setting analysis result from mutation data:", uploadMutation.data);
      setAnalysisResult(uploadMutation.data);
    }
  }, [uploadMutation.data]);

  // Load latest analysis from history if none is set
  useEffect(() => {
    if (!analysisResult && analysisHistory && analysisHistory.length > 0) {
      console.log("[RiskEngine] Setting analysis result from history:", analysisHistory[0]);
      setAnalysisResult(analysisHistory[0] as PDFAnalysisResponse);
    }
  }, [analysisHistory, analysisResult]);

  const handleAssessment = (data: any) => {
    // Instantly show rest of data while LLM takes time
    setLastResult(calculateFastRisk(data));
    
    mutate(data, {
      onSuccess: (result) => {
        setLastResult(result);
      },
    });
  };

  const handlePDFAnalyze = (files: File[]) => {
    uploadMutation.mutate(files);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Risk Engine</h1>
          <p className="text-muted-foreground">Run fraud-risk assessments, analyze bank statements, and predict spending patterns.</p>
        </div>
      </div>

      <Tabs defaultValue="pdf-analysis" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-black/30 border border-white/5">
          <TabsTrigger value="pdf-analysis" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <FileText className="h-4 w-4" />
            PDF Analysis
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <ShieldCheck className="h-4 w-4" />
            Manual Assessment
          </TabsTrigger>
        </TabsList>

        {/* PDF Analysis Tab */}
        <TabsContent value="pdf-analysis" className="space-y-8">
          {/* Upload Zone — full width when results exist, side by side with placeholder when not */}
          {analysisResult ? (
            <div className="max-w-2xl">
              <PDFUploadZone
                onAnalyze={handlePDFAnalyze}
                isLoading={uploadMutation.isPending}
                isComplete={uploadMutation.isSuccess}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <PDFUploadZone
                onAnalyze={handlePDFAnalyze}
                isLoading={uploadMutation.isPending}
                isComplete={uploadMutation.isSuccess}
              />
              <div className="flex flex-col items-center justify-center min-h-[300px] opacity-50 bg-card/40 backdrop-blur-xl border border-white/5 rounded-xl p-8">
                <FileText size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Upload bank statement PDFs to see<br />spending analysis and predictions
                </p>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <AnalysisDashboard result={analysisResult} />
          )}
        </TabsContent>

        {/* Manual Assessment Tab */}
        <TabsContent value="manual" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <RiskForm onSubmit={handleAssessment} isLoading={isPending} />
            <RiskResult result={lastResult} />
          </div>

          <div className="mt-12">
            <HistoryTable history={history} isLoading={isHistoryLoading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
