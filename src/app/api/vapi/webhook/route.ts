import { NextResponse } from "next/server";
import type { ServerMessageToolCalls, ToolCall, ToolCallResult } from "@vapi-ai/web/dist/api";

import { generateAnswer } from "@/lib/rag/answer";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message =
    body && typeof body === "object"
      ? (body as { message?: ServerMessageToolCalls }).message
      : null;

  const toolCalls = message?.toolCallList ?? [];
  const results: ToolCallResult[] = await Promise.all(toolCalls.map(runToolCall));

  return NextResponse.json({ results });
}

async function runToolCall(toolCall: ToolCall): Promise<ToolCallResult> {
  const name = toolCall.function?.name ?? "answerQuestion";
  const question = extractQuestion(toolCall.function?.arguments);

  if (!question) {
    return {
      name,
      toolCallId: toolCall.id,
      error: "Missing or invalid 'question' argument.",
    };
  }

  try {
    const { answer, sources } = await generateAnswer(question);
    return {
      name,
      toolCallId: toolCall.id,
      result: answer,
      // Sent through to the client as-is (VAPI's ToolCallResult.metadata),
      // where useVapiCall attaches it to the spoken reply's chat bubble —
      // see src/lib/vapi/parseConversationUpdate.ts.
      metadata: {
        sources: sources.map((source) => ({
          documentName: source.document_name,
          similarity: source.similarity,
        })),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate an answer.";
    return { name, toolCallId: toolCall.id, error: message };
  }
}

/**
 * VAPI's SDK types declare `function.arguments` as a JSON string, but the
 * live webhook payload has been observed sending it as an already-parsed
 * object — so this accepts either form.
 */
function extractQuestion(rawArguments: unknown): string | null {
  let args: unknown = rawArguments;

  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch {
      return null;
    }
  }

  if (!args || typeof args !== "object") return null;

  const question = (args as Record<string, unknown>).question;
  return typeof question === "string" && question.trim() ? question : null;
}
