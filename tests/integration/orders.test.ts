import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { after, test } from 'node:test';
import { getCatalog } from '@/features/catalog/server/catalog';
import { createOrder } from '@/features/orders/server/create-order';
import { orderSchema } from '@/features/orders/validation';
import { database } from '@/server/db';
import type { SdrPayload } from '@/features/orders/types';
import reference from '@/features/catalog/data/catalog.json';
import links from '@/features/catalog/data/database-links.json';

after(async () => {
  await database().end();
});

const base = () => ({
  idempotency_key: randomUUID(),
  expected_total_cents: 850,
  customer_name: 'Cliente Teste',
  customer_phone: '(31) 99999-0000',
  fulfillment: 'pickup' as const,
  address: '',
  notes: '',
  age_confirmed: true as const,
  items: [{ product_id: links[0].product_id, quantity: 1 }],
});

test('available SDR products preserve PDF identity and use live prices', async () => {
  const catalog = await getCatalog();
  assert.equal(reference.products.length, 233);
  assert.equal(links.length, 233);
  assert.equal(new Set(links.map((link) => link.product_id)).size, 233);
  assert.ok(catalog.products.length > 0 && catalog.products.length <= 233);
  assert.equal(catalog.categories.length, 9);
  for (const product of catalog.products) {
    assert.equal(typeof product.id, 'number');
    const original = reference.products.find((row) => row.position === product.position)!;
    assert.equal(product.name, original.name);
    assert.ok(Number.isInteger(product.price_cents) && product.price_cents >= 0);
  }
});

test('real catalog + local webhook: correct totals, signatures, retries, idempotency, and price changes', async () => {
  let calls = 0;
  let status = 200;
  let received: SdrPayload | undefined;
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    calls++;
    received = JSON.parse(body);
    const timestamp = String(request.headers['x-guto-timestamp']);
    assert.equal(
      request.headers['x-guto-signature'],
      `sha256=${createHmac('sha256', 'local-test-secret').update(`${timestamp}.${body}`).digest('hex')}`,
    );
    assert.equal(request.headers['idempotency-key'], received?.event_id);
    response.writeHead(status).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  const previousUrl = process.env.SDR_WEBHOOK_URL;
  const previousSecret = process.env.SDR_WEBHOOK_SECRET;
  process.env.SDR_WEBHOOK_URL = `http://127.0.0.1:${address.port}/orders`;
  process.env.SDR_WEBHOOK_SECRET = 'local-test-secret';
  try {
    const catalog = await getCatalog();
    const [first, second] = catalog.products;
    const input = orderSchema.parse({
      ...base(),
      expected_total_cents: first.price_cents * 2 + second.price_cents * 3,
      items: [
        { product_id: first.id, quantity: 2 },
        { product_id: second.id, quantity: 3 },
      ],
    });
    const [receipt, same] = await Promise.all([createOrder(input), createOrder(input)]);
    assert.deepEqual(receipt, same);
    assert.equal(calls, 1);
    assert.equal(receipt.delivery_status, 'delivered');
    assert.equal(received!.order.total_cents, input.expected_total_cents);
    assert.deepEqual(
      received!.order.items.map((item) => item.product_id),
      [first.id, second.id],
    );
    assert.equal(received!.order.items[0].catalog_table, 'sdr-guto-bebidas');
    assert.equal(received!.order.items[0].name, first.catalog_name);
    assert.equal(received!.order.customer.phone, '5531999990000');
    await assert.rejects(createOrder({ ...input, notes: 'different payload' }), /outro pedido/);
    await assert.rejects(
      createOrder({ ...input, idempotency_key: randomUUID(), expected_total_cents: 1 }),
      /preço/,
    );
    assert.equal(calls, 1);
    const retry = { ...input, idempotency_key: randomUUID() };
    status = 500;
    await assert.rejects(createOrder(retry), /recebimento/);
    const retryEventId = received!.event_id;
    status = 200;
    await createOrder(retry);
    assert.equal(received!.event_id, retryEventId);
    assert.equal(calls, 3);
    delete process.env.SDR_WEBHOOK_URL;
    await assert.rejects(
      createOrder({ ...input, idempotency_key: randomUUID() }),
      /ainda não está disponível/,
    );
  } finally {
    if (previousUrl === undefined) delete process.env.SDR_WEBHOOK_URL;
    else process.env.SDR_WEBHOOK_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.SDR_WEBHOOK_SECRET;
    else process.env.SDR_WEBHOOK_SECRET = previousSecret;
    server.close();
    await once(server, 'close');
  }
});
