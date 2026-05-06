import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.0-flash" });

const SYSTEM_PROMPT = `You are a precise code debugger. Your task is to identify the root cause of a code error.

Rules:
- Return EXACTLY 2 to 4 sentences. No more, no fewer.
- Name the exact code pattern or line responsible for the error.
- Explain why that specific pattern produces the observed error.
- Do NOT suggest any fixes or improvements.
- Do NOT include phrases like "To fix this..." or "You should..." or "Consider...".
- Focus solely on diagnosis: what is wrong and why.`;

export const rootCauseTool = new DynamicStructuredTool({
  name: "rootCauseTool",
  description:
    "Identifies the root cause of a code error. Returns a 2–4 sentence diagnosis naming the exact code pattern responsible and explaining why it produces the observed error. Does not include fix suggestions.",
  schema: z.object({
    code: z.string().describe("The code snippet containing the error"),
    error: z.string().describe("The error message produced by the code"),
    language: z
      .enum(["javascript", "typescript"])
      .describe("The programming language of the code snippet"),
  }),
  func: async ({ code, error, language }) => {
    const userMessage = `Language: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Error:
${error}

Identify the root cause of this error in 2–4 sentences. Name the exact code pattern responsible and explain why it causes the error. Do not suggest any fixes.`;

    const response = await llm.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);

    const content = response.content;
    if (typeof content === "string") {
      return content.trim();
    }

    // Handle array content (e.g., tool use blocks)
    const textParts = (content as Array<{ type: string; text?: string }>)
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string);

    return textParts.join("").trim();
  },
});
