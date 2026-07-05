# Phase 24 — Build the LLM answer generation function

Implement an answer-generation function using the Groq SDK with the llama-3.3-70b-versatile model: it should call the vector search and context assembly functions, then send a system prompt instructing the model to answer only from the provided context, keep answers short and conversational since they'll be read aloud, and clearly say when the documents don't cover the question. Return both the answer text and the source chunks used.
