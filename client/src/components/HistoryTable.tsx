import type { RiskAssessment } from "@shared/schema";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function riskVariant(level: string) {
  const l = level.toLowerCase();
  if (l === "high" || l === "critical") return "destructive";
  if (l === "medium") return "warning";
  return "success";
}

interface HistoryTableProps {
  history: RiskAssessment[] | null | undefined;
  isLoading: boolean;
}

export function HistoryTable({ history, isLoading }: HistoryTableProps) {
  return (
    <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
      <CardHeader>
        <CardTitle>Recent Assessments</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No assessments recorded yet.
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-black/20">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-center">Risk Level</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => {
                  const input = item.inputData as { transactionAmount?: number; merchantCategory?: string };

                  return (
                    <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {item.createdAt ? format(new Date(item.createdAt), 'MMM d, HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">₹{input.transactionAmount?.toFixed(2) ?? "0.00"}</TableCell>
                      <TableCell className="text-muted-foreground">{input.merchantCategory ?? "Unknown"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={riskVariant(item.riskLevel) as any} className="font-semibold shadow-sm">{item.riskLevel}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-white">{item.riskScore}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
