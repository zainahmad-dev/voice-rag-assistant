interface SourceAttribution {
  documentName: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceAttribution[];
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "What is our policy on remote work?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Employees may work remotely up to three days per week, subject to manager approval.",
    sources: [{ documentName: "employee-handbook.pdf", similarity: 0.91 }],
  },
  {
    id: "3",
    role: "user",
    content: "How do I request time off?",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "Submit a time-off request through the HR portal at least two weeks in advance.",
    sources: [{ documentName: "employee-handbook.pdf", similarity: 0.86 }],
  },
];

export function ConversationHistory() {
  return (
    <ul className="flex w-full flex-col gap-4">
      {MOCK_MESSAGES.map((message) => (
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
              {message.sources?.map((source) => (
                <p
                  key={source.documentName}
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
