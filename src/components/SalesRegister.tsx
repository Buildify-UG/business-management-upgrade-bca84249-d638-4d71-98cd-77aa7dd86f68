import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, SalesItem } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  company: Company;
}

interface RegisterItem extends SalesItem {
  invoice_no?: string;
  invoice_date?: string;
  party_name?: string;
  salesperson?: string;
}

const SalesRegister: React.FC<Props> = ({ company }) => {
  const [items, setItems] = useState<RegisterItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<RegisterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    invoiceNo: '',
    party: '',
    productName: '',
    productCode: '',
    paymentStatus: '',
  });

  useEffect(() => {
    loadSalesRegister();
  }, [company.id]);

  useEffect(() => {
    applyFilters();
  }, [items, filters, searchTerm]);

  const loadSalesRegister = async () => {
    try {
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('company_id', company.id)
        .order('invoice_date', { ascending: false });

      if (salesError) throw salesError;

      const itemsWithDetails = await Promise.all(
        (sales || []).flatMap(sale =>
          supabase
            .from('sales_items')
            .select('*')
            .eq('sale_id', sale.id)
            .then(({ data: saleItems }) => {
              return (saleItems || []).map(item => ({
                ...item,
                invoice_no: sale.invoice_no,
                invoice_date: sale.invoice_date,
                party_name: '', // Will be fetched separately
                salesperson: sale.salesperson,
                payment_status: sale.payment_status,
              }));
            })
        )
      );

      // Flatten and fetch party names
      const allItems = itemsWithDetails.flat();
      const itemsWithParties = await Promise.all(
        allItems.map(async (item) => {
          const { data: product } = await supabase
            .from('products')
            .select('name, code')
            .eq('id', item.product_id)
            .single();

          const sale = sales?.find(s => s.invoice_no === item.invoice_no);
          const { data: party } = await supabase
            .from('parties')
            .select('name')
            .eq('id', sale?.party_id)
            .single();

          return {
            ...item,
            product_name: product?.name,
            product_code: product?.code,
            party_name: party?.name,
          };
        })
      );

      setItems(itemsWithParties);
    } catch (err) {
      toast.error('Error loading sales register');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = items.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesInvoice = filters.invoiceNo === '' || item.invoice_no?.includes(filters.invoiceNo);
      const matchesParty = filters.party === '' || item.party_name?.includes(filters.party);
      const matchesProduct = filters.productName === '' || item.product_name?.toLowerCase().includes(filters.productName.toLowerCase());
      const matchesCode = filters.productCode === '' || item.product_code?.includes(filters.productCode);
      const matchesStatus = filters.paymentStatus === '' || item.payment_status === filters.paymentStatus;

      const itemDate = new Date(item.invoice_date || '');
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

      const matchesDateRange = (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo);

      return matchesSearch && matchesInvoice && matchesParty && matchesProduct && matchesCode && matchesStatus && matchesDateRange;
    });

    setFilteredItems(filtered);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    // Implement PDF export
    toast.info('PDF export coming soon');
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading sales register...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Sales Register</h2>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary/90">
            Print
          </button>
          <button onClick={handlePDF} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary/90">
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
            placeholder="From Date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
            placeholder="To Date"
          />
          <input
            type="text"
            placeholder="Invoice No"
            value={filters.invoiceNo}
            onChange={(e) => setFilters({ ...filters, invoiceNo: e.target.value })}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Party Name"
            value={filters.party}
            onChange={(e) => setFilters({ ...filters, party: e.target.value })}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          />
          <input
            type="text"
            placeholder="Product Name"
            value={filters.productName}
            onChange={(e) => setFilters({ ...filters, productName: e.target.value })}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          />
          <input
            type="text"
            placeholder="Product Code"
            value={filters.productCode}
            onChange={(e) => setFilters({ ...filters, productCode: e.target.value })}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          />
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Invoice No</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Party</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Code</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Discount</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">VAT %</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">VAT Amt</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Net Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground font-medium">{item.invoice_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(item.invoice_date || ''), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.party_name}</td>
                  <td className="px-4 py-3 text-foreground">{item.product_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{item.product_code}</td>
                  <td className="px-4 py-3 text-right text-foreground">{item.quantity.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{item.rate.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{item.discount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{item.vat_percent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{item.vat_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-foreground font-medium">{item.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                      item.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">No sales found</div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredItems.length} of {items.length} items
      </div>
    </div>
  );
};

export default SalesRegister;
