/** Rebuild local PDF-to-SDR mappings using a read-only database transaction. */
import { writeFile } from 'node:fs/promises';
import { database, catalogTable } from '@/server/db';
import reference from '@/features/catalog/data/catalog.json';

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const sql = database();
try {
  const rows = await sql.begin(
    'read only',
    (transaction) =>
      transaction<{ product_id: number; name: string }[]>`
      select product_id, name from ${catalogTable()}
    `,
  );
  const links = reference.products.map((product) => {
    const matches = rows.filter((row) => normalize(row.name) === normalize(product.name));
    if (matches.length !== 1) {
      throw new Error(`Produto sem correspondência única: ${product.name}`);
    }
    return { pdf_id: product.id, product_id: matches[0].product_id };
  });
  if (new Set(links.map((link) => link.product_id)).size !== links.length) {
    throw new Error('Há produtos vinculados ao mesmo ID do SDR. Nenhum arquivo foi alterado.');
  }
  await writeFile(
    new URL('../../src/features/catalog/data/database-links.json', import.meta.url),
    `${JSON.stringify(links, null, 2)}\n`,
  );
  console.log(`${links.length} produtos vinculados. Supabase consultado somente para leitura.`);
} finally {
  await sql.end();
}
