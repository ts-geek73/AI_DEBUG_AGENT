import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const SuggestionSchema = z.object({
  category: z.enum([
    "performance",
    "readability",
    "type-safety",
    "architecture",
    "security",
    "maintainability",
  ]),

  title: z.string().min(5),

  explanation: z.string().min(20),

  impact: z.enum(["low", "medium", "high"]),

  before: z.string().min(1),

  after: z.string().min(1),
});

export const suggestionTool = new DynamicStructuredTool({
  name: "code_improvement_suggestion",

  description: `
Generate ONE actionable code improvement suggestion.
Focus on a single improvement area only.
`,

  schema: SuggestionSchema,

  func: async (input) => {
    const validated = SuggestionSchema.parse(input);

    return JSON.stringify(validated);
  },
});
