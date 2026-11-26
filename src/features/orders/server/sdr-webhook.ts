import 'server-only';
import { createHmac } from 'node:crypto';
import { OrderError } from '../validation';
import type { SdrPayload } from '../types';

export async function sendToSdr(payload: SdrPayload): Promise<void> {
  const url = process.env.SDR_WEBHOOK_URL?.trim();
  if (!url)
    throw new OrderError(
      'O envio de pedidos ainda não está disponível. Fale com a loja pelo WhatsApp. Seus itens continuam no carrinho.',
      503,
    );
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new OrderError(
      'O atendimento está indisponível no momento. Tente novamente mais tarde.',
      503,
    );
  }
  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
  ) {
    throw new OrderError(
      'O atendimento está indisponível no momento. Tente novamente mais tarde.',
      503,
    );
  }
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = process.env.SDR_WEBHOOK_SECRET;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Guto-Event-Id': payload.event_id,
    'X-Guto-Timestamp': timestamp,
    'Idempotency-Key': payload.event_id,
  };
  if (secret) {
    headers['X-Guto-Signature'] =
      `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
    headers.Authorization = `Bearer ${secret}`;
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error('not_acknowledged');
  } catch {
    throw new OrderError(
      'Não foi possível confirmar o recebimento pelo atendimento. Seus itens continuam no carrinho. Tente novamente.',
      502,
    );
  }
}
