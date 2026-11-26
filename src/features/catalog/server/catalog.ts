import 'server-only';
import { database, catalogTable } from '@/server/db';
import reference from '@/features/catalog/data/catalog.json';
import links from '@/features/catalog/data/database-links.json';
import type { Catalog, Product } from '../types';

export interface SdrProduct {
  product_id: number;
  name: string;
  category: string;
  subcategory: string;
  price_cents: number;
}

export async function getSdrProducts(ids?: number[]): Promise<SdrProduct[]> {
  const sql = database();
  const allowed = ids || links.map((link) => link.product_id);
  return sql<SdrProduct[]>`
    select product_id, name, category, subcategory,
      round(coalesce(promotional_price, price) * 100)::integer as price_cents
    from ${catalogTable()}
    where product_id in ${sql(allowed)} and active = true and in_stock is distinct from false`;
}

export async function getCatalog(): Promise<Catalog> {
  const rows = await getSdrProducts();
  const products: Product[] = reference.products.flatMap((product) => {
    const link = links.find((link) => link.pdf_id === product.id);
    const row = rows.find((row) => row.product_id === link?.product_id);
    if (!row) return [];
    return [
      { ...product, id: row.product_id, catalog_name: row.name, price_cents: row.price_cents },
    ];
  });
  return {
    categories: reference.categories.map(({ expected_count: _count, ...category }) => category),
    products,
  };
}
