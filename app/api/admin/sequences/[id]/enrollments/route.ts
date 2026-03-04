import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { enrollInSequence } from '@/lib/sequences/enroll';
import { validateBody, zodErrorResponse, enrollmentCreateSchema, isValidUUID } from '@/lib/validations/admin';

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/sequences/[id]/enrollments — List enrollments with profile info
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.view');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data, error } = await adminClient
    .from('email_sequence_enrollments')
    .select('*, profiles(full_name, email)')
    .eq('sequence_id', id)
    .order('enrolled_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/admin/sequences/[id]/enrollments — Manually enroll a contact
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.edit');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const demo = await demoGuard();
  if (demo) return demo;

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: validationError } = await validateBody(request, enrollmentCreateSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const { profile_id, sequence_id } = body;

  const { error } = await enrollInSequence({
    sequenceId: sequence_id ?? id,
    email: '',
    profileId: profile_id,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 409 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
