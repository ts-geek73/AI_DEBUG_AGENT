import { NextResponse } from "next/server";
import { DebugRequestSchema } from "@/lib/schemas";
import { createDebugAgent, AgentError } from "@/lib/agent";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
    console.log(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = DebugRequestSchema.safeParse(body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as string;
      if (field && !fields[field]) {
        fields[field] = issue.message;
      }
    });
    return NextResponse.json(
      { error: "Validation failed", fields },
      { status: 422 }
    );
  }
  console.log("Calling Agents")

  // 3. Invoke agent
  try {
    const analysis = await createDebugAgent(result.data);
    console.log(analysis)
    return NextResponse.json(analysis, { status: 200 });
  } catch (err) {
    if (err instanceof AgentError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
