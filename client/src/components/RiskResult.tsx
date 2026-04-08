import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import type { RiskResponse } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const getBadgeVariant = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "success";
      case "medium": return "warning";
      case "high":
      case "critical": return "destructive";
      default: return "default";
    }
  };

  if (!result) {
    return (
      <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl h-full min-h-[400px] flex flex-col items-center justify-center opacity-60">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground font-medium">Awaiting Analysis</p>
      </Card>
    );
  }

  const Icon = result.level.toLowerCase() === "low" ? CheckCircle :
    result.level.toLowerCase() === "medium" ? AlertTriangle : ShieldAlert;

  const color = getLevelColor(result.level);

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl h-full animate-in fade-in zoom-in-95 duration-500 flex flex-col relative overflow-hidden">
      {/* Top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color, boxShadow: `0 0 20px ${color}` }} />

      <CardContent className="flex-1 flex flex-col items-center justify-center p-8 pt-12">
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: `rgba(from ${color} r g b / 0.1)`,
          border: `1px solid rgba(from ${color} r g b / 0.2)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 30px rgba(from ${color} r g b / 0.2)`
        }}>
          <Icon size={48} color={color} />
        </div>

        <h2 className="font-mono text-6xl font-bold tracking-tighter" style={{ color }}>
          {result.score}
          <span className="text-xl text-muted-foreground ml-1">/100</span>
        </h2>

        <Badge variant={getBadgeVariant(result.level) as any} className="mt-4 px-3 py-1 text-sm font-bold uppercase tracking-widest shadow-lg">
          {result.level} RISK
        </Badge>

        <div className="mt-8 w-full bg-black/30 border border-white/5 p-5 rounded-xl backdrop-blur-sm">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            AI Recommendation
          </h4>
          <p className="text-lg font-medium leading-relaxed text-slate-200">{result.recommendation}</p>
        </div>

        <div className="mt-auto pt-8 text-xs font-mono text-muted-foreground/50 w-full text-center">
          Assessment ID: #{result.assessmentId}
        </div>
      </CardContent>
    </Card>
  );
}
