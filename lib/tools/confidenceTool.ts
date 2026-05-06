import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { ConfidenceResultSchema, type ConfidenceResult } from "../schemas";

const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.0-flash" });

const SYSTEM_PROMPT = `You are a precise code analysis assistant. Your task is to assess the confidence level of a root cause diagnosis for a code error.

Rules:
- Return ONLY a valid JSON object with exactly two fields: "score" and "reason".
- "score" must be an integer between 0 and 100 (inclusive).
- "reason" must be a non-empty string explaining why you assigned that confidence score.
- Do NOT include any text outside the JSON object.
- Do NOT wrap the JSON in markdown code fences.

Example output:
{"score": 85, "reason": "The root cause clearly identifies a well-known JavaScript closure issue with a specific code pattern that directly matches the observed error."}`;

function deriveLabel(score: number): "High" | "Medium" | "Low" {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

export const confidenceTool = new DynamicStructuredTool({
  name: "confidenceTool",
  description:
    "Assesses the confidence level of a root cause diagnosis. Returns a JSON object with a numeric score (0–100), a label (High/Medium/Low), and a reason string explaining the confidence level.",
  schema: z.object({
    rootCause: z
      .string()
      .describe("The root cause diagnosis string produced by rootCauseTool"),
  }),
  func: async ({ rootCause }): Promise<string> => {
    const userMessage = `Root cause diagnosis:
${rootCause}

Assess the confidence level of this root cause diagnosis. Return a JSON object with:
- "score": an integer from 0 to 100 representing your confidence
- "reason": a string explaining why you assigned this confidence score

Return ONLY the JSON object, no other text.`;

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
        `confidenceTool: Claude returned invalid JSON: ${rawText}`
      );
    }

    // Extract score and reason from the parsed object
    const { score, reason } = parsed as { score: unknown; reason: unknown };

    // Validate score range before deriving label (Requirement 5.6)
    if (typeof score !== "number" || !Number.isInteger(score)) {
      throw new Error(
        `confidenceTool: score must be an integer, got: ${score}`
      );
    }
    if (score < 0 || score > 100) {
      throw new Error(
        `confidenceTool: score ${score} is outside the valid range [0, 100]`
      );
    }

    // Derive label from score (Requirements 5.3, 5.4, 5.5)
    const label = deriveLabel(score);

    // Build the full result object
    const result: ConfidenceResult = {
      score,
      label,
      reason: reason as string,
    };

    // Validate the full output with ConfidenceResultSchema (Requirement 5.1, 5.2)
    const validated = ConfidenceResultSchema.parse(result);

    return JSON.stringify(validated);
  },
});
