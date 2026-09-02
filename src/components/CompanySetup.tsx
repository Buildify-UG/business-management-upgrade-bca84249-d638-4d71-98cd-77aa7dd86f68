import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company } from '@/types';
import { toast } from 'sonner';

interface Props {
  company?: Company;
  onCompanyCreated: (company: Company) => void;
}

const CompanySetup: React.FC<Props> = ({ company, onCompanyCreated }) => {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    address: company?.address || '',
    phone: company?.phone || '',
    email: company?.email || '',
    vat_number: company?.vat_number || '',
    bin_number: company?.bin_number || '',
    tin_number: company?.tin_number || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (company?.id) {
        const { data, error } = await supabase
          .from('companies')
          .update(formData)
          .eq('id', company.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('companies')
          .insert([formData])
          .select()
          .single();
        if (error) throw error;
        result = data;
      }
      
      toast.success(company?.id ? 'Company updated' : 'Company created');
      onCompanyCreated(result);
    } catch (err) {
      toast.error('Error saving company');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          {company?.id ? 'Edit Company' : 'Setup Company'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Company Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="Enter company address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">VAT Number</label>
              <input
                type="text"
                name="vat_number"
                value={formData.vat_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="VAT #"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">BIN Number</label>
              <input
                type="text"
                name="bin_number"
                value={formData.bin_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="BIN #"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">TIN Number</label>
              <input
                type="text"
                name="tin_number"
                value={formData.tin_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="TIN #"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : company?.id ? 'Update Company' : 'Create Company'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompanySetup;
