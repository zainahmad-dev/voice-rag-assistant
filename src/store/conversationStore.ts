import { create } from "zustand";

export interface ConversationSource {
  documentName: string;
  similarity: number;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ConversationSource[];
}

interface ConversationState {
  messages: ConversationMessage[];
  addMessage: (message: ConversationMessage) => void;
}

/**
 * Single shared history for the whole session: voice turns (from
 * useVapiCall's conversation-update handling) and text-based testing queries
 * (from TextQueryInput) both append here in the order they actually
 * happened, so the transcript reads as one conversation regardless of which
 * input drove a given turn.
 */
export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
}));
