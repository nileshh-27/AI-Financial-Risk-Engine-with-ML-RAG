import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, riskInputSchema } from "@shared/routes";
import { z } from "zod";

// Simple helper to calculate risk
function calculateRisk(input: z.infer<typeof riskInputSchema>) {
  let score = 10; // Base risk

  if (input.transactionAmount > 5000) score += 20;
  if (input.transactionAmount > 10000) score += 20;
  if (input.transactionAmount > 50000) score += 20;

  if (input.isInternational) score += 30;

  const riskyCategories = ['gambling', 'crypto', 'jewelry'];
  if (riskyCategories.includes(input.merchantCategory.toLowerCase())) {
    score += 40;
  }

  score += (input.previousChargebacks * 50);

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  let level = 'Low';
  let recommendation = 'Approve';

  if (score > 75) {
    level = 'High';
    recommendation = 'Decline';
  } else if (score > 30) {
    level = 'Medium';
    recommendation = 'Manual Review';
  }

  return { score, level, recommendation };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Middleware to check for Auth header
  // In a real app, we would verify the JWT signature here using Supabase Admin or JWT secret
  const checkAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }
    // For this MVP, we decode the token simply to extract user ID if possible, 
    // or just pass through. verification should happen with Supabase library.
    // We'll trust the presence of the token for the "Call Risk API" requirement demonstration.
    // We'll use a mock user ID if we can't decode.
    req.user = { id: 'demo-user-id' }; 
    next();
  };

  app.post(api.risk.assess.path, checkAuth, async (req, res) => {
    try {
      const input = riskInputSchema.parse(req.body);
      const { score, level, recommendation } = calculateRisk(input);

      // Persist the assessment
      const assessment = await storage.createRiskAssessment({
        userId: (req as any).user.id,
        inputData: input,
        riskScore: score,
        riskLevel: level
      });

      res.json({
        score,
        level,
        recommendation,
        assessmentId: assessment.id
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get(api.risk.history.path, checkAuth, async (req, res) => {
    try {
      const history = await storage.getRiskHistory((req as any).user.id);
      res.json(history);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // Seed some data? 
  // We can't really seed user-specific data easily without real user IDs.
  // We'll rely on the user creating data via the UI.

  return httpServer;
}
