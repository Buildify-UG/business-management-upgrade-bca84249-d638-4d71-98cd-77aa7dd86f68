import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Party } from '@/types';
import { toast } from 'sonner';

interface Props {
  company: Company;
}

const PartyManager: React.FC<Props> = ({ company }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    vat_setting: 'VAT_OFF' as const,
  });

  useEffect(() => {
    loadParties();
  }, [company.id]);

  const loadParties = async () => {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      setParties(data || []);
    } catch (err) {
      toast.error('Error loading parties');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('parties')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Party updated');
      } else {
        const { error } = await supabase
          .from('parties')
          .insert([{ ...formData, company_id: company.id }]);
        if (error) throw error;
        toast.success('Party created');
      }
      
      setFormData({ name: '', address: '', phone: '', email: '', vat_setting: 'VAT_OFF' });
      setEditingId(null);
      setShowForm(false);
      loadParties();
    } catch (err) {
      toast.error('Error saving party');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (party: Party) => {
    setFormData({
      name: party.name,
      address: party.address || '',
      phone: party.phone || '',
      email: party.email || '',
      vat_setting: party.vat_setting,
    });
    setEditingId(party.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this party?')) return;
    try {
      const { error } = await supabase.from('parties').delete().eq('id', id);
      if (error) throw error;
      toast.success('Party deleted');
      loadParties();
    } catch (err) {
      toast.error('Error deleting party');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Parties / Customers</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', address: '', phone: '', email: '', vat_setting: 'VAT_OFF' });
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : 'Add Party'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Party Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Default VAT Setting</label>
              <select
                value={formData.vat_setting}
                onChange={(e) => setFormData({ ...formData, vat_setting: e.target.value as any })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="VAT_OFF">VAT OFF</option>
                <option value="VAT_ON_INCLUDED">VAT ON - Included</option>
                <option value="VAT_ON_EXCLUDED">VAT ON - Excluded</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update Party' : 'Create Party'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">VAT Setting</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((party) => (
              <tr key={party.id} className="border-b border-border hover:bg-muted/50">
                <td className="px-4 py-3 text-foreground">{party.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{party.phone || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{party.email || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{party.vat_setting}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleEdit(party)}
                    className="text-primary hover:underline mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(party.id)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {parties.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">No parties found</div>
        )}
      </div>
    </div>
  );
};

export default PartyManager;
