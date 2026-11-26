import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/features/orders/server/create-order';
import { OrderError, orderSchema } from '@/features/orders/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 });
  if (!request.headers.get('content-type')?.includes('application/json'))
    return NextResponse.json({ error: 'Envie os dados em JSON.' }, { status: 415 });
  let raw: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('empty');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 32768) {
        await reader.cancel();
        return NextResponse.json({ error: 'Pedido muito grande.' }, { status: 413 });
      }
      chunks.push(value);
    }
    raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Dados do pedido inválidos.' }, { status: 400 });
  }
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Confira o pedido.' },
      { status: 400 },
    );
  try {
    const receipt = await createOrder(parsed.data);
    return NextResponse.json(
      { order: receipt },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof OrderError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('order_send_failed', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json(
      {
        error:
          'Não foi possível enviar o pedido. Seus itens continuam no carrinho. Tente novamente.',
      },
      { status: 503 },
    );
  }
}
