import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) loadEnvFile('.env');

let failures = 0;
function check(name, valid, detail) {
  console.log(`${valid ? 'OK' : 'ERRO'} ${name}: ${detail}`);
  if (!valid) failures++;
}

let databaseUrl;
try {
  databaseUrl = new URL(process.env.SUPABASE_DATABASE_URL);
} catch {
  // Print only variable names, never their values.
}
check(
  'SUPABASE_DATABASE_URL',
  !!databaseUrl && ['postgres:', 'postgresql:'].includes(databaseUrl.protocol),
  'URL PostgreSQL necessária para consultar o catálogo.',
);
check(
  'SUPABASE_SCHEMA',
  !process.env.SUPABASE_SCHEMA || process.env.SUPABASE_SCHEMA === 'guto-bebidas',
  'Utilize guto-bebidas ou deixe vazio para o padrão.',
);

if (process.env.SDR_WEBHOOK_URL?.trim()) {
  let webhook;
  try {
    webhook = new URL(process.env.SDR_WEBHOOK_URL);
  } catch {
    // Invalid URL is reported without exposing its contents.
  }
  check(
    'SDR_WEBHOOK_URL',
    !!webhook &&
      (webhook.protocol === 'https:' ||
        (webhook.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(webhook.hostname))),
    'HTTPS obrigatório; HTTP permitido apenas para testes locais.',
  );
} else if (process.argv.includes('--production')) {
  check('SDR_WEBHOOK_URL', false, 'Configure o receptor antes de aceitar pedidos reais.');
} else {
  console.log('AVISO SDR_WEBHOOK_URL: ausente; o envio de pedidos permanece indisponível.');
}
console.log(
  `SDR_WEBHOOK_SECRET: ${process.env.SDR_WEBHOOK_SECRET ? 'configurado' : 'não configurado'}.`,
);
process.exitCode = failures ? 1 : 0;
