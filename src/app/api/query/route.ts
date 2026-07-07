import { NextResponse } from "next/server";

import { generateAnswer } from "@/lib/rag/answer";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const question = parsed.question;
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required." }, { status: 400 });
  }

  const documentIds = parsed.documentIds;
  if (
    documentIds !== undefined &&
    (!Array.isArray(documentIds) || !documentIds.every((id) => typeof id === "string"))
  ) {
    return NextResponse.json(
      { error: "documentIds must be an array of strings." },
      { status: 400 }
    );
  }

  try {
    const { answer, sources } = await generateAnswer(question, {
      documentIds: documentIds as string[] | undefined,
    });
    return NextResponse.json({ answer, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate an answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
