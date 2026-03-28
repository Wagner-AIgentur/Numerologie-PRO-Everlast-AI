'use client';

import { useState } from 'react';
import { FileUp, Loader2, CheckCircle2 } from 'lucide-react';

export default function PdfDeliverForm({ orderId }: { orderId: string }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: url.trim() }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      console.error('Failed to deliver PDF:', err);
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div className="mt-2 flex items-center gap-2 text-emerald-400 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
        PDF доставлен!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <div className="flex items-center gap-2">
        <FileUp className="h-3.5 w-3.5 text-gold/50 shrink-0" strokeWidth={1.5} />
        <input
          type="url"
          placeholder="PDF URL (Supabase / Google Drive)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/30"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Отправить'}
        </button>
      </div>
    </form>
  );
}
