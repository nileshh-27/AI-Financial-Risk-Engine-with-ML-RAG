import { db } from "./db";
import { riskAssessments, type InsertRiskAssessment, type RiskAssessment } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  getRiskHistory(userId: string): Promise<RiskAssessment[]>;
}

export class DatabaseStorage implements IStorage {
  async createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment> {
    const [result] = await db
      .insert(riskAssessments)
      .values(assessment)
      .returning();
    return result;
  }

  async getRiskHistory(userId: string): Promise<RiskAssessment[]> {
    return await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.userId, userId))
      .orderBy(desc(riskAssessments.createdAt))
      .limit(50);
  }
}

export const storage = new DatabaseStorage();
