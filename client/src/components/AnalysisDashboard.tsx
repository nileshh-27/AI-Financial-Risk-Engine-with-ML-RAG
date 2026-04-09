import { useState } from "react";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
    TrendingUp, TrendingDown, Minus, Calendar, IndianRupee,
    AlertTriangle, RefreshCcw, ShieldAlert, BarChart3, FileText,
    ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PDFAnalysisResponse, RecurringPayment, DebtTrapFlag } from "@shared/schema";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Landmark } from "lucide-react";

const COLORS = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#06b6d4", "#3b82f6",
];

const MONTH_LABELS = [
    "Apr", "May", "Jun", "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
];

interface AnalysisDashboardProps {
    result: PDFAnalysisResponse;
}

export function AnalysisDashboard({ result }: AnalysisDashboardProps) {
    const accountInfo = result.account_info || (result.summary as any)?.account_info;
    const transactions = result.transactions || (result.summary as any)?.transactions || [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Account Info */}
            {accountInfo && (
                <AccountInfoCard info={accountInfo} />
            )}

            {/* Summary Cards */}
            <SummaryCards result={result} />

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryPieChart data={result.category_summary} />
                <CategoryTable data={result.category_summary} totalDebit={result.summary.total_debit} />
            </div>

            {/* Recurring Payments */}
            {result.recurring_payments.length > 0 && (
                <RecurringPaymentsCard payments={result.recurring_payments} />
            )}

            {/* Debt Trap Warnings */}
            {result.debt_traps.length > 0 && (
                <DebtTrapAlerts traps={result.debt_traps} />
            )}

            {/* FY Prediction */}
            {result.prediction && result.prediction.current_fy !== "N/A" && (
                <FYPredictionChart prediction={result.prediction} />
            )}

            {/* Transactions Table */}
            <TransactionsTable transactions={transactions} />

            {/* File Reports */}
            <FileReports reports={result.file_reports} />
        </div>
    );
}

/* ── Account Info ─────────────────────────────────────────────── */
function AccountInfoCard({ info }: { info: NonNullable<PDFAnalysisResponse["account_info"]> }) {
    if (!info.account_number && !info.account_name) return null;
    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Landmark className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-1">
                            {info.bank ? info.bank.replace("_", " ") : "Bank Account Details"}
                        </h3>
                        <p className="text-xl font-bold font-mono text-white/90">
                            {info.account_number || "A/C Not Found"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-8">
                    {info.account_name && (
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Account Holder</p>
                            <p className="font-semibold text-white truncate max-w-[200px]" title={info.account_name}>
                                {info.account_name}
                            </p>
                        </div>
                    )}
                    {info.branch && (
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Branch</p>
                            <p className="font-medium text-white truncate max-w-[150px]">{info.branch}</p>
                        </div>
                    )}
                    {info.ifsc && (
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">IFSC</p>
                            <p className="font-mono text-white">{info.ifsc}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Summary Cards ────────────────────────────────────────────── */
function SummaryCards({ result }: { result: PDFAnalysisResponse }) {
    const { summary, recurring_payments, debt_traps } = result;

    const cards = [
        {
            label: "Total Transactions",
            value: summary.total_transactions.toLocaleString(),
            icon: FileText,
            color: "text-blue-400",
        },
        {
            label: "Total Debits",
            value: `₹${summary.total_debit.toLocaleString("en-IN")}`,
            icon: ArrowUpRight,
            color: "text-red-400",
        },
        {
            label: "Total Credits",
            value: `₹${summary.total_credit.toLocaleString("en-IN")}`,
            icon: ArrowDownRight,
            color: "text-green-400",
        },
        {
            label: "Recurring Payments",
            value: recurring_payments.length.toString(),
            icon: RefreshCcw,
            color: "text-purple-400",
        },
        {
            label: "Debt Trap Alerts",
            value: debt_traps.length.toString(),
            icon: ShieldAlert,
            color: debt_traps.length > 0 ? "text-red-400" : "text-green-400",
        },
        {
            label: "Categories Found",
            value: summary.categories_found.toString(),
            icon: BarChart3,
            color: "text-cyan-400",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {cards.map((card) => (
                <Card key={card.label} className="bg-card/40 backdrop-blur-xl border-white/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                            <span className="text-xs text-muted-foreground">{card.label}</span>
                        </div>
                        <p className="text-lg font-bold font-mono text-white">{card.value}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/* ── Category Pie Chart ───────────────────────────────────────── */
function CategoryPieChart({ data }: { data: PDFAnalysisResponse["category_summary"] }) {
    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardHeader>
                <CardTitle className="text-base">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={110}
                            innerRadius={60}
                            paddingAngle={2}
                            strokeWidth={0}
                        >
                            {data.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: "rgba(0,0,0,0.85)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 8,
                                color: "#fff",
                            }}
                            formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Amount"]}
                        />
                        <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px" }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

/* ── Category Table ───────────────────────────────────────────── */
function CategoryTable({ data, totalDebit }: { data: PDFAnalysisResponse["category_summary"]; totalDebit: number }) {
    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardHeader>
                <CardTitle className="text-base">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {data.map((cat, i) => {
                        const pct = totalDebit > 0 ? (cat.total / totalDebit) * 100 : 0;
                        return (
                            <div key={cat.category} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <div
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ background: COLORS[i % COLORS.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium truncate">{cat.category}</span>
                                        <span className="text-sm font-mono font-bold text-white">
                                            ₹{cat.total.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-10 text-right">
                                            {pct.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Recurring Payments ───────────────────────────────────────── */
function RecurringPaymentsCard({ payments }: { payments: RecurringPayment[] }) {
    const [expanded, setExpanded] = useState(false);
    const displayed = expanded ? payments : payments.slice(0, 5);

    const totalMonthly = payments.reduce((sum, p) => sum + p.monthly_cost, 0);
    const totalAnnual = payments.reduce((sum, p) => sum + p.annual_cost, 0);

    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCcw className="h-5 w-5 text-purple-400" />
                            Recurring Payments
                        </CardTitle>
                        <CardDescription>
                            {payments.length} recurring payments detected •
                            ₹{totalMonthly.toLocaleString("en-IN")}/month •
                            ₹{totalAnnual.toLocaleString("en-IN")}/year
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-white/10 bg-black/20 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-white/10">
                                <TableHead>Merchant</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Next Expected</TableHead>
                                <TableHead className="text-right">Monthly Cost</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayed.map((payment, i) => (
                                <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white text-sm">{payment.merchant}</span>
                                            {payment.is_autopay && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-400">
                                                    AUTO
                                                </Badge>
                                            )}
                                        </div>
                                        {payment.category && (
                                            <span className="text-xs text-muted-foreground">{payment.category}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        ₹{payment.amount_avg.toLocaleString("en-IN")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs capitalize">
                                            {payment.frequency.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {payment.next_expected}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm font-bold text-white">
                                        ₹{payment.monthly_cost.toLocaleString("en-IN")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center" title={`${(payment.amount_consistency * 100).toFixed(0)}% consistent`}>
                                            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${payment.amount_consistency * 100}%`,
                                                        background: payment.amount_consistency > 0.8 ? "#22c55e" : payment.amount_consistency > 0.5 ? "#eab308" : "#ef4444",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {payments.length > 5 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full mt-2 text-muted-foreground"
                    >
                        {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                        {expanded ? "Show less" : `Show ${payments.length - 5} more`}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/* ── Debt Trap Alerts ─────────────────────────────────────────── */
function DebtTrapAlerts({ traps }: { traps: DebtTrapFlag[] }) {
    const severityStyles: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
        critical: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "text-red-400", badge: "destructive" },
        high: { bg: "bg-orange-500/10", border: "border-orange-500/30", icon: "text-orange-400", badge: "destructive" },
        medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: "text-yellow-400", badge: "warning" },
        low: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "text-blue-400", badge: "secondary" },
    };

    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-400" />
                    Debt Trap Warnings
                </CardTitle>
                <CardDescription>
                    {traps.length} potential risk{traps.length > 1 ? "s" : ""} identified in your spending patterns
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {traps.map((trap, i) => {
                    const style = severityStyles[trap.severity] || severityStyles.low;
                    return (
                        <div
                            key={i}
                            className={`p-4 rounded-xl border ${style.bg} ${style.border} transition-all hover:scale-[1.01]`}
                        >
                            <div className="flex items-start gap-3">
                                <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${style.icon}`} />
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-white text-sm">{trap.title}</h4>
                                        <Badge variant={style.badge as any} className="text-[10px] uppercase font-bold">
                                            {trap.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{trap.description}</p>
                                    <div className="pt-1 border-t border-white/5">
                                        <p className="text-xs text-green-400/80">
                                            💡 {trap.recommendation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

/* ── FY Prediction Chart ──────────────────────────────────────── */
function FYPredictionChart({ prediction }: { prediction: PDFAnalysisResponse["prediction"] }) {
    const barData = MONTH_LABELS.map((month, i) => ({
        month,
        current: prediction.monthly_totals.current[i],
        predicted: prediction.monthly_totals.predicted[i],
    }));

    const TrendIcon = prediction.total_predicted > 0 ? TrendingUp : TrendingDown;

    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendIcon className="h-5 w-5 text-cyan-400" />
                            Fiscal Year Prediction
                        </CardTitle>
                        <CardDescription>
                            {prediction.current_fy} → {prediction.predicted_fy} •
                            Predicted total: ₹{prediction.total_predicted.toLocaleString("en-IN")}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="capitalize">
                        {prediction.data_quality.reliability} confidence
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Monthly Comparison Chart */}
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                            contentStyle={{
                                background: "rgba(0,0,0,0.85)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 8,
                                color: "#fff",
                            }}
                            formatter={(value: number, name: string) => [
                                `₹${value.toLocaleString("en-IN")}`,
                                name === "current" ? prediction.current_fy : prediction.predicted_fy,
                            ]}
                        />
                        <Legend
                            formatter={(value) =>
                                value === "current" ? prediction.current_fy : prediction.predicted_fy
                            }
                        />
                        <Bar dataKey="current" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="predicted" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>

                {/* Category Predictions */}
                <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Category-wise Prediction</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {prediction.category_predictions.slice(0, 8).map((cat) => {
                            const TIcon = cat.trend === "increasing" ? TrendingUp :
                                cat.trend === "decreasing" ? TrendingDown : Minus;
                            const tColor = cat.trend === "increasing" ? "text-red-400" :
                                cat.trend === "decreasing" ? "text-green-400" : "text-muted-foreground";

                            return (
                                <div key={cat.category} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                                    <TIcon className={`h-3.5 w-3.5 shrink-0 ${tColor}`} />
                                    <span className="text-xs font-medium flex-1 truncate">{cat.category}</span>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        ₹{cat.predicted_total.toLocaleString("en-IN")}
                                    </span>
                                    <span className={`text-xs font-mono font-bold ${tColor}`}>
                                        {cat.change_pct > 0 ? "+" : ""}{cat.change_pct}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Insights */}
                {prediction.insights.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-white/5">
                        {prediction.insights.map((insight, i) => (
                            <p key={i} className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ── Transactions Table ───────────────────────────────────────── */
function TransactionsTable({ transactions = [] }: { transactions: PDFAnalysisResponse["transactions"] }) {
    const [showAll, setShowAll] = useState(false);
    const displayed = showAll ? transactions : transactions.slice(0, 20);

    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardHeader>
                <CardTitle className="text-base">
                    All Transactions ({transactions.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-white/10 bg-black/20 overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/10 sticky top-0 bg-card/90 backdrop-blur-sm z-10">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description / Merchant</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-center">Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayed.map((txn, i) => (
                                    <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                            {txn.date}
                                        </TableCell>
                                        <TableCell className="max-w-[250px]">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white truncate" title={txn.merchant || txn.description}>
                                                    {txn.merchant || "—"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground truncate" title={txn.description}>
                                                    {txn.description}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {txn.category || "—"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant={txn.type === "debit" ? "destructive" : "default"}
                                                className={`text-[10px] uppercase ${txn.type === "credit" ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : ""}`}
                                            >
                                                {txn.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold">
                                            <span className={txn.type === "debit" ? "text-red-400" : "text-green-400"}>
                                                {txn.type === "debit" ? "-" : "+"}₹{txn.amount.toLocaleString("en-IN")}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {transactions.length > 20 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAll(!showAll)}
                        className="w-full mt-2 text-muted-foreground"
                    >
                        {showAll ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                        {showAll ? "Show fewer" : `Show all ${transactions.length} transactions`}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/* ── File Reports ─────────────────────────────────────────────── */
function FileReports({ reports }: { reports: PDFAnalysisResponse["file_reports"] }) {
    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Processed Files</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {reports.map((report, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/5">
                            <FileText className="h-4 w-4 text-red-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{report.filename}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {report.bank && <span className="capitalize">{report.bank.replace("_", " ")}</span>}
                                    <span>•</span>
                                    <span>{report.transactions} transactions</span>
                                    {report.period && (
                                        <>
                                            <span>•</span>
                                            <span>{report.period.start} to {report.period.end}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {report.error ? (
                                <Badge variant="destructive" className="text-xs">Error</Badge>
                            ) : (
                                <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30">Parsed</Badge>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
