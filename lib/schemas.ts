import { z } from "zod";

// DebugRequest schema — validates the POST /api/debug request body
export const DebugRequestSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50_000, "Code exceeds 50,000 character limit"),
  error: z
    .string()
    .min(1, "Error message is required")
    .max(10_000, "Error exceeds 10,000 character limit"),
  language: z.enum(["javascript", "typescript"], {
    errorMap: () => ({ message: 'Language must be "javascript" or "typescript"' }),
  }),
});

export type DebugRequest = z.infer<typeof DebugRequestSchema>;

// ConfidenceResult schema — output of confidenceTool
export const ConfidenceResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  label: z.enum(["High", "Medium", "Low"]),
  reason: z.string().min(1),
});

export type ConfidenceResult = z.infer<typeof ConfidenceResultSchema>;

// Suggestion schema — a single actionable code improvement suggestion
export const SuggestionSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  before: z.string(),
  after: z.string(),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

// AnalysisResult schema — the full structured output of a completed agent run
export const AnalysisResultSchema = z.object({
  rootCause: z.string().min(1),
  confidence: z.number().int().min(0).max(100),
  confidenceLabel: z.enum(["High", "Medium", "Low"]),
  confidenceReason: z.string().min(1),
  suggestions: z.array(SuggestionSchema).min(3).max(5),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ApiError — shape of error responses returned by the API route
export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}
