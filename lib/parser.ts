import { AnalysisResultSchema, AnalysisResult } from "./schemas";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export function parseAnalysisResult(agentOutput: string): AnalysisResult {
  // 1. Try to extract JSON from markdown code fence first (```json ... ``` or ``` ... ```)
  const fenceMatch = agentOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
  let jsonString: string | null = null;

  if (fenceMatch) {
    jsonString = fenceMatch[1].trim();
  } else {
    // 2. Fall back to finding a raw JSON object (first { ... } block)
    const rawMatch = agentOutput.match(/\{[\s\S]*\}/);
    if (rawMatch) {
      jsonString = rawMatch[0].trim();
    }
  }

  if (!jsonString) {
    throw new ParseError(
      "No JSON block found in agent output. Expected a JSON object, optionally wrapped in markdown code fences."
    );
  }

  // 3. Parse the JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new ParseError(
      `Failed to parse JSON from agent output: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 4. Validate against AnalysisResultSchema
  const result = AnalysisResultSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ParseError(`Agent output failed schema validation: ${issues}`);
  }

  return result.data;
}
