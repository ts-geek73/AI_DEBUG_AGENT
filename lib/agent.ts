import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { rootCauseTool } from "./tools/rootCauseTool";
import { confidenceTool } from "./tools/confidenceTool";
import { suggestionTool } from "./tools/suggestionTool";
import { parseAnalysisResult } from "./parser";
import type { DebugRequest, AnalysisResult } from "./schemas";

export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentError";
  }
}

const SYSTEM_PROMPT = `You are an AI debug agent. Your job is to analyze a code snippet and error message by calling three tools in a strict order, then emit a final JSON result.

## Tool Execution Order (MANDATORY)

You MUST call the tools in this exact order:

1. **rootCauseTool** — Call this FIRST with the code snippet, error message, and language. It returns a 2–4 sentence root cause diagnosis string.

2. **confidenceTool** — Call this SECOND with the root cause string returned by rootCauseTool. It returns a JSON object with score, label, and reason.

3. **suggestionTool** — Call this THIRD with the original code snippet and the root cause string from rootCauseTool. It returns an array of 3–5 improvement suggestions.

## Rules

- Call each tool EXACTLY ONCE. Do not call any tool more than once.
- Do not skip any tool.
- Do not call confidenceTool or suggestionTool before rootCauseTool has returned.
- Pass the root cause string from rootCauseTool directly to both confidenceTool and suggestionTool.
- Pass the ORIGINAL code (from the user's request) to suggestionTool, not any modified version.

## Final Output

After all three tools have returned results, emit a final JSON block (wrapped in \`\`\`json ... \`\`\`) that conforms to this schema:

\`\`\`json
{
  "rootCause": "<the root cause string from rootCauseTool>",
  "confidence": <integer score 0–100 from confidenceTool>,
  "confidenceLabel": "<High|Medium|Low from confidenceTool>",
  "confidenceReason": "<reason string from confidenceTool>",
  "suggestions": [
    {
      "title": "<suggestion title>",
      "explanation": "<explanation>",
      "before": "<original code snippet>",
      "after": "<improved code snippet>"
    }
  ]
}
\`\`\`

The JSON block must be the LAST thing you output. Do not add any text after the closing code fence.`;

export async function createDebugAgent(
  request: DebugRequest
): Promise<AnalysisResult> {
  const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash-lite" });
  const tools = [rootCauseTool, confidenceTool, suggestionTool];

  const agent = createReactAgent({
    llm,
    tools,
    stateModifier: SYSTEM_PROMPT,
  });

  const userMessage = `Please analyze the following code error.

Language: ${request.language}

Code:
\`\`\`${request.language}
${request.code}
\`\`\`

Error:
${request.error}

Call rootCauseTool first, then confidenceTool with the root cause, then suggestionTool with the original code and root cause. Finally, emit the AnalysisResult JSON block.`;

  // Timeout: abort if the agent takes longer than 60 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const result = await agent.invoke(
      { messages: [new HumanMessage(userMessage)] },
      {
        // Cap the ReAct loop at 10 iterations (3 tools + a few LLM turns + buffer)
        // prevents infinite tool-calling loops
        recursionLimit: 10,
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    // Extract the final message content from the agent's response
    const messages = result.messages as Array<{ content: unknown }>;
    const finalMessage = messages[messages.length - 1];
    const content = finalMessage.content;

    let outputText: string;
    if (typeof content === "string") {
      outputText = content;
    } else if (Array.isArray(content)) {
      // Handle array content (text blocks)
      outputText = (content as Array<{ type: string; text?: string }>)
        .filter((part) => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text as string)
        .join("");
    } else {
      outputText = String(content);
    }

    return parseAnalysisResult(outputText);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof AgentError) {
      throw err;
    }
    throw new AgentError("Analysis failed. Please try again.");
  }
}
