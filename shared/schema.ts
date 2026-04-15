import { z } from "zod";

// Supabase-friendly shapes (used by the UI via supabase-js).
// Note: These are application-level types; the database schema is defined in SQL.
export const riskAssessmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  inputData: z.unknown(),
  riskScore: z.number().int(),
  riskLevel: z.string(),
  recommendation: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;

export const insertRiskAssessmentSchema = riskAssessmentSchema
  .omit({ id: true, createdAt: true })
  .extend({
    // createdAt/userId are optional on insert because the database defaults can fill them.
    userId: z.string().optional(),
  });

export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;

// API Types
export const riskInputSchema = z.object({
  transactionAmount: z.number().min(0),
  merchantCategory: z.string(),
  merchantName: z.string().optional(),
  paymentDescription: z.string().optional(),
  paymentFrequency: z.enum(["one-time", "weekly", "monthly", "quarterly", "semi-annual", "annual"]).optional(),
  isSubscription: z.boolean().optional(),
  isInternational: z.boolean(),
  previousChargebacks: z.number().min(0)
});

export type RiskInput = z.infer<typeof riskInputSchema>;

export type RiskResponse = {
  score: number;
  level: string;
  recommendation: string;
  assessmentId: string;
};

// ── Financial Analysis Types ──────────────────────────────────────

export const transactionEntrySchema = z.object({
  date: z.string(),
  description: z.string(),
  merchant: z.string().optional(),
  amount: z.number(),
  type: z.enum(["debit", "credit"]),
  category: z.string().optional(),
  category_confidence: z.number().optional(),
  category_method: z.string().optional(),
  balance: z.number().optional(),
});
export type TransactionEntry = z.infer<typeof transactionEntrySchema>;

export const categorySummarySchema = z.object({
  category: z.string(),
  total: z.number(),
  count: z.number(),
});
export type CategorySummary = z.infer<typeof categorySummarySchema>;

export const recurringPaymentSchema = z.object({
  merchant: z.string(),
  category: z.string().nullable(),
  amount_avg: z.number(),
  amount_range: z.object({ min: z.number(), max: z.number() }),
  frequency: z.object({
    type: z.string(),
    avg_days: z.number(),
    confidence: z.number(),
  }),
  occurrences: z.number(),
  last_date: z.string(),
  next_expected: z.string(),
  amount_consistency: z.number(),
  is_autopay: z.boolean(),
  monthly_cost: z.number(),
  annual_cost: z.number(),
  dates: z.array(z.string()),
});
export type RecurringPayment = z.infer<typeof recurringPaymentSchema>;

export const debtTrapFlagSchema = z.object({
  type: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  metric: z.number(),
});
export type DebtTrapFlag = z.infer<typeof debtTrapFlagSchema>;

export const fyPredictionSchema = z.object({
  current_fy: z.string(),
  predicted_fy: z.string(),
  total_predicted: z.number(),
  category_predictions: z.array(z.object({
    category: z.string(),
    current_fy_total: z.number(),
    predicted_total: z.number(),
    change_pct: z.number(),
    trend: z.enum(["increasing", "decreasing", "stable"]),
    monthly_breakdown: z.array(z.number()),
    confidence: z.number(),
  })),
  monthly_totals: z.object({
    current: z.array(z.number()),
    predicted: z.array(z.number()),
  }),
  insights: z.array(z.string()),
  data_quality: z.object({
    fiscal_years_covered: z.number(),
    total_transactions: z.number(),
    months_of_data: z.number(),
    reliability: z.string(),
  }),
});
export type FYPrediction = z.infer<typeof fyPredictionSchema>;

export const pdfAnalysisResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  analyzed_at: z.string(),
  file_reports: z.array(z.object({
    filename: z.string(),
    bank: z.string().optional(),
    transactions: z.number(),
    period: z.object({ start: z.string(), end: z.string() }).optional().nullable(),
    pages: z.number().optional(),
    error: z.string().optional(),
  })),
  account_info: z.object({
    account_number: z.string().nullable().optional(),
    account_name: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
    ifsc: z.string().nullable().optional(),
    bank: z.string().optional(),
  }).nullable().optional(),
  summary: z.object({
    total_transactions: z.number(),
    total_debit: z.number(),
    total_credit: z.number(),
    net_flow: z.number(),
    categories_found: z.number(),
  }),
  transactions: z.array(transactionEntrySchema),
  category_summary: z.array(categorySummarySchema),
  recurring_payments: z.array(recurringPaymentSchema),
  debt_traps: z.array(debtTrapFlagSchema),
  prediction: fyPredictionSchema,
  storage_warning: z.string().optional(),
  llm_analysis: z.string().optional(),
});
export type PDFAnalysisResponse = z.infer<typeof pdfAnalysisResponseSchema>;
