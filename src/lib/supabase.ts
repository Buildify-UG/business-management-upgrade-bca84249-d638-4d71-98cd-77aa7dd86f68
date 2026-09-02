import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onqtczwodsxkkmnsbmwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ucXRjendvZHN4a2ttbnNibXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTkwMzQsImV4cCI6MjEwMzkzNTAzNH0.yeAqHxezQJGetWbZdRZx58127-xWo7QSwjpfdy3AX14';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get next invoice number
export async function getNextInvoiceNo() {
  const { data, error } = await supabase.rpc('nextval', { seq: 'invoice_seq' });
  if (error) throw error;
  return `INV-${String(data).padStart(6, '0')}`;
}

// Helper function to get next receipt number
export async function getNextReceiptNo() {
  const { data, error } = await supabase.rpc('nextval', { seq: 'receipt_seq' });
  if (error) throw error;
  return `RCP-${String(data).padStart(6, '0')}`;
}
