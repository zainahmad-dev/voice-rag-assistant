import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/vapi/webhook`;

const SYSTEM_PROMPT = `You are a voice assistant that helps users ask questions about their uploaded documents.

You have no knowledge of your own about the user's documents. For every question about the documents,
you must call the answerQuestion function tool to get a grounded answer — never answer from your own
training knowledge, and never guess. Only skip the tool for pure chit-chat (greetings, thanks, "are you
still there") that isn't actually a question about the documents.

When the tool returns, speak its answer back to the user. Do not add facts beyond what the tool
returned, and do not contradict it. Keep responses short and conversational, since they are read aloud.`;

/**
 * Inline assistant configuration passed straight to the VAPI Web SDK's
 * `start()` call (see phase 28) instead of referencing an assistant created
 * in the VAPI dashboard. The only tool the model has is `answerQuestion`,
 * which VAPI calls against our /api/vapi/webhook route (see phase 27) so
 * every answer is grounded in our own RAG pipeline.
 */
export const assistantConfig: CreateAssistantDTO = {
  name: "Document Assistant",
  firstMessage: "Hi, ask me anything about your uploaded documents.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "vapi",
    voiceId: "Elliot",
  },
  model: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    tools: [
      {
        type: "function",
        async: false,
        server: { url: WEBHOOK_URL },
        function: {
          name: "answerQuestion",
          description:
            "Answers the user's question by searching their uploaded documents. Always call this instead of answering from your own knowledge.",
          parameters: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "The user's question, restated in full as a standalone question.",
              },
            },
            required: ["question"],
          },
        },
      },
    ],
  },
};
