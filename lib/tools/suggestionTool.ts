import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { SuggestionSchema, type Suggestion } from "../schemas";

const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.0-flash" });

const SYSTEM_PROMPT = `You are a precise code improvement assistant. Your task is to generate actionable code improvement suggestions based on a root cause diagnosis.

Rules:
- Return ONLY a valid JSON array containing between 3 and 5 suggestion objects. No more, no fewer.
- Each suggestion object must have exactly four fields:
  - "title": a short, descriptive title for the suggestion (non-empty string)
  - "explanation": a clear explanation of what the suggestion does and why it helps (non-empty string)
  - "before": the original problematic code snippet (string, may be empty if not applicable)
  - "after": the improved code snippet showing the fix (string, may be empty if not applicable)
- Do NOT include any text outside the JSON array.
- Do NOT wrap the JSON in markdown code fences.

Example output:
[
  {
    "title": "Use const instead of var",
    "explanation": "Replacing var with const prevents accidental reassignment and avoids hoisting issues.",
    "before": "var count = 0;",
    "after": "const count = 0;"
  }
]`;

export const suggestionTool = new DynamicStructuredTool({
  name: "suggestionTool",
  description:
    "Generates 3–5 actionable code improvement suggestions based on the original code and a root cause diagnosis. Each suggestion includes a title, explanation, and before/after code snippets.",
  schema: z.object({
    code: z.string().describe("The original code snippet containing the error"),
    rootCause: z
      .string()
      .describe("The root cause diagnosis string produced by rootCauseTool"),
  }),
  func: async ({ code, rootCause }): Promise<string> => {
    const userMessage = `Code:
${code}

Root cause diagnosis:
${rootCause}

Generate between 3 and 5 actionable code improvement suggestions to address this root cause. Return a JSON array where each item has:
- "title": a short descriptive title
- "explanation": a clear explanation of what the suggestion does and why it helps
- "before": the original problematic code snippet
- "after": the improved code snippet

Return ONLY the JSON array, no other text.`;

    const response = await llm.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);

    // Extract text content from the response
    let rawText: string;
    const content = response.content;
    if (typeof content === "string") {
      rawText = content.trim();
    } else {
      const textParts = (content as Array<{ type: string; text?: string }>)
        .filter((part) => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text as string);
      rawText = textParts.join("").trim();
    }

    // Strip markdown code fences if present
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText;

    // Parse the JSON response from Claude
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(
        `suggestionTool: Claude returned invalid JSON: ${rawText}`
      );
    }

    // Validate that the result is an array
    if (!Array.isArray(parsed)) {
      throw new Error(
        `suggestionTool: expected a JSON array, got: ${typeof parsed}`
      );
    }

    // Validate array length (3–5 suggestions)
    if (parsed.length < 3 || parsed.length > 5) {
      throw new Error(
        `suggestionTool: expected 3–5 suggestions, got ${parsed.length}`
      );
    }

    // Validate each item against SuggestionSchema
    const suggestions: Suggestion[] = parsed.map((item, index) => {
      const result = SuggestionSchema.safeParse(item);
      if (!result.success) {
        throw new Error(
          `suggestionTool: suggestion at index ${index} failed validation: ${result.error.message}`
        );
      }
      return result.data;
    });

    return JSON.stringify(suggestions);
  },
});
