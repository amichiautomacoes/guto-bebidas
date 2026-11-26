import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { orderSchema } from '@/features/orders/validation';

test('validates numeric SDR IDs, phone, quantities, delivery and age confirmation', () => {
  const base = () => ({
    idempotency_key: randomUUID(),
    expected_total_cents: 850,
    customer_name: 'Cliente Teste',
    customer_phone: '(31) 99999-0000',
    fulfillment: 'pickup' as const,
    address: '',
    notes: '',
    age_confirmed: true as const,
    items: [{ product_id: 1, quantity: 1 }],
  });
  assert.equal(orderSchema.parse(base()).customer_phone, '31999990000');
  assert.equal(
    orderSchema.parse({ ...base(), customer_phone: '+55 (31) 99999-0000' }).customer_phone,
    '31999990000',
  );
  for (const bad of [
    { ...base(), age_confirmed: false },
    { ...base(), items: [] },
    { ...base(), items: [{ product_id: randomUUID(), quantity: 1 }] },
    { ...base(), items: [{ product_id: 1, quantity: 100 }] },
    { ...base(), items: [{ product_id: 1, quantity: 0 }] },
    { ...base(), items: [{ product_id: 1, quantity: 1.5 }] },
    {
      ...base(),
      items: [
        { product_id: 1, quantity: 1 },
        { product_id: 1, quantity: 2 },
      ],
    },
    { ...base(), fulfillment: 'delivery', address: '' },
    { ...base(), customer_phone: '123' },
    { ...base(), unit_price: 1 },
  ])
    assert.equal(orderSchema.safeParse(bad).success, false);
});
