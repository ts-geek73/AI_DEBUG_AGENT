import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const ConfidenceSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string().min(5),
});

type ConfidenceInput = z.infer<typeof ConfidenceSchema>;

type ConfidenceLabel = "High" | "Medium" | "Low";

interface ConfidenceResult {
  score: number;
  label: ConfidenceLabel;
  reason: string;
}

const deriveLabel = (score: number): ConfidenceLabel => {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
};

export const confidenceTool = new DynamicStructuredTool({
  name: "confidence_tool",

  description: `
Assess confidence level for a diagnosis or reasoning result.
Use this tool whenever confidence scoring is required.
`,

  schema: ConfidenceSchema,

  func: async (input): Promise<string> => {
    const validatedInput = ConfidenceSchema.parse(input);

    const result: ConfidenceResult = {
      score: validatedInput.score,
      label: deriveLabel(validatedInput.score),
      reason: validatedInput.reason,
    };

    return JSON.stringify(result);
  },
});
