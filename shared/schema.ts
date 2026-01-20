import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We'll store a local reference to the risk assessments
// The user identity is managed by Supabase, we just store the user_id (string) from the JWT
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // From Supabase Auth
  inputData: jsonb("input_data").notNull(), // The data being assessed
  riskScore: integer("risk_score").notNull(), // 0-100
  riskLevel: text("risk_level").notNull(), // Low, Medium, High, Critical
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({ 
  id: true, 
  createdAt: true 
});

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;

// API Types
export const riskInputSchema = z.object({
  transactionAmount: z.number().min(0),
  merchantCategory: z.string(),
  isInternational: z.boolean(),
  previousChargebacks: z.number().min(0)
});

export type RiskInput = z.infer<typeof riskInputSchema>;

export type RiskResponse = {
  score: number;
  level: string;
  recommendation: string;
  assessmentId: number;
};
