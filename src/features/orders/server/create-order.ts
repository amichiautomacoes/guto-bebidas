import 'server-only';
import { createHash } from 'node:crypto';
import { getSdrProducts } from '@/features/catalog/server/catalog';
import { OrderError, type OrderInput } from '../validation';
import { sendToSdr } from './sdr-webhook';
import type { OrderReceipt, SdrPayload } from '../types';
import links from '@/features/catalog/data/database-links.json';

// Process-local coalescing. The SDR must also deduplicate the stable event_id /
// Idempotency-Key across server restarts and multiple application instances.
const attempts = new Map<
  string,
  { hash: string; expires: number; result: Promise<OrderReceipt> }
>();

export async function createOrder(input: OrderInput): Promise<OrderReceipt> {
  for (const [key, value] of attempts) if (value.expires < Date.now()) attempts.delete(key);
  const canonical = {
    ...input,
    address: input.fulfillment === 'pickup' ? '' : input.address,
    items: [...input.items].sort((a, b) => a.product_id - b.product_id),
  };
  const hash = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  const previous = attempts.get(input.idempotency_key);
  if (previous) {
    if (previous.hash !== hash)
      throw new OrderError(
        'Esta tentativa já foi usada para outro pedido. Revise os itens e tente novamente.',
        409,
      );
    return previous.result;
  }
  const result = sendOrder(input);
  if (attempts.size >= 1000) attempts.delete(attempts.keys().next().value!);
  attempts.set(input.idempotency_key, { hash, expires: Date.now() + 30 * 60 * 1000, result });
  try {
    return await result;
  } catch (error) {
    attempts.delete(input.idempotency_key);
    throw error;
  }
}

async function sendOrder(input: OrderInput): Promise<OrderReceipt> {
  const ids = input.items.map((item) => item.product_id);
  if (ids.some((id) => !links.some((link) => link.product_id === id)))
    throw new OrderError('Este produto não faz parte do cardápio.', 400);
  const products = await getSdrProducts(ids);
  if (products.length !== ids.length)
    throw new OrderError(
      'Um produto ficou indisponível. Atualize o cardápio antes de concluir.',
      409,
    );
  const items = input.items.map((item) => {
    const product = products.find((product) => product.product_id === item.product_id)!;
    return {
      product_id: product.product_id,
      catalog_table: 'sdr-guto-bebidas' as const,
      name: product.name,
      category: product.category,
      subcategory: product.subcategory,
      category_name: product.category,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
      line_total_cents: item.quantity * product.price_cents,
    };
  });
  const total = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  if (total !== input.expected_total_cents)
    throw new OrderError(
      'O preço de um item mudou. Atualize o cardápio e confira o total antes de enviar.',
      409,
    );
  const id = input.idempotency_key;
  const reference = `GB-${id.slice(0, 8).toUpperCase()}`;
  const payload: SdrPayload = {
    event: 'order.created',
    version: 1,
    event_id: id,
    occurred_at: new Date().toISOString(),
    order: {
      id,
      reference,
      status: 'received',
      currency: 'BRL',
      source: 'digital_menu',
      customer: { name: input.customer_name, phone: `55${input.customer_phone}` },
      fulfillment: {
        type: input.fulfillment,
        address: input.fulfillment === 'delivery' ? input.address : null,
      },
      notes: input.notes,
      total_cents: total,
      items,
    },
  };
  await sendToSdr(payload);
  return { id, reference, total_cents: total, delivery_status: 'delivered' };
}
