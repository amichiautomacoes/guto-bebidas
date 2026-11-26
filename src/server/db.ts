import 'server-only';
import postgres from 'postgres';

const globalDb = globalThis as unknown as { gutoSql?: ReturnType<typeof postgres> };

export function database() {
  if (!process.env.SUPABASE_DATABASE_URL) throw new Error('SUPABASE_DATABASE_URL não configurada.');
  if (!globalDb.gutoSql) {
    globalDb.gutoSql = postgres(process.env.SUPABASE_DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 12,
      prepare: false,
      ssl: 'require',
      onnotice: () => {},
    });
  }
  return globalDb.gutoSql;
}

export function catalogTable() {
  return database()(`${process.env.SUPABASE_SCHEMA || 'guto-bebidas'}.sdr-guto-bebidas`);
}
