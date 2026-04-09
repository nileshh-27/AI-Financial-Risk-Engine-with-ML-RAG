import { nanoid } from "nanoid";
import type { InsertRiskAssessment, RiskAssessment } from "@shared/schema";

export interface IStorage {
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  getRiskHistory(userId: string): Promise<RiskAssessment[]>;
}

class MemoryStorage implements IStorage {
  private assessments: RiskAssessment[] = [];

  async createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment> {
    if (!assessment.userId) {
      throw new Error("userId is required");
    }
    const now = new Date();
    const record: RiskAssessment = {
      id: nanoid(),
      userId: assessment.userId,
      inputData: assessment.inputData,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      recommendation: (assessment as any).recommendation,
      createdAt: now,
    };

    this.assessments.unshift(record);
    this.assessments = this.assessments.slice(0, 50);
    return record;
  }

  async getRiskHistory(userId: string): Promise<RiskAssessment[]> {
    return this.assessments.filter((a) => a.userId === userId);
  }
}
export const storage: IStorage = new MemoryStorage();
