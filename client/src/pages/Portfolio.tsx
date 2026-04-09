import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { usePortfolioAccounts, usePortfolioAllocations } from "@/hooks/use-portfolio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PortfolioPage() {
  const { data: allocations, isLoading: allocationsLoading } = usePortfolioAllocations();
  const { data: accounts, isLoading: accountsLoading } = usePortfolioAccounts();

  const allocation = allocations ?? [];
  const accountRows = accounts ?? [];

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Portfolio</h1>
          <p className="text-muted-foreground">Allocation, balances, and account health at a glance.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle>Strategic Allocation</CardTitle>
            <CardDescription>Current asset distribution across accounts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[240px] w-full md:w-1/2">
              {allocationsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : allocation.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm text-center">
                  No allocation data yet. Add rows to Supabase table <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded mx-1">portfolio_allocations</span>.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>
                      {allocation.map((entry) => (
                        <Cell key={entry.id ?? entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "rgba(18,18,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                      labelStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="w-full md:w-1/2 space-y-4">
              {allocation.map((a) => (
                <div key={a.id ?? a.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ background: a.color }} />
                    <span className="text-sm font-medium">{a.name}</span>
                  </div>
                  <span className="font-mono font-bold">{a.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Active financial product balances</CardDescription>
          </CardHeader>
          <CardContent>
            {accountsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : accountRows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No accounts yet. Add rows to Supabase table <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">portfolio_accounts</span>.
              </div>
            ) : (
              <div className="rounded-md border border-white/10 bg-black/20">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10">
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountRows.map((a) => (
                      <TableRow key={a.id ?? a.name} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium text-white">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground">{a.type}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {a.balance < 0 ? "-" : ""}₹{Math.abs(a.balance).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-white/10 text-muted-foreground font-normal">{a.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
