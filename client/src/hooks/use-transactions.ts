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

      const { data, error } = await supabase
        .from("transactions")
        .select("id,date,merchant,category,amount,channel,status,risk_flag")
        .order("date", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      const all: TransactionRow[] = (data ?? []).map((r: any) => ({
        id: String(r.id).slice(0, 8),
        date: String(r.date),
        merchant: String(r.merchant),
        category: String(r.category),
        amount: Number(r.amount ?? 0),
        channel: String(r.channel),
        status: String(r.status),
        riskFlag: String(r.risk_flag ?? "Low"),
        source: String(r.channel) === "pdf" ? "pdf" : "manual",
      }));

      return all;
    },
  });
}
