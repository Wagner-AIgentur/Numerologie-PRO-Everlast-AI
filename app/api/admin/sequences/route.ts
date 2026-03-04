import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { validateBody, zodErrorResponse, sequenceCreateSchema } from '@/lib/validations/admin';

/**
 * GET /api/admin/sequences — List all sequences with enrollment stats
 */
export async function GET() {
  const user = await requirePermission('sequences.view');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sequences, error } = await adminClient
    .from('email_sequences')
    .select('*, email_sequence_steps(id), email_sequence_enrollments(id, status)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  // Aggregate enrollment stats per sequence
  const result = (sequences ?? []).map((seq) => {
    const enrollments = (seq.email_sequence_enrollments ?? []) as { id: string; status: string }[];
    return {
      id: seq.id,
      name: seq.name,
      description: seq.description,
      trigger_event: seq.trigger_event,
      trigger_filter: seq.trigger_filter,
      is_active: seq.is_active,
      created_at: seq.created_at,
      updated_at: seq.updated_at,
      steps_count: (seq.email_sequence_steps ?? []).length,
      stats: {
        total: enrollments.length,
        active: enrollments.filter((e) => e.status === 'active').length,
        completed: enrollments.filter((e) => e.status === 'completed').length,
        paused: enrollments.filter((e) => e.status === 'paused').length,
      },
    };
  });

  return NextResponse.json(result);
}

/**
 * POST /api/admin/sequences — Create a new sequence
 */
export async function POST(request: NextRequest) {
  const user = await requirePermission('sequences.edit');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const demo = await demoGuard();
  if (demo) return demo;

  const { data: body, error: validationError } = await validateBody(request, sequenceCreateSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const { name, description, trigger_type, is_active } = body;

  const { data, error } = await adminClient
    .from('email_sequences')
    .insert({
      name,
      description: description ?? null,
      trigger_event: trigger_type ?? '',
      trigger_filter: {},
      is_active: is_active ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
