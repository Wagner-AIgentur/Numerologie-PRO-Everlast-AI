import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { validateBody, zodErrorResponse, sessionUpdateSchema, isValidUUID } from '@/lib/validations/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission('sessions.edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const demo = await demoGuard();
  if (demo) return demo;

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: validationError } = await validateBody(request, sessionUpdateSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }
  const { recording_url, status, meeting_link, admin_notes } = body;

  // Build update object with only provided fields
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (recording_url !== undefined) updateData.recording_url = recording_url;
  if (status !== undefined) updateData.status = status;
  if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
  if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

  // If recording_url is being set, auto-mark as completed
  if (recording_url && !status) {
    updateData.status = 'completed';
  }

  const { data: session, error } = await adminClient
    .from('sessions')
    .update(updateData)
    .eq('id', id)
    .select('id, profile_id, order_id, package_type')
    .single();

  if (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // If recording was added, also create a deliverable entry
  if (recording_url && session?.profile_id) {
    await adminClient.from('deliverables').insert({
      profile_id: session.profile_id,
      session_id: id,
      title: `Sitzungsaufzeichnung — ${session.package_type ?? 'Numerologie-Beratung'}`,
      file_url: recording_url,
      file_type: 'video',
    });
  }

  return NextResponse.json({ success: true, session });
}
