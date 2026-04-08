import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";

export type TransactionRow = {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  channel: string;
  status: string;
  riskFlag: string;
  txnType?: string;
  source?: "manual" | "pdf";
};

export function useTransactions() {
  return useQuery({
    queryKey: ["supabase", "transactions"],
    queryFn: async (): Promise<TransactionRow[] | null> => {
      const supabase = requireSupabase();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      // Fetch from both tables in parallel
      const [manualResult, parsedResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,date,merchant,category,amount,channel,status,risk_flag")
          .order("date", { ascending: false })
          .limit(10000),
        supabase
          .from("parsed_transactions")
          .select("id,date,description,merchant,category,amount,txn_type,category_method")
          .order("date", { ascending: false })
          .limit(10000),
      ]);

      const manualRows: TransactionRow[] = (manualResult.data ?? []).map((r: any) => ({
        id: String(r.id).slice(0, 8),
        date: String(r.date),
        merchant: String(r.merchant),
        category: String(r.category),
        amount: Number(r.amount ?? 0),
        channel: String(r.channel),
        status: String(r.status),
        riskFlag: String(r.risk_flag ?? "Low"),
        source: "manual" as const,
      }));

      // Extract rows from parsed_transactions
      const parsedRows: TransactionRow[] = (parsedResult.data ?? []).map((r: any) => ({
        id: String(r.id).slice(0, 8),
        date: String(r.date),
        merchant: String(r.merchant || r.description),
        category: String(r.category),
        amount: Number(r.amount ?? 0),
        channel: String(r.category_method ?? "pdf"),
        status: r.txn_type === "credit" ? "Credit" : "Debit",
        riskFlag: "Low",
        txnType: String(r.txn_type),
        source: "pdf" as const,
      }));

      // Merge and sort by date descending
      const all = [...manualRows, ...parsedRows];
      all.sort((a, b) => b.date.localeCompare(a.date));
      return all;
    },
  });
}
