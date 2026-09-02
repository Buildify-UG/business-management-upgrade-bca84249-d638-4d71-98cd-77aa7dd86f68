import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Party, Payment } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getNextReceiptNo } from '@/lib/supabase';

interface Props {
  company: Company;
}

const PaymentEntry: React.FC<Props> = ({ company }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [receiptNo, setReceiptNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedParty, setSelectedParty] = useState('');
  const [previousBalance, setPreviousBalance] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Cheque' | 'Mobile Banking' | 'Other'>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  useEffect(() => {
    loadData();
    generateReceiptNo();
  }, [company.id]);

  useEffect(() => {
    if (selectedParty) {
      calculatePreviousBalance();
    }
  }, [selectedParty]);

  const generateReceiptNo = async () => {
    try {
      const no = await getNextReceiptNo();
      setReceiptNo(no);
    } catch (err) {
      console.error('Error generating receipt no:', err);
    }
  };

  const loadData = async () => {
    try {
      const [partiesRes, paymentsRes] = await Promise.all([
        supabase.from('parties').select('*').eq('company_id', company.id).order('name'),
        supabase.from('payments').select('*').eq('company_id', company.id).order('payment_date', { ascending: false }),
      ]);

      setParties(partiesRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (err) {
      toast.error('Error loading data');
    }
  };

  const calculatePreviousBalance = async () => {
    try {
      const { data: sales } = await supabase
        .from('sales')
        .select('grand_total')
        .eq('party_id', selectedParty);

      const { data: paymentData } = await supabase
        .from('payments')
        .select('payment_amount')
        .eq('party_id', selectedParty);

      const totalSales = (sales || []).reduce((sum, s) => sum + (s.grand_total || 0), 0);
      const totalPayments = (paymentData || []).reduce((sum, p) => sum + (p.payment_amount || 0), 0);

      setPreviousBalance(totalSales - totalPayments);
    } catch (err) {
      console.error('Error calculating balance:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedParty || paymentAmount <= 0) {
      toast.error('Please select party and enter payment amount');
      return;
    }

    setLoading(true);
    try {
      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          receipt_no: receiptNo,
          payment_date: paymentDate,
          party_id: selectedParty,
          previous_balance: previousBalance,
          payment_amount: paymentAmount,
          payment_method: paymentMethod,
          reference_no: referenceNo,
          remarks,
          received_by: receivedBy,
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create money receipt
      const { error: receiptError } = await supabase
        .from('money_receipts')
        .insert([{
          receipt_no: receiptNo,
          payment_id: payment.id,
        }]);

      if (receiptError) throw receiptError;

      toast.success('Payment recorded and money receipt created');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error saving payment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    generateReceiptNo();
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedParty('');
    setPreviousBalance(0);
    setPaymentAmount(0);
    setPaymentMethod('Cash');
    setReferenceNo('');
    setRemarks('');
    setReceivedBy('');
  };

  const viewMoneyReceipt = async (paymentId: string) => {
    try {
      const { data: receipt } = await supabase
        .from('money_receipts')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (receipt) {
        window.open(`/money-receipt/${receipt.id}`, '_blank');
      }
    } catch (err) {
      toast.error('Error loading money receipt');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Payment Entry</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : 'New Payment'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Receipt No</label>
                <input type="text" value={receiptNo} disabled className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Party *</label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select Party</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Previous Balance</label>
                <input type="number" value={previousBalance.toFixed(2)} disabled className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Payment Amount *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current Balance</label>
                <input type="number" value={(previousBalance - paymentAmount).toFixed(2)} disabled className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mobile Banking">Mobile Banking</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Reference/Cheque No</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Received By</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Payment & Generate Receipt'}
            </button>
          </form>
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Receipt No</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Party</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Method</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const party = parties.find(p => p.id === payment.party_id);
              return (
                <tr key={payment.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground font-medium">{payment.receipt_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(payment.payment_date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{party?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{payment.payment_method}</td>
                  <td className="px-4 py-3 text-right text-foreground font-medium">{payment.payment_amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => viewMoneyReceipt(payment.id)}
                      className="text-primary hover:underline text-sm"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {payments.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">No payments found</div>
        )}
      </div>
    </div>
  );
};

export default PaymentEntry;
