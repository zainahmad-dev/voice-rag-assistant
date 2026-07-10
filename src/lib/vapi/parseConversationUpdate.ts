import { createId } from "@/lib/createId";
import type { ConversationMessage, ConversationSource } from "@/store/conversationStore";

interface ExtractResult {
  bubbles: ConversationMessage[];
  nextIndex: number;
  pendingSources: ConversationSource[] | undefined;
}

/**
 * VAPI's `conversation-update` event resends the call's *entire* message
 * history each time (typed loosely by the SDK — `role` is just `string`),
 * so this only converts the entries added since `startIndex`. A tool call
 * result carries our webhook's `metadata.sources` (see
 * src/app/api/vapi/webhook/route.ts); since the model speaks its answer in
 * the very next bot turn, that metadata is held in `pendingSources` and
 * attached to that turn, then cleared so it doesn't leak onto an unrelated
 * later reply (e.g. chit-chat that skipped the tool).
 */
export function extractNewMessages(
  allMessages: unknown[],
  startIndex: number,
  initialPendingSources: ConversationSource[] | undefined
): ExtractResult {
  const bubbles: ConversationMessage[] = [];
  let pendingSources = initialPendingSources;

  for (const entry of allMessages.slice(startIndex)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

    // ToolCallResultMessage: identified by toolCallId/result rather than
    // `role`, since the SDK's role field for it isn't a reliable literal.
    if (typeof record.toolCallId === "string" && typeof record.result === "string") {
      const metadata = record.metadata as { sources?: ConversationSource[] } | undefined;
      pendingSources = metadata?.sources;
      continue;
    }

    const content = typeof record.message === "string" ? record.message.trim() : "";
    if (!content) continue;

    if (record.role === "user") {
      bubbles.push({ id: createId(), role: "user", content });
    } else if (record.role === "bot") {
      bubbles.push({ id: createId(), role: "assistant", content, sources: pendingSources });
      pendingSources = undefined;
    }
  }

  return { bubbles, nextIndex: allMessages.length, pendingSources };
}
