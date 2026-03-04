import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { sendMessage } from '@/lib/telegram/bot';
import { validateBody, zodErrorResponse, telegramSendSchema } from '@/lib/validations/admin';

// POST: Send a Telegram DM to a specific customer
export async function POST(request: NextRequest) {
  if (!(await requirePermission('telegram.send'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const demo = await demoGuard();
  if (demo) return demo;

  const { data: body, error: validationError } = await validateBody(request, telegramSendSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const { chat_id, message } = body;

  // Validate that chat_id belongs to a known profile (prevent messaging arbitrary Telegram users)
  const { data: knownProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', Number(chat_id))
    .maybeSingle();
  if (!knownProfile) {
    return NextResponse.json({ error: 'chat_id not associated with any profile' }, { status: 400 });
  }

  try {
    // Strip HTML from admin input to prevent injection into customer chat
    const safeMessage = message.trim().replace(/<[^>]*>/g, '');
    const result = await sendMessage({
      chat_id: Number(chat_id),
      text: safeMessage,
    });

    // Log outgoing message
    await adminClient.from('telegram_messages').insert({
      chat_id: Number(chat_id),
      direction: 'out',
      command: 'admin_dm',
      payload: { text: message.trim(), sent_by: 'admin' },
    });

    return NextResponse.json({ ok: true, message_id: result.message_id });
  } catch (err) {
    console.error('[Admin Telegram] Send failed:', err);
    return NextResponse.json(
      { error: 'Send failed' },
      { status: 500 },
    );
  }
}
