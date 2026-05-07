import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const RootCauseSchema = z.object({
  pattern: z.string().min(5).describe("Exact code pattern responsible"),

  explanation: z
    .string()
    .min(20)
    .describe("Why the pattern produces the observed error"),

  errorMechanism: z
    .string()
    .min(20)
    .describe("Technical runtime or compile-time mechanism"),

  confidence: z.number().min(0).max(100).describe("Confidence score"),
});

export const rootCauseTool = new DynamicStructuredTool({
  name: "root_cause_tool",

  description: `
Analyze the code failure and identify the root cause.
Do not provide fixes.
`,

  schema: RootCauseSchema,

  func: async (input) => {
    const validated = RootCauseSchema.parse(input);

    return JSON.stringify(validated);
  },
});
