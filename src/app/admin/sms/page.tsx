'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Search, X, Users, CheckSquare, Square, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  membershipId: string;
}

const MAX_SMS_LENGTH = 160;

export default function SMSPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCustomers('');
  }, []);

  const loadCustomers = async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get('/sms/customers', { params: q ? { search: q } : {} });
      setCustomers(res.data.customers);
      setFiltered(res.data.customers);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadCustomers(val), 300);
  };

  const toggleCustomer = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  };

  const handleSendToAllToggle = (val: boolean) => {
    setSendToAll(val);
    if (val) setSelected(new Set());
  };

  const recipientCount = sendToAll ? customers.length : selected.size;

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!sendToAll && selected.size === 0) return;

    setSending(true);
    setResult(null);
    try {
      const res = await api.post('/sms/send', {
        message: message.trim(),
        sendToAll,
        customerIds: sendToAll ? [] : Array.from(selected),
      });
      setResult({ type: 'success', text: res.data.message });
      setMessage('');
      setSelected(new Set());
      setSendToAll(false);
    } catch (err: any) {
      const detail = err?.response?.data?.error || 'Failed to send SMS';
      setResult({ type: 'error', text: detail });
    } finally {
      setSending(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-cyan-600" />
          Send SMS
        </h1>
        <p className="text-sm text-gray-500 mt-1">Send a custom SMS message to one or more customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Customer selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recipients
              </span>
              {recipientCount > 0 && (
                <span className="text-xs font-normal bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">
                  {recipientCount} selected
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Send to all toggle */}
            <button
              onClick={() => handleSendToAllToggle(!sendToAll)}
              className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                sendToAll
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {sendToAll ? (
                <CheckSquare className="h-5 w-5 text-cyan-600 flex-shrink-0" />
              ) : (
                <Square className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <span>Send to all active customers ({customers.length})</span>
            </button>

            {!sendToAll && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, phone or ID..."
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                  {search && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Select all filtered */}
                {filtered.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-xs text-cyan-600 hover:text-cyan-800 font-medium px-1"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {allFilteredSelected ? 'Deselect all' : `Select all ${filtered.length} shown`}
                  </button>
                )}

                {/* Customer list */}
                <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {loading ? (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">No customers found</p>
                  ) : (
                    filtered.map(c => {
                      const isSelected = selected.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCustomer(c.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-cyan-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {c.membershipId} · {c.phone}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right — Message composer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your SMS message here..."
                rows={7}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
              />
              <div className={`text-right text-xs mt-1 ${message.length > MAX_SMS_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                {message.length}/{MAX_SMS_LENGTH}
                {message.length > MAX_SMS_LENGTH && (
                  <span className="ml-1">· {Math.ceil(message.length / MAX_SMS_LENGTH)} SMS parts</span>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Recipients</span>
                <span className="font-medium text-gray-900">
                  {recipientCount > 0 ? recipientCount : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Message length</span>
                <span className="font-medium text-gray-900">{message.length} chars</span>
              </div>
              <div className="flex justify-between">
                <span>Sender ID</span>
                <span className="font-medium text-gray-900">AidooTech</span>
              </div>
            </div>

            {/* Result feedback */}
            {result && (
              <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
                result.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {result.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{result.text}</span>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !message.trim() || recipientCount === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending to {recipientCount} customer{recipientCount !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to {recipientCount > 0 ? `${recipientCount} customer${recipientCount !== 1 ? 's' : ''}` : 'recipients'}
                </>
              )}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
