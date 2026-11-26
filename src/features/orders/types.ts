export interface OrderReceipt {
  id: string;
  reference: string;
  total_cents: number;
  delivery_status: 'delivered';
}

export interface SdrPayload {
  event: 'order.created';
  version: 1;
  event_id: string;
  occurred_at: string;
  order: {
    id: string;
    reference: string;
    status: 'received';
    currency: 'BRL';
    source: 'digital_menu';
    customer: { name: string; phone: string };
    fulfillment: { type: 'delivery' | 'pickup'; address: string | null };
    notes: string;
    total_cents: number;
    items: {
      product_id: number;
      catalog_table: 'sdr-guto-bebidas';
      name: string;
      category: string;
      subcategory: string;
      category_name: string;
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
    }[];
  };
}
