import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ShieldCheck, TrendingUp, IndianRupee, AlertTriangle, ArrowUpRight, ArrowDownRight, Landmark } from "lucide-react";
import { useRiskHistory } from "@/hooks/use-risk";
import { useAnalysisHistory } from "@/hooks/use-analysis";
import { useTransactions } from "@/hooks/use-transactions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function toDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toAmount(inputData: unknown): number {
  const input = (inputData ?? {}) as any;
  const n = Number(input.transactionAmount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toCategory(inputData: unknown): string {
  const input = (inputData ?? {}) as any;
  return String(input.merchantCategory ?? "Unknown");
}

export default function Dashboard() {
  const { data: history, isLoading: isHistoryLoading } = useRiskHistory();
  const { data: analysisHistory } = useAnalysisHistory();
  const { data: transactions, isLoading: isTxnLoading } = useTransactions();

  const isLoading = isHistoryLoading || isTxnLoading;

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const latestAnalysis = analysisHistory && analysisHistory.length > 0 ? analysisHistory[0] : null;

  const analytics = useMemo(() => {
    let rawManual = (history ?? []).slice().filter((h) => h);
    let rawTxn = transactions ?? [];

    if (dateRange && (dateRange.from || dateRange.to)) {
      rawManual = rawManual.filter(h => {
        const dateStr = h.createdAt ? new Date(h.createdAt).toISOString() : "";
        if (!dateStr) return false;
        const d = new Date(dateStr); d.setHours(0, 0, 0, 0);

        if (dateRange.from && dateRange.to) {
          const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
          const to = new Date(dateRange.to); to.setHours(0, 0, 0, 0);
          return d >= from && d <= to;
        }
        if (dateRange.from) {
          const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
          return d.getTime() === from.getTime();
        }
        return true;
      });
      rawTxn = rawTxn.filter(t => {
        let d = new Date(t.date);
        if (isNaN(d.getTime())) {
          const parts = t.date.split(/[-/]/);
          if (parts.length === 3) {
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            d = new Date(`${year}-${parts[1]}-${parts[0]}`);
          }
        }
        if (isNaN(d.getTime())) return true;

        d.setHours(0, 0, 0, 0);
        if (dateRange.from && dateRange.to) {
          const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
          const to = new Date(dateRange.to); to.setHours(0, 0, 0, 0);
          return d >= from && d <= to;
        }
        if (dateRange.from) {
          const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
          return d.getTime() === from.getTime();
        }
        return true;
      });
    }

    const scoredManual = rawManual
      .map((h) => ({
        id: h.id,
        score: Number(h.riskScore ?? 0),
        level: String(h.riskLevel ?? "Low"),
        amount: toAmount(h.inputData),
        category: toCategory(h.inputData),
        createdAt: toDate(h.createdAt),
      }));

    const scoredTxn = rawTxn.map((t) => ({
      id: t.id,
      score: t.riskFlag === "Critical" ? 95 : t.riskFlag === "High" ? 80 : t.riskFlag === "Medium" ? 50 : 10,
      level: t.riskFlag || "Low",
      amount: t.amount,
      category: t.category,
      createdAt: new Date(t.date),
    }));

    const scored = [...scoredManual, ...scoredTxn]
      .sort((a, b) => {
        const at = a.createdAt?.getTime() ?? 0;
        const bt = b.createdAt?.getTime() ?? 0;
        return at - bt;
      });

    const total = scored.length;
    const avgScore = total ? scored.reduce((s, x) => s + x.score, 0) / total : 0;
    const monitoredVolume = scored.reduce((s, x) => s + x.amount, 0);
    const high = scored.filter((x) => x.level.toLowerCase() === "high").length;
    const medium = scored.filter((x) => x.level.toLowerCase() === "medium").length;
    const low = Math.max(0, total - high - medium);

    const exposureIndex = Math.min(100, Math.round(avgScore + high * 2));
    const estimatedPrevented = Math.max(
      0,
      scored
        .filter((x) => x.level.toLowerCase() === "high")
        .reduce((s, x) => s + x.amount, 0) * 0.55,
    );

    const trend = scored.slice(-18).map((x) => ({
      t: x.createdAt
        ? x.createdAt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })
        : String(x.id),
      score: x.score,
    }));

    const distribution = [
      { name: "Low", value: low, color: "#10b981" },
      { name: "Medium", value: medium, color: "#f59e0b" },
      { name: "High", value: high, color: "#ef4444" },
    ];

    const categoryAgg = new Map<string, number>();
    for (const x of scored) {
      categoryAgg.set(x.category, (categoryAgg.get(x.category) ?? 0) + x.amount);
    }
    const categories = Array.from(categoryAgg.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      total,
      avgScore,
      monitoredVolume,
      high,
      exposureIndex,
      estimatedPrevented,
      trend,
      distribution,
      categories,
    };
  }, [history, transactions, dateRange]);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Overview</h1>
          <p className="text-muted-foreground">
            Executive view of monitoring coverage and risk exposure (India).
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date Range:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal bg-black/40 border-white/10 text-white",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {dateRange?.from && (
              <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)} className="h-8 w-8 text-muted-foreground hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isLoading ? <span className="text-muted-foreground text-sm">Loading…</span> : null}
        </div>
      </div>

      {!isLoading && analytics.total === 0 && !latestAnalysis ? (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl mt-8 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <ShieldCheck className="h-16 w-16 text-muted-foreground/50 mb-6" />
          <h2 className="text-2xl font-bold font-mono mb-2 text-white">Welcome to the Risk Engine</h2>
          <p className="text-muted-foreground mb-8 max-w-md">Your dashboard is currently empty. Head over to the Risk Engine to upload your bank statements or run a manual assessment to see your data.</p>
          <Button onClick={() => window.location.href = '/risk'} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Go to Risk Engine
          </Button>
        </Card>
      ) : (
        <>
          {latestAnalysis && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/10 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Landmark className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wider">
                  {latestAnalysis.summary?.account_info?.bank?.replace("_", " ").toUpperCase() || "BANK ACCOUNT"}
                </h3>
                <p className="font-mono text-muted-foreground text-sm">
                  {latestAnalysis.summary?.account_info?.account_number || "A/C details hidden"}
                  {latestAnalysis.summary?.account_info?.account_name ? ` • ${latestAnalysis.summary.account_info.account_name}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Monitored Cashflow</p>
              <div className="text-2xl font-bold font-mono text-white">
                {inr.format((latestAnalysis.summary?.total_credit || 0) + (latestAnalysis.summary?.total_debit || 0))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-black/40 border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold font-mono text-white">
                  {latestAnalysis.summary?.total_transactions || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Debits</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold font-mono text-red-400">
                  {inr.format(latestAnalysis.summary?.total_debit || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold font-mono text-green-400">
                  {inr.format(latestAnalysis.summary?.total_credit || 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold tracking-tight mb-4 font-mono">Real-time Risk Analytics</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monitored Volume</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{inr.format(analytics.monitoredVolume)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {analytics.total} assessed transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exposure Index</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{analytics.exposureIndex}/100</div>
            <p className="text-xs text-muted-foreground mt-1">Model score + high-risk weight</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Fraud Prevented</CardTitle>
            <ShieldCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-400">{inr.format(analytics.estimatedPrevented)}</div>
            <p className="text-xs text-muted-foreground mt-1">Heuristic estimate (demo)</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-400">{analytics.high}</div>
            <p className="text-xs text-muted-foreground mt-1">Require manual review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle>Risk Trend</CardTitle>
            <CardDescription>Average algorithmic score progression</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {analytics.trend.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm text-center">
                  No risk history yet. Run assessments to populate charts.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trend} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="t"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(18,18,24,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#riskFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Volume segmented by risk severity</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[240px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {analytics.distribution.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(18,18,24,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              {analytics.distribution.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-sm font-medium">{d.name}</span>
                  </div>
                  <span className="font-mono font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>Ranked by monitored volume (India)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {analytics.categories.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm text-center">
                No category data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categories} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(18,18,24,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
