import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company } from '@/types';

interface DashboardStats {
  totalSales: number;
  totalParties: number;
  totalProducts: number;
  totalRevenue: number;
  pendingPayments: number;
}

const Dashboard: React.FC<{ company: Company }> = ({ company }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalParties: 0,
    totalProducts: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    loadStats();
  }, [company.id]);

  const loadStats = async () => {
    try {
      const [salesRes, partiesRes, productsRes, revenueRes] = await Promise.all([
        supabase.from('sales').select('id', { count: 'exact' }).eq('company_id', company.id),
        supabase.from('parties').select('id', { count: 'exact' }).eq('company_id', company.id),
        supabase.from('products').select('id', { count: 'exact' }).eq('company_id', company.id),
        supabase.from('sales').select('grand_total').eq('company_id', company.id),
      ]);

      const totalRevenue = revenueRes.data?.reduce((sum, s) => sum + (s.grand_total || 0), 0) || 0;

      setStats({
        totalSales: salesRes.count || 0,
        totalParties: partiesRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalRevenue,
        pendingPayments: 0,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const StatCard = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-card border border-border rounded-lg p-6">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Sales" value={stats.totalSales} />
        <StatCard label="Total Parties" value={stats.totalParties} />
        <StatCard label="Total Products" value={stats.totalProducts} />
        <StatCard label="Total Revenue" value={`${stats.totalRevenue.toFixed(2)}`} />
        <StatCard label="Pending Payments" value={stats.pendingPayments} />
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Start</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✓ Company setup complete</li>
          <li>→ Add parties/customers</li>
          <li>→ Add products</li>
          <li>→ Create sales invoices</li>
          <li>→ Manage payments</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
