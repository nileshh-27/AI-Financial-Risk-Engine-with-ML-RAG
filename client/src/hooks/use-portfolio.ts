import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";

export type PortfolioAllocation = {
  id: string;
  name: string;
  value: number;
  color: string;
};

export type PortfolioAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  status: string;
};

export function usePortfolioAllocations() {
  return useQuery({
    queryKey: ["supabase", "portfolio", "allocations"],
    queryFn: async (): Promise<PortfolioAllocation[] | null> => {
      const supabase = requireSupabase();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data, error } = await supabase
        .from("portfolio_allocations")
        .select("id,name,value,color,sort_order")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name),
        value: Number(r.value ?? 0),
        color: String(r.color ?? "#3b82f6"),
      }));
    },
  });
}

export function usePortfolioAccounts() {
  return useQuery({
    queryKey: ["supabase", "portfolio", "accounts"],
    queryFn: async (): Promise<PortfolioAccount[] | null> => {
      const supabase = requireSupabase();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data, error } = await supabase
        .from("portfolio_accounts")
        .select("id,name,type,balance,status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name),
        type: String(r.type),
        balance: Number(r.balance ?? 0),
        status: String(r.status ?? "Active"),
      }));
    },
  });
}
