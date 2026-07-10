"use client";

import { useConversationStore } from "@/store/conversationStore";

export function ConversationHistory() {
  const messages = useConversationStore((state) => state.messages);

  if (messages.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Tap the mic and ask a question about your documents, or type one below to test the assistant.
      </p>
    );
  }

  return (
    <ul className="flex w-full flex-col gap-4">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {message.role === "user" ? (
            <div className="max-w-[75%] rounded-2xl bg-accent px-4 py-2 text-sm text-background">
              {message.content}
            </div>
          ) : (
            <div className="max-w-[75%] space-y-2 rounded-2xl border border-border bg-surface px-4 py-3">
              <p className="text-sm text-foreground">{message.content}</p>
              {message.sources?.map((source, index) => (
                <p
                  key={`${source.documentName}-${index}`}
                  className="text-xs text-foreground-muted"
                >
                  {source.documentName} · {Math.round(source.similarity * 100)}%
                  match
                </p>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
