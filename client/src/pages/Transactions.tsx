import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
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

function riskVariant(flag: string) {
  const level = flag.toLowerCase();
  if (level === "high") return "destructive";
  if (level === "medium") return "warning";
  return "default";
}

export default function TransactionsPage() {
  const { data, isLoading } = useTransactions();
  const rawTransactions = data ?? [];

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const transactions = useMemo(() => {
    if (!dateRange || (!dateRange.from && !dateRange.to)) return rawTransactions;
    return rawTransactions.filter(t => {
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
  }, [rawTransactions, dateRange]);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Transactions <span className="text-sm font-normal text-muted-foreground ml-2">(Fetched: {rawTransactions.length})</span></h1>
          <p className="text-muted-foreground">Operational ledger view with risk flags and status workflow.</p>
        </div>
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
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
        <CardHeader>
          <CardTitle>Transaction Ledger</CardTitle>
          <CardDescription>Recent banking activities (India region)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No transactions yet. Add rows to Supabase table <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">transactions</span>.
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-black/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="w-[100px]">Txn ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} className="border-white/5 data-[state=selected]:bg-muted/50 hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{t.date}</TableCell>
                      <TableCell className="font-medium text-white">{t.merchant}</TableCell>
                      <TableCell className="text-muted-foreground">{t.category}</TableCell>
                      <TableCell className="text-muted-foreground">{t.channel}</TableCell>
                      <TableCell className="text-right font-mono font-medium">₹{t.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-white/10 text-muted-foreground font-normal">{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={riskVariant(t.riskFlag) as any} className="font-semibold shadow-sm">{t.riskFlag}</Badge>
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
  );
}
