import { adminClient } from '@/lib/supabase/admin';
import { isDemoReviewer } from '@/lib/auth/admin-guard';
import InstagramShell from '@/components/admin/instagram/InstagramShell';

export default async function InstagramPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isDemo = await isDemoReviewer();

  // Demo reviewer sees empty state (no demo data for Instagram)
  const { data: messages } = isDemo
    ? { data: [] as any[] }
    : await adminClient
        .from('instagram_messages')
        .select('*, profiles:profile_id(id, full_name, email, avatar_url)')
        .order('created_at', { ascending: false })
        .range(0, 99);

  // Group into conversations
  const convMap = new Map<
    string,
    {
      sender_id: string;
      profile: {
        id: string;
        full_name: string | null;
        email: string;
        avatar_url: string | null;
      } | null;
      lastMessage: {
        id: string;
        message_text: string | null;
        direction: 'in' | 'out';
        created_at: string;
      };
      messageCount: number;
    }
  >();

  for (const msg of messages ?? []) {
    if (!convMap.has(msg.sender_id)) {
      convMap.set(msg.sender_id, {
        sender_id: msg.sender_id,
        profile: msg.profiles ?? null,
        lastMessage: {
          id: msg.id,
          message_text: msg.message_text,
          direction: msg.direction as 'in' | 'out',
          created_at: msg.created_at ?? '',
        },
        messageCount: 0,
      });
    }
    convMap.get(msg.sender_id)!.messageCount++;
  }

  const conversations = Array.from(convMap.values()).sort(
    (a, b) =>
      new Date(b.lastMessage.created_at).getTime() -
      new Date(a.lastMessage.created_at).getTime(),
  );

  return <InstagramShell locale={locale} initialConversations={conversations} />;
}
