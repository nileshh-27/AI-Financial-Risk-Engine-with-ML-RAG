import type { Express } from "express";
import type { Server } from "http";
import http from "http";
import https from "https";
import { api, riskInputSchema, chatRequestSchema } from "@shared/routes";
import { z } from "zod";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:5002";

// Simple helper to calculate risk
function calculateRisk(input: z.infer<typeof riskInputSchema>) {
  let score = 10; // Base risk

  if (input.transactionAmount > 50000) score += 20;
  if (input.transactionAmount > 100000) score += 20;
  if (input.transactionAmount > 500000) score += 20;

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

  const tryGetSubFromBearer = (authHeader: string): string | null => {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const parts = token.split(".");
    if (parts.length < 2) return null;

    try {
      // Note: we do not verify signature here; this is a lightweight extraction for MVP.
      const payloadRaw = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadRaw) as { sub?: unknown };
      return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
  };

  // Middleware to check for Auth header
  const checkAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }
    const sub = tryGetSubFromBearer(authHeader);
    req.user = { id: sub ?? 'demo-user-id' };
    next();
  };

  app.post(api.risk.assess.path, checkAuth, async (req, res) => {
    try {
      const input = riskInputSchema.parse(req.body);
      const { score, level, recommendation } = calculateRisk(input);

      res.json({
        score,
        level,
        recommendation,
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
    res.status(501).json({ message: "Use Supabase risk_assessments table for history." });
  });

  // ML Risk Engine Endpoints (Stubs based on Indian Banking Context adaptation)
  app.post("/api/ingest/transactions", checkAuth, async (req, res) => {
    res.status(200).json({ message: "Transaction batch ingested successfully. Awaiting aggregation." });
  });

  app.get("/api/users/:id/monthly-features", checkAuth, async (req, res) => {
    res.status(200).json({
      userId: req.params.id,
      window: req.query.window || "12m",
      features: {
        total_credit: 150000,
        total_debit: 110000,
        net_cashflow: 40000,
        credit_debit_ratio: 1.36,
        avg_transaction_size: 2500,
        high_risk_txn_count: 2,
        number_of_days_balance_below_500: 1,
        upi_txn_count: 45
      }
    });
  });

  // ── Financial Analysis Engine Proxy Routes ──────────────────────

  // PDF Upload & Analysis — raw streaming proxy (no re-encoding)
  // Pipes the browser's multipart/form-data body directly to the Python backend.
  // This avoids Node's FormData/Blob re-encoding which Werkzeug rejects with 422.
  app.post(api.analysis.upload.path, checkAuth, (req: any, res) => {
    const targetUrl = new URL(`${PYTHON_BACKEND_URL}/api/analysis/upload`);
    const requestModule = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = requestModule.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: targetUrl.pathname,
        method: "POST",
        headers: {
          "content-type": req.headers["content-type"] || "",
          "content-length": req.headers["content-length"] || "",
          authorization: req.headers.authorization || "",
        },
      },
      (proxyRes) => {
        res.status(proxyRes.statusCode || 500);
        const ct = proxyRes.headers["content-type"];
        if (ct) res.setHeader("content-type", ct);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      console.error("Analysis upload proxy error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Failed to process PDF files",
          detail: err.message,
        });
      }
    });

    req.pipe(proxyReq);
  });

  // Prediction endpoint
  app.post(api.analysis.predict.path, checkAuth, async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const pyResponse = await fetch(`${PYTHON_BACKEND_URL}/api/analysis/predict`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      if (!pyResponse.ok) {
        const errorText = await pyResponse.text();
        return res.status(pyResponse.status).json({ message: errorText });
      }

      res.json(await pyResponse.json());
    } catch (err: any) {
      res.status(500).json({ message: "Prediction engine unavailable", detail: err.message });
    }
  });

  // Analysis history
  app.get(api.analysis.history.path, checkAuth, async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const pyResponse = await fetch(`${PYTHON_BACKEND_URL}/api/analysis-history`, {
        method: "GET",
        headers: { Authorization: authHeader },
      });

      if (!pyResponse.ok) {
        const errorText = await pyResponse.text();
        return res.status(pyResponse.status).json({ message: errorText });
      }

      res.json(await pyResponse.json());
    } catch (err: any) {
      res.status(500).json({ message: "Analysis history unavailable", detail: err.message });
    }
  });

  // Chatbot Integration via Python Backend
  app.post(api.chat.send.path, async (req, res) => {
    try {
      const { messages } = chatRequestSchema.parse(req.body);
      const authHeader = req.headers.authorization || "";

      const pyResponse = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!pyResponse.ok) {
        const errorText = await pyResponse.text();
        return res.status(pyResponse.status).json({ message: errorText });
      }

      res.json(await pyResponse.json());
    } catch (err) {
      console.error("Chat proxy error:", err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
      } else {
        res.status(500).json({ message: "Failed to communicate with AI model" });
      }
    }
  });

  return httpServer;
}
