import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Company } from '@/types';
import Dashboard from '@/components/Dashboard';
import PartyManager from '@/components/PartyManager';
import ProductManager from '@/components/ProductManager';
import SalesInvoice from '@/components/SalesInvoice';
import SalesRegister from '@/components/SalesRegister';
import PartyLedger from '@/components/PartyLedger';
import PaymentEntry from '@/components/PaymentEntry';
import CompanySetup from '@/components/CompanySetup';

type ModuleName = 'dashboard' | 'company' | 'parties' | 'products' | 'sales' | 'sales-register' | 'party-ledger' | 'payments';

const Index = () => {
  const [currentModule, setCurrentModule] = useState<ModuleName>('dashboard');
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCompany(data);
      }
    } catch (err) {
      console.error('Error loading company:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return <CompanySetup onCompanyCreated={(newCompany) => { setCompany(newCompany); setCurrentModule('dashboard'); }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
            <p className="text-sm text-muted-foreground">{company.address}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{company.phone}</p>
            <p>{company.email}</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'company', label: 'Company' },
              { id: 'parties', label: 'Parties' },
              { id: 'products', label: 'Products' },
              { id: 'sales', label: 'Sales Invoice' },
              { id: 'sales-register', label: 'Sales Register' },
              { id: 'party-ledger', label: 'Party Ledger' },
              { id: 'payments', label: 'Payments' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentModule(item.id as ModuleName)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  currentModule === item.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentModule === 'dashboard' && <Dashboard company={company} />}
        {currentModule === 'company' && <CompanySetup company={company} onCompanyCreated={setCompany} />}
        {currentModule === 'parties' && <PartyManager company={company} />}
        {currentModule === 'products' && <ProductManager company={company} />}
        {currentModule === 'sales' && <SalesInvoice company={company} />}
        {currentModule === 'sales-register' && <SalesRegister company={company} />}
        {currentModule === 'party-ledger' && <PartyLedger company={company} />}
        {currentModule === 'payments' && <PaymentEntry company={company} />}
      </main>
    </div>
  );
};

export default Index;
