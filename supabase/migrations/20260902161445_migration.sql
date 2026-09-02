CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  vat_number VARCHAR(50),
  bin_number VARCHAR(50),
  tin_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  vat_setting VARCHAR(50) DEFAULT 'VAT_OFF',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  unit VARCHAR(50) DEFAULT 'Unit',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  party_id UUID REFERENCES parties(id),
  vat_enabled BOOLEAN DEFAULT FALSE,
  vat_included BOOLEAN DEFAULT FALSE,
  vat_rate DECIMAL(5, 2) DEFAULT 0,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  taxable_amount DECIMAL(12, 2) DEFAULT 0,
  vat_amount DECIMAL(12, 2) DEFAULT 0,
  grand_total DECIMAL(12, 2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'Unpaid',
  salesperson VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10, 2) NOT NULL,
  rate DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) DEFAULT 0,
  vat_percent DECIMAL(5, 2) DEFAULT 0,
  vat_amount DECIMAL(12, 2) DEFAULT 0,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no VARCHAR(50) UNIQUE NOT NULL,
  payment_date DATE NOT NULL,
  party_id UUID REFERENCES parties(id),
  previous_balance DECIMAL(12, 2) DEFAULT 0,
  payment_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  reference_no VARCHAR(100),
  remarks TEXT,
  received_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS money_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no VARCHAR(50) UNIQUE NOT NULL,
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000 INCREMENT 1;

CREATE SEQUENCE IF NOT EXISTS receipt_seq START 5000 INCREMENT 1;