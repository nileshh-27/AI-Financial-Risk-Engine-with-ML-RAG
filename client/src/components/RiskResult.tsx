import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import type { RiskResponse } from "@shared/schema";

interface RiskResultProps {
  result: RiskResponse | null;
}

export function RiskResult({ result }: RiskResultProps) {
  if (!result) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, minHeight: '300px' }}>
        <ShieldAlert size={48} color="var(--text-secondary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Awaiting Analysis</p>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "var(--accent-success)";
      case "medium": return "var(--accent-warning)";
      case "high":
      case "critical": return "var(--accent-danger)";
      default: return "var(--text-primary)";
    }
  };

  const Icon = result.level.toLowerCase() === "low" ? CheckCircle : 
               result.level.toLowerCase() === "medium" ? AlertTriangle : ShieldAlert;

  const color = getLevelColor(result.level);

  return (
    <div className="card animate-fade-in" style={{ height: '100%', borderTop: `4px solid ${color}` }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '50%', 
          background: `rgba(from ${color} r g b / 0.1)`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Icon size={40} color={color} />
        </div>
        <h2 className="mono" style={{ fontSize: '3rem', lineHeight: 1, color }}>
          {result.score}
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>/100</span>
        </h2>
        <div className={`risk-badge risk-${result.level.toLowerCase()}`} style={{ marginTop: '12px' }}>
          {result.level} RISK
        </div>
      </div>

      <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
          AI Recommendation
        </h4>
        <p style={{ fontSize: '1.1rem' }}>{result.recommendation}</p>
      </div>
      
      <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Assessment ID: #{result.assessmentId}
      </div>
    </div>
  );
}
