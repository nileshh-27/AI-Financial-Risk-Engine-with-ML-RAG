import { useMemo } from "react";
import { useRiskHistory } from "@/hooks/use-risk";
import { TriangleAlert, ShieldAlert, BellRing, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function toDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AlertsPage() {
  const { data: history, isLoading } = useRiskHistory();

  const alerts = useMemo(() => {
    const items = (history ?? [])
      .filter((h) => (h.riskLevel ?? "").toLowerCase() === "high")
      .slice(0, 10)
      .map((h) => {
        const input = (h.inputData ?? {}) as any;
        return {
          id: `AL-${h.id}`,
          title: "High-risk transaction flagged",
          detail: `${input.merchantCategory ?? "Unknown"} • ₹${Number(input.transactionAmount ?? 0).toFixed(2)}`,
          severity: "High" as const,
          time: toDate(h.createdAt)?.toLocaleString() ?? "—",
        };
      });

    return items;
  }, [history]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Alerts</h1>
          <p className="text-muted-foreground">Actionable alerts, compliance signals, and operational notices.</p>
        </div>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              Inbox
            </CardTitle>
            <CardDescription>Recent high-risk signals from the engine</CardDescription>
          </div>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {alerts.length === 0 && !isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No alerts yet. Run some risk assessments to generate high-risk flags.
              </div>
            ) : alerts.map((a) => {
              const severity = a.severity.toLowerCase();
              const icon = severity === "high" ? <ShieldAlert className="h-5 w-5 text-destructive" /> : severity === "medium" ? <TriangleAlert className="h-5 w-5 text-warning" /> : <BellRing className="h-5 w-5 text-primary" />;

              return (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-background/50 p-2 rounded-lg border border-white/5">
                      {icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white tracking-tight">{a.title}</span>
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 border-white/10 text-muted-foreground">{a.id}</Badge>
                        <Badge variant={severity === "high" ? "destructive" : "default"} className="text-[10px] px-1.5 h-5 shadow-sm">
                          {a.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.detail}</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground sm:text-right whitespace-nowrap pl-12 sm:pl-0">
                    {a.time}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
