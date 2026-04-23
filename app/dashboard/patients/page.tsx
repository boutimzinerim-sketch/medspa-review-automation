'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn, type SortState } from '@/components/ui/Table';
import { Users, Upload, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const SERVICE_OPTIONS = ['Botox', 'Filler', 'Laser Hair Removal', 'Microneedling', 'Chemical Peel', 'PRP', 'Hydrafacial', 'Other'] as const;

interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  last_service: string;
  appointment_date: string;
  reviewed: boolean;
  [key: string]: unknown;
}

interface PatientFormData {
  name: string;
  email: string;
  phone: string;
  last_service: string;
  appointment_date: string;
}

const emptyPatient: PatientFormData = {
  name: '', email: '', phone: '', last_service: 'Botox', appointment_date: '',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPatientOpen, setIsPatientOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [form, setForm] = useState<PatientFormData>(emptyPatient);
  const [isSaving, setIsSaving] = useState(false);
  const [sortState, setSortState] = useState<SortState>({ key: 'created_at', direction: 'desc' });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      console.log('[patients] fetch response:', data);
      const list = data.data ?? data.patients ?? [];
      setPatients(list);
      setTotal(list.length);
    } catch (err) {
      console.error('[patients] fetch error:', err);
      toast.error('Error loading patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  function openPatientModal() {
    setForm(emptyPatient);
    setIsPatientOpen(true);
  }

  async function handleSavePatient() {
    if (!form.name.trim()) { toast.error('Patient name is required'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { toast.error('Valid email is required'); return; }
    if (!form.appointment_date) { toast.error('Appointment date is required'); return; }

    setIsSaving(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      console.log('[patients] save response:', data);
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success('Patient saved!');
      setIsPatientOpen(false);
      fetchPatients();
    } catch (err) {
      console.error('[patients] save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save patient');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCsvUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/patients/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      if (data.errors?.length) {
        toast(`${data.errors.length} row(s) skipped — check console`, { icon: <AlertTriangle size={16} className="text-[#fbbf24]" /> });
        console.warn('CSV import errors:', data.errors);
      }
      setIsCsvOpen(false);
      fetchPatients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'CSV import failed');
    }
  }

  function handleSort(key: string) {
    setSortState((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  const sorted = [...patients].sort((a, b) => {
    const aVal = String(a[sortState.key as keyof PatientRow] ?? '');
    const bVal = String(b[sortState.key as keyof PatientRow] ?? '');
    return sortState.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const columns: TableColumn<PatientRow>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'last_service', header: 'Service', sortable: true, render: (r) => <Badge variant="default">{r.last_service}</Badge> },
    { key: 'appointment_date', header: 'Appt Date', sortable: true, render: (r) => r.appointment_date ? new Date(r.appointment_date).toLocaleDateString() : '-' },
    { key: 'reviewed', header: 'Status', render: (r) => <Badge variant={r.reviewed ? 'reviewed' : 'pending'}>{r.reviewed ? 'Reviewed' : 'Pending'}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Patients</h1>
          <p className="text-white/40 text-sm mt-1">
            {total} patient{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCsvOpen(true)}>Import CSV</Button>
          <Button size="sm" onClick={openPatientModal}>Add Patient</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-white/30" size={32} />
        </div>
      ) : patients.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Users size={24} className="text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No patients yet</h3>
            <p className="text-white/40 text-sm mb-6 max-w-xs">
              Import your patients from a CSV or add them one by one.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsCsvOpen(true)}>Import CSV</Button>
              <Button size="sm" onClick={openPatientModal}>Add Patient</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Table columns={columns} data={sorted} sortState={sortState} onSort={handleSort} />
      )}

      {/* Add Patient Modal */}
      <Modal isOpen={isPatientOpen} onClose={() => setIsPatientOpen(false)} title="Add Patient" description="Enter patient details" size="lg"
        footer={<><Button variant="ghost" size="sm" onClick={() => setIsPatientOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSavePatient} isLoading={isSaving}>Save Patient</Button></>}>
        <div className="space-y-4">
          <Input label="Full Name" placeholder="e.g. Sarah Johnson" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="sarah@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" type="tel" placeholder="(555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">Service Type</label>
            <select value={form.last_service} onChange={(e) => setForm({ ...form, last_service: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/50">
              {SERVICE_OPTIONS.map((s) => <option key={s} value={s} className="bg-[#161b27]">{s}</option>)}
            </select>
          </div>
          <Input label="Appointment Date" type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={isCsvOpen} onClose={() => setIsCsvOpen(false)} title="Import Patients from CSV" description="Upload a .csv file with patient data" size="lg"
        footer={<Button variant="ghost" size="sm" onClick={() => setIsCsvOpen(false)}>Close</Button>}>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-white/20 transition-colors">
            <Upload size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/60 mb-1">Drag and drop your CSV file here, or click to browse</p>
            <p className="text-xs text-white/30 mb-4">Accepts .csv files up to 5MB</p>
            <input type="file" accept=".csv" className="hidden" id="csv-upload"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); }} />
            <label htmlFor="csv-upload">
              <span className="inline-flex items-center justify-center gap-2 font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/50 bg-transparent border-white/20 text-white hover:bg-white/5 px-3 py-1.5 text-xs rounded-md cursor-pointer">
                Choose File
              </span>
            </label>
          </div>
          <div className="bg-white/3 rounded-lg p-4">
            <p className="text-xs font-medium text-white/50 mb-2">Expected CSV columns:</p>
            <code className="text-xs text-white/40 block">name, email, phone, service_type, appointment_date</code>
          </div>
        </div>
      </Modal>
    </div>
  );
}
