import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  AnalysisResultSchema,
  type AnalysisResult,
  type DebugRequest,
} from "./schemas";
import { confidenceTool } from "./tools/confidenceTool";
import { rootCauseTool } from "./tools/rootCauseTool";
import { suggestionTool } from "./tools/suggestionTool";

export class AgentError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "AgentError";
    this.status = status;
  }
}

const SYSTEM_PROMPT = `You are an expert code debugger. Analyze the provided code snippet and error message. 

You MUST use the following tools:
1. 'root_cause_tool': Submit diagnosis.
2. 'confidence_tool': Submit confidence score.
3. 'code_improvement_suggestion': Submit actionable improvements. CALL THIS 3-5 TIMES.

Only use tools. Do not provide text responses.`;

export async function createDebugAgent(
  request: DebugRequest,
): Promise<AnalysisResult> {
  const tools = [rootCauseTool, confidenceTool, suggestionTool];
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
  });

  // 1. Create the executor. This replaces the while loop and turn logic.
  const agent = createReactAgent({
    llm,
    tools,
    messageModifier: SYSTEM_PROMPT,
  });

  const userMessage = `Language: ${request.language}\nCode:\n\`\`\`${request.language}\n${request.code}\n\`\`\`\nError:\n${request.error}`;

  try {
    // 2. Invoke the agent. It will automatically call tools until it decides it's done.
    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: userMessage }],
      },
      {
        recursionLimit: 5,
      },
    );

    // 3. Extract tool outputs from the message history
    const toolMessages = result.messages.filter(
      (m: any) => m._getType() === "tool",
    );

    let rootCauseData, confidenceData;
    const suggestions: any[] = [];

    for (const msg of toolMessages) {
      const content =
        typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content;

      // Map back to your data structures based on the tool name in the message
      // Note: check your tool definitions for the exact name property
      if (msg.name === "root_cause_tool") rootCauseData = content;
      if (msg.name === "confidence_tool") confidenceData = content;
      if (msg.name === "code_improvement_suggestion") suggestions.push(content);
    }

    // Validation
    if (!rootCauseData || !confidenceData || suggestions.length < 3) {
      throw new AgentError(
        "Agent failed to provide complete tool-based analysis.",
      );
    }

    const finalResult = {
      rootCause: `${rootCauseData.pattern}. ${rootCauseData.explanation} Mechanism: ${rootCauseData.errorMechanism}`,
      confidence: confidenceData.score,
      confidenceLabel: confidenceData.label,
      confidenceReason: confidenceData.reason,
      suggestions: suggestions.slice(0, 5).map((s) => ({
        title: s.title,
        explanation: s.explanation,
        before: s.before,
        after: s.after,
      })),
    };

    return AnalysisResultSchema.parse(finalResult);
  } catch (err: any) {
    if (err instanceof AgentError) throw err;
    
    // Handle 429 Too Many Requests / Quota Exceeded
    if (err.status === 429 || err.message?.includes("429") || err.message?.toLowerCase().includes("quota exceeded")) {
      console.error("Rate limit or quota exceeded:", err);
      throw new AgentError(
        "AI model rate limit or quota exceeded. Please wait a moment or check your API key status.",
        429
      );
    }
    
    console.error("Agent execution error:", err);
    throw new AgentError("Analysis failed. Please try again later.");
  }
}
