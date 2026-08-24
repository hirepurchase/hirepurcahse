'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Send, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface Role {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  message: string;
  targetRoleIds: string[];
  targetRoleNames: string[];
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AnnouncementsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState('7');

  const { toast } = useToast();

  useEffect(() => {
    loadRoles();
    loadAnnouncements();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles((res.data || []).map((r: any) => ({ id: r.id, name: r.name })));
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' });
    }
  };

  const loadAnnouncements = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load announcements', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handlePost = async () => {
    if (!message.trim()) {
      toast({ title: 'Message required', description: 'Write a message before posting.', variant: 'destructive' });
      return;
    }
    if (selectedRoleIds.length === 0) {
      toast({ title: 'Select at least one role', description: 'Choose who should see this announcement.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/announcements', {
        message: message.trim(),
        targetRoleIds: selectedRoleIds,
        durationDays: Number(durationDays) || 7,
      });
      toast({ title: 'Announcement posted', description: 'It will now show for the selected roles on login.' });
      setMessage('');
      setSelectedRoleIds([]);
      setDurationDays('7');
      loadAnnouncements();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to post announcement', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await api.post(`/announcements/${id}/deactivate`);
      toast({ title: 'Announcement deactivated' });
      loadAnnouncements();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to deactivate announcement', variant: 'destructive' });
    }
  };

  const isCurrentlyLive = (a: Announcement) => a.isActive && new Date(a.expiresAt) > new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-amber-500" />
          Staff Announcements
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Post a notice that shows to selected roles every time they log in, for the duration you choose (default 7 days).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Effective today, contracts are blocked while you have an unpaid deposit remittance. Please clear your balance to continue creating contracts."
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Show to</label>
            <div className="flex flex-wrap gap-4">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <span className="text-sm text-gray-700">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="max-w-[180px]">
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Show for (days)</label>
            <Input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>

          <Button onClick={handlePost} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600">
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Posting…' : 'Post Announcement'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-gray-500">No announcements posted yet.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.message}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {a.targetRoleNames.map((name) => (
                          <Badge key={name} variant="secondary">{name}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Posted by {a.createdBy.firstName} {a.createdBy.lastName} · {formatDate(a.createdAt)} · Expires {formatDate(a.expiresAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isCurrentlyLive(a) ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Live</Badge>
                      ) : (
                        <Badge variant="secondary">Expired</Badge>
                      )}
                      {isCurrentlyLive(a) && (
                        <Button size="sm" variant="outline" onClick={() => handleDeactivate(a.id)}>
                          <Ban className="h-3.5 w-3.5 mr-1.5" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
