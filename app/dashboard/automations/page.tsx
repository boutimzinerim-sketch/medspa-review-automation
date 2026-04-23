'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SERVICE_OPTIONS = ['Botox', 'Filler', 'Laser Hair Removal', 'Microneedling'] as const;

interface RuleRow {
  id: string;
  name: string;
  service_type: string;
  days_after_appointment: number;
  email_subject: string;
  email_body: string;
  is_active: boolean;
  created_at: string;
}

interface RuleFormData {
  name: string;
  service_type: string;
  days_after_appointment: number;
  email_subject: string;
  email_body: string;
}

const emptyForm: RuleFormData = {
  name: '', service_type: 'Botox', days_after_appointment: 14, email_subject: '', email_body: '',
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<RuleFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      console.log('[automations] fetch response:', data);
      setRules(data.rules ?? []);
    } catch (err) {
      console.error('[automations] fetch error:', err);
      toast.error('Error loading rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  function openModal() {
    setForm(emptyForm);
    setIsOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Rule name is required'); return; }
    if (!form.email_subject.trim()) { toast.error('Email subject is required'); return; }

    setIsSaving(true);
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      console.log('[automations] save response:', data);
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success('Rule created!');
      setIsOpen(false);
      fetchRules();
    } catch (err) {
      console.error('[automations] save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-white/40 text-sm mt-1">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button size="sm" onClick={openModal}>
          <Zap size={15} />
          New Rule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-white/30" size={32} />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Zap size={24} className="text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No automation rules</h3>
            <p className="text-white/40 text-sm mb-6 max-w-xs">
              Create your first rule to automatically send review requests.
            </p>
            <Button size="sm" onClick={openModal}>Create First Rule</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} hoverable>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">{rule.name}</h3>
                    <Badge variant={rule.is_active ? 'active' : 'inactive'}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/40">
                    {rule.service_type} · {rule.days_after_appointment} days after appointment
                  </p>
                  {rule.email_subject && (
                    <p className="text-xs text-white/30 mt-1 truncate">
                      Subject: {rule.email_subject}
                    </p>
                  )}
                </div>
                <Zap size={18} className={rule.is_active ? 'text-[#D4713A]' : 'text-white/20'} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Automation Rule"
        description="Define when and how review requests are sent" size="lg"
        footer={<><Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSave} isLoading={isSaving}>Save Rule</Button></>}>
        <div className="space-y-4">
          <Input label="Rule Name" placeholder='e.g. "Botox 14-Day Review Request"' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">Service Type</label>
            <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/50">
              {SERVICE_OPTIONS.map((s) => <option key={s} value={s} className="bg-[#161b27]">{s}</option>)}
            </select>
          </div>
          <Input label="Days After Appointment" type="number" min={1} max={90} value={form.days_after_appointment}
            onChange={(e) => setForm({ ...form, days_after_appointment: parseInt(e.target.value) || 14 })}
            hint="How many days after the appointment to send the review request" />
          <Input label="Email Subject" placeholder='e.g. "{{patient_name}}, how are your results?"' value={form.email_subject} onChange={(e) => setForm({ ...form, email_subject: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">Email Body</label>
            <textarea rows={5} placeholder="Write your review request email template..." value={form.email_body}
              onChange={(e) => setForm({ ...form, email_body: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/50 resize-none" />
            <p className="text-xs text-white/40">Use {'{{patient_name}}'}, {'{{clinic_name}}'}, {'{{service_type}}'} as placeholders</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
