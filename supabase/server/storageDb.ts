import type { InsertRiskAssessment, RiskAssessment } from "@shared/schema";
import { nanoid } from "nanoid";

export class DatabaseStorage {
  async createRiskAssessment(
    assessment: InsertRiskAssessment,
  ): Promise<RiskAssessment> {
    if (!assessment.userId) {
      throw new Error("userId is required");
    }
    return {
      id: nanoid(),
      userId: assessment.userId,
      inputData: assessment.inputData,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      recommendation: (assessment as any).recommendation,
      createdAt: new Date(),
    };
  }

  async getRiskHistory(userId: string): Promise<RiskAssessment[]> {
    void userId;
    return [];
  }
}
