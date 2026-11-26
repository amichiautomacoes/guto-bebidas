import assert from 'node:assert/strict';
import { test } from 'node:test';
import reference from '@/features/catalog/data/catalog.json';
import links from '@/features/catalog/data/database-links.json';

test('all 233 PDF products map once to a numeric SDR ID and a valid category', () => {
  assert.equal(reference.products.length, 233);
  assert.equal(reference.categories.length, 9);
  assert.equal(links.length, reference.products.length);
  assert.equal(new Set(links.map((link) => link.product_id)).size, links.length);
  assert.equal(new Set(links.map((link) => link.pdf_id)).size, links.length);
  const categories = new Set(reference.categories.map((category) => category.id));
  for (const product of reference.products) {
    const link = links.find((item) => item.pdf_id === product.id);
    assert.ok(link && Number.isInteger(link.product_id) && link.product_id > 0);
    assert.ok(categories.has(product.category_id));
    assert.ok(Number.isInteger(product.price_cents) && product.price_cents > 0);
  }
});
