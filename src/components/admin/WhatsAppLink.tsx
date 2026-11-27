'use client';

import { MessageCircle } from 'lucide-react';

/** 233XXXXXXXXX from a Ghana number in any usual form; null if it is not one. */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const d = String(phone || '').replace(/\D/g, '');
  if (/^233\d{9}$/.test(d)) return d;
  if (/^0\d{9}$/.test(d)) return `233${d.slice(1)}`;
  if (/^\d{9}$/.test(d)) return `233${d}`;
  return null;
}

/** Opens WhatsApp with a message ready to send to the customer. */
export default function WhatsAppLink({ phone, message, label = 'WhatsApp' }: { phone: string | null | undefined; message: string; label?: string }) {
  const n = toWhatsAppNumber(phone);
  if (!n) return null;
  return (
    <a
      href={`https://wa.me/${n}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} ${phone}`}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
