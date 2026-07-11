# Manual end-to-end test checklist

A walkthrough for verifying the whole app locally after a change. Run through this before deploying
(see also [Phase 42 — production testing](./phases/phase42.md) for the hosted equivalent).

Checked boxes below with a **Result** note were run against this build via the API directly
(`npm run dev`, then scripted `fetch` calls) as part of the Phase 39 pass on 2026-07-11 — see the
notes under each for what that does and doesn't prove. Re-run the corresponding steps in an actual
browser before you rely on this list; a passing API response doesn't guarantee the UI wired to it is
correct.

## 0. Prerequisites

- [ ] `.env.local` is filled in with real values for all 8 variables (see `.env.local.example` /
      README). Placeholders (`your-...`) will fail loudly, which is fine — but confirm you're not
      silently running against empty keys.
- [ ] `schema.sql` has been run in the Supabase SQL editor for this project.
- [ ] For the voice section specifically: `NEXT_PUBLIC_APP_URL` must be a URL VAPI's cloud can reach,
      not `http://localhost:3000`. Start a tunnel (`ngrok http 3000` or similar), set
      `NEXT_PUBLIC_APP_URL` to the HTTPS URL it gives you, and restart `npm run dev` so the new value
      is picked up. **This build's `.env.local` currently has it set to `http://localhost:3000`** —
      real voice calls will not be able to reach `/api/vapi/webhook` until this is changed to a
      tunnel URL.
- [ ] `npm run dev` is running and `http://localhost:3000` loads without console errors.

## 1. Upload each supported file type

For each of PDF, DOCX, and TXT:

- [ ] Drag a file onto the upload dropzone (or use the file picker).
- [ ] It appears in the sidebar immediately with a "processing" indicator.
- [ ] Within a few seconds it flips to "completed" and shows a chunk count > 0.
- [ ] Try one deliberately-bad upload (e.g. a `.png`, or a file over 15MB) and confirm you get a
      clear inline error instead of a stuck "processing" row.

**Result (API-level, all three sample files in `sample-documents/`):** uploaded
`nimbus-product-overview.txt`, `nimbus-service-level-agreement.pdf`, and
`nimbus-employee-handbook.docx` via `POST /api/upload` → `POST /api/ingest`. All three reached
`status: "completed"` with `chunk_count: 2` each, no errors. This confirms `extractText` (all three
extractors), `chunkText`, and `embedChunks` work end-to-end against live Gemini/Supabase — it does
**not** confirm the dropzone UI, drag-and-drop, the bad-file-type/oversize error UI, or the sidebar's
polling/status display, which still need a real browser pass.

## 2. Ask a question that SHOULD be answerable

- [ ] Wait for at least one document to finish indexing.
- [ ] Ask (by voice or text) a question whose answer is clearly in that document.
- [ ] The answer is correct, stays within a sentence or two, and the response shows source
      attribution (document name + similarity) for at least one chunk from the right document.

**Result (via `POST /api/query`, text-query pipeline):**
- *"What does the Nimbus Business plan cost per month and how much storage does it include?"* →
  *"The Nimbus Business plan costs $45 per month and includes 5 TB of shared storage."* — correct,
  top source was `nimbus-product-overview.txt` at similarity 0.76.
- *"What is Nimbus Cloud's guaranteed uptime percentage, and what happens if it drops below 95%?"* →
  *"Nimbus Cloud guarantees 99.9% monthly uptime, and if it drops below 95%, customers receive a 50%
  credit of that month's fees."* — correct, top source was `nimbus-service-level-agreement.pdf` at
  similarity 0.77.

Also simulated the **voice** path by POSTing a fake VAPI tool-call payload straight to
`/api/vapi/webhook` (bypassing the actual mic/Deepgram/TTS round-trip, which needs a real browser +
reachable webhook): *"How many days of version history does the Starter plan include?"* → *"The
Starter plan includes 30 days of version history."* with correctly attributed `metadata.sources`.
This confirms the webhook route and `generateAnswer()` are correct; it does **not** confirm
transcription accuracy, the assistant actually invoking the tool mid-conversation, or that the
spoken reply sounds right — only a live call through the orb can confirm those.

## 3. Ask a question that should NOT be answerable

- [ ] Ask something with no relation to any uploaded document (e.g. "What's the capital of
      Australia?").
- [ ] The assistant declines clearly instead of guessing or hallucinating an answer, e.g. "The
      documents don't cover that."

**Result:** *"What is the capital of Australia?"* → *"The documents don't cover that."* — correct.
Note that `match_documents` still returns its top-k nearest chunks by cosine similarity regardless of
whether they're actually relevant (there's no relevance floor); grounding depends entirely on the
Groq system prompt's instruction to say so when the context doesn't answer the question, which held
up here even with unrelated chunks in context at similarity ~0.5.

## 4. Delete a document

- [ ] Delete a document from the sidebar (with confirmation if the UI has one).
- [ ] It disappears from the list immediately.
- [ ] A follow-up question that depended only on that document's content no longer finds it (or, if
      other documents remain, no longer cites it as a source).

**Result:** `DELETE /api/documents/{id}` on the uploaded `nimbus-product-overview.txt` returned `204`
and the document no longer appears in `GET /api/documents`. The route deletes the DB row first (which
cascades to `document_chunks` via the FK in `schema.sql`) then best-effort removes the Storage blob —
confirmed correct by reading `src/app/api/documents/[id]/route.ts`. Not confirmed: the sidebar's
delete button/confirmation UI itself.

## 5. Toggle dark/light mode

- [ ] Click the theme toggle in the header.
- [ ] Colors switch immediately with no flash of the wrong theme.
- [ ] Reload the page — the chosen theme persists (it's written to `localStorage` under the `theme`
      key and re-applied by an inline script before hydration, per
      `src/components/layout/theme-script.ts`).
- [ ] With no stored preference (clear site data first), the app follows the OS-level light/dark
      setting.

Not run automatically — this is a pure client-rendering/visual check with no API surface to hit from
a script.

## Issues found this pass

None in the backend/API pipeline: `npm run lint` is clean, no runtime errors appeared in the dev
server log during the run above, and every automated check in sections 1–4 passed on the first try.

The one real gap is environmental, not a code bug: **`NEXT_PUBLIC_APP_URL` in `.env.local` is
`http://localhost:3000`**, which VAPI's cloud cannot reach. A real voice call will start fine (mic
prompt, "listening" state) but any question that requires the `answerQuestion` tool will fail once
VAPI tries to call the webhook — the call will likely just go quiet or error out at that point. Fix:
start a tunnel and update the env var per the Prerequisites section above, then restart `npm run dev`.
