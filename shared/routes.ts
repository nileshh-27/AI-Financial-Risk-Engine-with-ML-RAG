import { z } from 'zod';
import { riskAssessmentSchema, riskInputSchema, pdfAnalysisResponseSchema, fyPredictionSchema } from './schema';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
});

export { riskInputSchema };

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  risk: {
    assess: {
      method: 'POST' as const,
      path: '/api/risk/assess',
      input: riskInputSchema,
      responses: {
        200: z.object({
          score: z.number(),
          level: z.string(),
          recommendation: z.string(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/risk/history',
      responses: {
        200: z.array(riskAssessmentSchema),
        401: errorSchemas.unauthorized,
      },
    },
  },
  analysis: {
    upload: {
      method: 'POST' as const,
      path: '/api/analysis/upload',
    },
    predict: {
      method: 'POST' as const,
      path: '/api/analysis/predict',
    },
    history: {
      method: 'GET' as const,
      path: '/api/analysis/history',
    },
  },
  chat: {
    send: {
      method: 'POST' as const,
      path: '/api/chat',
      input: chatRequestSchema,
      responses: {
        200: z.object({
          message: chatMessageSchema,
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
