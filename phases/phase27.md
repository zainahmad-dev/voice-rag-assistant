# Phase 27 — Build the VAPI webhook route

Implement the /api/vapi/webhook API route: parse VAPI's incoming tool-call payload, extract the question argument from each tool call, run it through the RAG answer generation function, and return the results in the toolCallId/result format VAPI expects.
