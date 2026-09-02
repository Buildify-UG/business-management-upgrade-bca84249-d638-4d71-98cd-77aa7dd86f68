export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  vat_number?: string;
  bin_number?: string;
  tin_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: string;
  company_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  vat_setting: 'VAT_OFF' | 'VAT_ON_INCLUDED' | 'VAT_ON_EXCLUDED';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  code: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
}

export interface SalesItem {
  id: string;
  sale_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  rate: number;
  discount: number;
  vat_percent: number;
  vat_amount: number;
  amount: number;
  created_at: string;
}

export interface Sale {
  id: string;
  invoice_no: string;
  invoice_date: string;
  party_id: string;
  party?: Party;
  vat_enabled: boolean;
  vat_included: boolean;
  vat_rate: number;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  vat_amount: number;
  grand_total: number;
  payment_status: 'Paid' | 'Unpaid' | 'Partial';
  salesperson?: string;
  items?: SalesItem[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  receipt_no: string;
  payment_date: string;
  party_id: string;
  party?: Party;
  previous_balance: number;
  payment_amount: number;
  payment_method: 'Cash' | 'Bank' | 'Cheque' | 'Mobile Banking' | 'Other';
  reference_no?: string;
  remarks?: string;
  received_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MoneyReceipt {
  id: string;
  receipt_no: string;
  payment_id: string;
  payment?: Payment;
  created_at: string;
}
