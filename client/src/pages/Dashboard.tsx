import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRiskAssessment, useRiskHistory } from "@/hooks/use-risk";
import { RiskForm } from "@/components/RiskForm";
import { RiskResult } from "@/components/RiskResult";
import { HistoryTable } from "@/components/HistoryTable";
import { LogOut, LayoutDashboard } from "lucide-react";
import type { RiskResponse } from "@shared/schema";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { mutate, isPending } = useRiskAssessment();
  const { data: history, isLoading: isHistoryLoading } = useRiskHistory();
  const [lastResult, setLastResult] = useState<RiskResponse | null>(null);

  const handleAssessment = (data: any) => {
    mutate(data, {
      onSuccess: (result) => {
        setLastResult(result);
      },
    });
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '48px' }}>
      <header className="app-header">
        <div className="container header-content">
          <div className="brand mono">
            <LayoutDashboard size={20} />
            <span>RISK</span>.ENGINE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {user?.email}
            </span>
            <button onClick={signOut} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ marginTop: '32px' }}>
        <div className="grid-cols-2" style={{ marginBottom: '32px', alignItems: 'start' }}>
          {/* Left Column: Input Form */}
          <RiskForm onSubmit={handleAssessment} isLoading={isPending} />

          {/* Right Column: Result Display */}
          <RiskResult result={lastResult} />
        </div>

        {/* Bottom Section: History */}
        <div style={{ marginTop: '48px' }}>
          <HistoryTable history={history} isLoading={isHistoryLoading} />
        </div>
      </main>
    </div>
  );
}
