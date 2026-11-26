import { getCatalog } from '@/features/catalog/server/catalog';
import { Menu } from '@/features/catalog/components/menu';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function Home() {
  const catalog = await getCatalog();
  return <Menu catalog={catalog} />;
}
