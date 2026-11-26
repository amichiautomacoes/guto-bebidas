import { z } from 'zod';

export const orderSchema = z
  .object({
    idempotency_key: z.uuid(),
    expected_total_cents: z.number().int().positive(),
    customer_name: z.string().trim().min(2, 'Informe seu nome.').max(100),
    customer_phone: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .transform((value) => (value.startsWith('55') && value.length > 11 ? value.slice(2) : value))
      .pipe(z.string().regex(/^[1-9]{2}9?\d{8}$/, 'Informe um WhatsApp válido com DDD.')),
    fulfillment: z.enum(['delivery', 'pickup']),
    address: z.string().trim().max(400).default(''),
    notes: z.string().trim().max(1000).default(''),
    age_confirmed: z.literal(true, { error: 'Confirme que você tem 18 anos ou mais.' }),
    items: z
      .array(
        z
          .object({
            product_id: z.number().int().positive(),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1, 'Adicione pelo menos um item.')
      .max(233),
  })
  .strict()
  .superRefine((order, context) => {
    if (order.fulfillment === 'delivery' && order.address.length < 8) {
      context.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Informe rua, número e bairro para entrega.',
      });
    }
    if (new Set(order.items.map((item) => item.product_id)).size !== order.items.length) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Há produtos repetidos no pedido.',
      });
    }
  });

export type OrderInput = z.infer<typeof orderSchema>;

export class OrderError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}
