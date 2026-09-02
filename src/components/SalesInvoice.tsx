import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Party, Product, Sale, SalesItem } from '@/types';
import { toast } from 'sonner';
import { getNextInvoiceNo } from '@/lib/supabase';
import { format } from 'date-fns';

interface Props {
  company: Company;
}

interface LineItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  rate: number;
  discount: number;
  vat_percent: number;
}

const SalesInvoice: React.FC<Props> = ({ company }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedPartyData, setSelectedPartyData] = useState<Party | null>(null);
  const [salesperson, setSalesperson] = useState('');

  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatRate, setVatRate] = useState(15);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadData();
    generateInvoiceNo();
  }, [company.id]);

  useEffect(() => {
    if (selectedParty) {
      const party = parties.find(p => p.id === selectedParty);
      setSelectedPartyData(party || null);
      if (party?.vat_setting === 'VAT_ON_INCLUDED') {
        setVatEnabled(true);
        setVatIncluded(true);
      } else if (party?.vat_setting === 'VAT_ON_EXCLUDED') {
        setVatEnabled(true);
        setVatIncluded(false);
      } else {
        setVatEnabled(false);
      }
    }
  }, [selectedParty, parties]);

  const generateInvoiceNo = async () => {
    try {
      const no = await getNextInvoiceNo();
      setInvoiceNo(no);
    } catch (err) {
      console.error('Error generating invoice no:', err);
    }
  };

  const loadData = async () => {
    try {
      const [partiesRes, productsRes, salesRes] = await Promise.all([
        supabase.from('parties').select('*').eq('company_id', company.id).order('name'),
        supabase.from('products').select('*').eq('company_id', company.id).order('name'),
        supabase.from('sales').select('*').eq('company_id', company.id).order('invoice_date', { ascending: false }),
      ]);

      setParties(partiesRes.data || []);
      setProducts(productsRes.data || []);
      setSales(salesRes.data || []);
    } catch (err) {
      toast.error('Error loading data');
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Math.random().toString(),
      product_id: '',
      quantity: 1,
      rate: 0,
      discount: 0,
      vat_percent: vatEnabled ? vatRate : 0,
    }]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          updated.product = product;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalVat = 0;

    lineItems.forEach(item => {
      if (!item.product_id) return;
      const itemTotal = item.quantity * item.rate;
      const itemDiscount = item.discount;
      const taxableAmount = itemTotal - itemDiscount;

      subtotal += itemTotal;
      totalDiscount += itemDiscount;

      if (vatEnabled) {
        if (vatIncluded) {
          const vat = (taxableAmount * item.vat_percent) / (100 + item.vat_percent);
          totalVat += vat;
        } else {
          const vat = (taxableAmount * item.vat_percent) / 100;
          totalVat += vat;
        }
      }
    });

    const taxableAmount = subtotal - totalDiscount;
    const grandTotal = vatIncluded ? subtotal - totalDiscount : subtotal - totalDiscount + totalVat;

    return { subtotal, totalDiscount, taxableAmount, totalVat, grandTotal };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    if (!selectedParty || lineItems.length === 0) {
      toast.error('Please select party and add items');
      return;
    }

    setLoading(true);
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          party_id: selectedParty,
          vat_enabled: vatEnabled,
          vat_included: vatIncluded,
          vat_rate: vatRate,
          subtotal: totals.subtotal,
          discount: totals.totalDiscount,
          taxable_amount: totals.taxableAmount,
          vat_amount: totals.totalVat,
          grand_total: totals.grandTotal,
          payment_status: 'Unpaid',
          salesperson,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert line items
      const itemsToInsert = lineItems.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        vat_percent: item.vat_percent,
        vat_amount: (item.quantity * item.rate - item.discount) * item.vat_percent / (vatIncluded ? 100 + item.vat_percent : 100),
        amount: item.quantity * item.rate - item.discount,
      }));

      const { error: itemsError } = await supabase
        .from('sales_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of lineItems) {
        const { data: stock } = await supabase
          .from('stock')
          .select('quantity')
          .eq('product_id', item.product_id)
          .single();

        if (stock) {
          await supabase
            .from('stock')
            .update({ quantity: (stock.quantity || 0) - item.quantity })
            .eq('product_id', item.product_id);
        }
      }

      toast.success('Invoice saved successfully');
      setShowForm(false);
      setLineItems([]);
      generateInvoiceNo();
      setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedParty('');
      setSalesperson('');
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error saving invoice');
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = (sale: Sale) => {
    window.open(`/invoice/${sale.id}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Sales Invoice</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : 'New Invoice'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Invoice No</label>
              <input type="text" value={invoiceNo} disabled className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Salesperson</label>
              <input
                type="text"
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>

          {/* VAT Settings */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-4">VAT Settings</h3>
            <div className="grid grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">VAT Enabled</span>
              </label>
              {vatEnabled && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={vatIncluded}
                      onChange={(e) => setVatIncluded(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">VAT Included</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">VAT Rate %</label>
                    <input
                      type="number"
                      value={vatRate}
                      onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="w-full px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-4">Items</h3>
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-10 gap-2 items-end">
                  <select
                    value={item.product_id}
                    onChange={(e) => updateLineItem(item.id, 'product_id', e.target.value)}
                    className="col-span-3 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Discount"
                    value={item.discount}
                    onChange={(e) => updateLineItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                  />
                  {vatEnabled && (
                    <input
                      type="number"
                      placeholder="VAT %"
                      value={item.vat_percent}
                      onChange={(e) => updateLineItem(item.id, 'vat_percent', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                    />
                  )}
                  <button
                    onClick={() => removeLineItem(item.id)}
                    className="text-destructive hover:underline text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addLineItem}
              className="mt-3 text-primary hover:underline text-sm font-medium"
            >
              + Add Item
            </button>
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-8 max-w-xs ml-auto">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal:</p>
                <p className="text-sm text-muted-foreground">Discount:</p>
                <p className="text-sm text-muted-foreground">Taxable Amount:</p>
                {vatEnabled && <p className="text-sm text-muted-foreground">VAT ({vatRate}%):</p>}
                <p className="text-lg font-bold text-foreground mt-2">Grand Total:</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground">{totals.subtotal.toFixed(2)}</p>
                <p className="text-sm text-foreground">{totals.totalDiscount.toFixed(2)}</p>
                <p className="text-sm text-foreground">{totals.taxableAmount.toFixed(2)}</p>
                {vatEnabled && <p className="text-sm text-foreground">{totals.totalVat.toFixed(2)}</p>}
                <p className="text-lg font-bold text-foreground mt-2">{totals.grandTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Invoice No</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Party</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const party = parties.find(p => p.id === sale.party_id);
              return (
                <tr key={sale.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground font-medium">{sale.invoice_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(sale.invoice_date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{party?.name}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{sale.grand_total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      sale.payment_status === 'Paid'
                        ? 'bg-green-100 text-green-800'
                        : sale.payment_status === 'Partial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => printInvoice(sale)} className="text-primary hover:underline text-sm">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">No sales found</div>
        )}
      </div>
    </div>
  );
};

export default SalesInvoice;
