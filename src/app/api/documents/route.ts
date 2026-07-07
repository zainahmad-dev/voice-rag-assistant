import { NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Document } from "@/types/document";

export async function GET() {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("documents")
    .select()
    .order("created_at", { ascending: false })
    .returns<Document[]>();

  if (error) {
    return NextResponse.json(
      { error: `Failed to load documents: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
