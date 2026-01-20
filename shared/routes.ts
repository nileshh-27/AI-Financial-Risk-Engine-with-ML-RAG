import { z } from 'zod';
import { riskAssessments, riskInputSchema } from './schema';

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
          assessmentId: z.number(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/risk/history',
      responses: {
        200: z.array(z.custom<typeof riskAssessments.$inferSelect>()),
        401: errorSchemas.unauthorized,
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
