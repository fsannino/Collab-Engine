import { type NextRequest, NextResponse } from 'next/server';

// Issue 027 — LMS webhook integration (Sprint 5)
// Placeholder: LMS external enrollment IDs not yet modelled in Sprint 4 schema.
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'LMS webhook not yet implemented' },
    { status: 501 },
  );
}
