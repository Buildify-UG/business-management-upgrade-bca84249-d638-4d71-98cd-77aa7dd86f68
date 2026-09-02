import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Party } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  company: Company;
}

interface LedgerEntry {
  date: string;
  invoice_no?: string;
  product_name?: string;
  quantity?: number;
  rate?: number;
  discount?: number;
  vat?: number;
  invoice_total?: number;
  payment?: number;
  balance: number;
}

const PartyLedger: React.FC<Props> = ({ company }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadParties();
  }, [company.id]);

  useEffect(() => {
    if (selectedParty) {
      loadLedger();
    }
  }, [selectedParty]);

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

  const loadLedger = async () => {
    setLoading(true);
    try {
      const entries: LedgerEntry[] = [];
      let runningBalance = 0;

      // Get sales
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('party_id', selectedParty)
        .order('invoice_date', { ascending: true });

      for (const sale of sales || []) {
        const { data: items } = await supabase
          .from('sales_items')
          .select('*')
          .eq('sale_id', sale.id);

        for (const item of items || []) {
          const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', item.product_id)
            .single();

          runningBalance += item.amount + item.vat_amount;
          entries.push({
            date: sale.invoice_date,
            invoice_no: sale.invoice_no,
            product_name: product?.name,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            vat: item.vat_amount,
            invoice_total: sale.grand_total,
            balance: runningBalance,
          });
        }
      }

      // Get payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('party_id', selectedParty)
        .order('payment_date', { ascending: true });

      for (const payment of payments || []) {
        runningBalance -= payment.payment_amount;
        entries.push({
          date: payment.payment_date,
          payment: payment.payment_amount,
          balance: runningBalance,
        });
      }

      // Sort by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setLedger(entries);
    } catch (err) {
      toast.error('Error loading ledger');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Party Ledger</h2>

      <div className="bg-card border border-border rounded-lg p-4">
        <label className="block text-sm font-medium text-foreground mb-2">Select Party</label>
        <select
          value={selectedParty}
          onChange={(e) => setSelectedParty(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="">Choose a party...</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedParty && (
        <>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Party Name</p>
                <p className="text-lg font-semibold text-foreground">
                  {parties.find(p => p.id === selectedParty)?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className={`text-lg font-semibold ${currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {Math.abs(currentBalance).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold text-foreground">
                  {currentBalance > 0 ? 'Due' : 'Paid'}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading ledger...</div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Invoice No</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Product</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Rate</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Discount</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">VAT</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Invoice Total</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Payment</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-3 text-foreground">{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                        <td className="px-4 py-3 text-foreground font-medium">{entry.invoice_no || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.product_name || '-'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{entry.quantity ? entry.quantity.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{entry.rate ? entry.rate.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{entry.discount ? entry.discount.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{entry.vat ? entry.vat.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{entry.invoice_total ? entry.invoice_total.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right text-green-600">{entry.payment ? entry.payment.toFixed(2) : '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{entry.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ledger.length === 0 && (
                <div className="px-4 py-8 text-center text-muted-foreground">No transactions found</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PartyLedger;
