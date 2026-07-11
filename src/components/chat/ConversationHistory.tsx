"use client";

import { FileText } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { MarkdownContent } from "./MarkdownContent";
import {
  useConversationStore,
  type ConversationMessage,
  type ConversationSource,
} from "@/store/conversationStore";

const MAX_SOURCES = 4;

interface MessageGroup {
  id: string;
  role: ConversationMessage["role"];
  content: string;
  sources: ConversationSource[];
}

function mergeSources(
  existing: ConversationSource[],
  incoming: ConversationSource[] | undefined
): ConversationSource[] {
  if (!incoming?.length) return existing;

  const byName = new Map(existing.map((source) => [source.documentName, source]));
  for (const source of incoming) {
    const current = byName.get(source.documentName);
    if (!current || source.similarity > current.similarity) {
      byName.set(source.documentName, source);
    }
  }

  return [...byName.values()].sort((a, b) => b.similarity - a.similarity);
}

/**
 * VAPI's conversation-update sends one bot turn per spoken sentence, so the
 * store ends up with several ConversationMessage entries for a single reply.
 * This groups consecutive same-role messages into one bubble for display —
 * a presentation-only concern, so the store keeps its original per-turn data
 * and useVapiCall/parseConversationUpdate stay untouched.
 */
function groupMessages(messages: ConversationMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (last && last.role === message.role) {
      last.content = `${last.content}\n\n${message.content}`;
      last.sources = mergeSources(last.sources, message.sources);
    } else {
      groups.push({
        id: message.id,
        role: message.role,
        content: message.content,
        sources: mergeSources([], message.sources),
      });
    }
  }

  return groups;
}

export function ConversationHistory() {
  const messages = useConversationStore((state) => state.messages);
  const groups = useMemo(() => groupMessages(messages), [messages]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastGroup = groups[groups.length - 1];
  const lastGroupContent = lastGroup?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [groups.length, lastGroupContent]);

  if (groups.length === 0) {
    return (
      <div className="scrollbar-thin flex h-full items-center justify-center overflow-y-auto p-4 md:p-6">
        <p className="max-w-sm text-center text-sm text-foreground-muted">
          Tap the mic and ask a question about your documents, or type one below to test the
          assistant.
        </p>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin h-full overflow-y-auto p-4 md:p-6">
      <ul className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {groups.map((group) => (
          <li
            key={group.id}
            className={`animate-message-in flex ${group.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {group.role === "user" ? (
              <div className="max-w-[70%] rounded-2xl bg-gradient-to-br from-accent to-accent-hover px-4 py-2.5 text-[15px] leading-relaxed text-background shadow-sm">
                {group.content}
              </div>
            ) : (
              <div className="max-w-[70%] rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
                <MarkdownContent content={group.content} />

                {group.sources.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.sources.slice(0, MAX_SOURCES).map((source, index) => (
                      <div
                        key={source.documentName}
                        style={{ animationDelay: `${index * 40}ms` }}
                        className="animate-source-card-in group relative overflow-hidden rounded-xl border border-border border-l-2 border-l-accent bg-surface-raised/70 px-3 py-2.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="shrink-0 text-accent" />
                          <span
                            className="truncate text-xs font-medium text-foreground"
                            title={source.documentName}
                          >
                            {source.documentName}
                          </span>
                        </div>
                        <span className="mt-2 inline-flex items-center rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-semibold text-accent">
                          {Math.round(source.similarity * 100)}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}

        <div ref={bottomRef} aria-hidden="true" />
      </ul>
    </div>
  );
}
