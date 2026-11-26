# Conecte o cardápio ao SDR

Status: Draft · Implementação conferida em 26/11/2026.
Pendente: URL do webhook e eventual segredo, a informar pelo responsável pelo
SDR. O contrato corresponde a [orders.ts](../src/features/orders/server/create-order.ts) e
[webhooks.ts](../src/features/orders/server/sdr-webhook.ts).

## O cardápio usa os mesmos IDs que o SDR

A única tabela consultada é `"guto-bebidas"."sdr-guto-bebidas"`.
O vínculo principal de cada item é `product_id`, um inteiro dessa tabela.
O campo `name` enviado ao agente também vem dessa tabela; a interface
conserva a grafia do PDF. Não há migração nem escrita no banco.

## O webhook recebe um POST depois da revisão do cliente

Configure `SDR_WEBHOOK_URL` no `.env`. Use HTTPS; HTTP é aceito apenas
para testes em `localhost` e `127.0.0.1`.

| Operação                             | Resultado                                       |
| ------------------------------------ | ----------------------------------------------- |
| Navegador → `POST /api/orders`       | Validação e consulta dos itens na tabela do SDR |
| Servidor → `POST ${SDR_WEBHOOK_URL}` | Pedido completo, com timeout de 8 segundos      |
| Receptor responde 2xx                | Confirmação ao cliente e limpeza do carrinho    |
| Falha, timeout ou URL ausente        | Carrinho preservado para nova tentativa         |

O receptor precisa persistir o pedido antes de responder 2xx. A aplicação
não mantém uma fila no Supabase. O armazenamento, os estados do pedido e o
contato com o cliente pertencem ao SDR.

## Cada evento identifica produtos, cliente e valores

Exemplo sintético; use os `product_id` existentes no catálogo:

```json
{
  "event": "order.created",
  "version": 1,
  "event_id": "e95c710e-10e5-4db6-93bd-d0594b6fe78a",
  "occurred_at": "2026-11-26T15:00:00.000Z",
  "order": {
    "id": "e95c710e-10e5-4db6-93bd-d0594b6fe78a",
    "reference": "GB-E95C710E",
    "status": "received",
    "currency": "BRL",
    "source": "digital_menu",
    "customer": { "name": "Cliente Exemplo", "phone": "5531999990000" },
    "fulfillment": { "type": "pickup", "address": null },
    "notes": "",
    "total_cents": 1700,
    "items": [
      {
        "product_id": 1,
        "catalog_table": "sdr-guto-bebidas",
        "name": "PRODUTO EXEMPLO",
        "category": "CERVEJAS",
        "subcategory": "LONG NECK",
        "category_name": "CERVEJAS",
        "quantity": 2,
        "unit_price_cents": 850,
        "line_total_cents": 1700
      }
    ]
  }
}
```

Os valores são inteiros em centavos. O telefone inclui `55` e DDD.
`fulfillment.type` aceita `delivery` ou `pickup`; a entrega exige endereço.
O frete não integra `total_cents`: a equipe confirma o valor e o pagamento
no atendimento.

## Autentique e deduplique o recebimento

Todos os envios incluem `Content-Type: application/json`, `Idempotency-Key`,
`X-Guto-Event-Id` e `X-Guto-Timestamp`. Quando `SDR_WEBHOOK_SECRET` está
configurado, incluem também `Authorization: Bearer <segredo>` e
`X-Guto-Signature`.

A assinatura tem formato `sha256=<hex>`, calculado com HMAC-SHA256 sobre
`timestamp + "." + corpo JSON original`, usando o segredo. Confira a
assinatura e a idade do timestamp antes de processar.

Use uma restrição de unicidade em `event_id` no armazenamento do receptor.
Uma nova tentativa mantém o mesmo ID, pois um timeout pode acontecer depois
do recebimento. A aplicação reúne chamadas simultâneas no mesmo processo
por até 30 minutos; esse cache não substitui a deduplicação persistente
no receptor, sobretudo com múltiplas instâncias ou após reinício.

## Erros preservam o carrinho

O endpoint interno devolve `{ "error": "mensagem" }` com HTTP 400 para dados
inválidos, 403 para origem recusada, 409 para preço alterado ou produto
indisponível, 413 para corpo acima de 32 KiB, 415 para formato incompatível,
502 para falha no webhook e 503 para configuração ou conexão indisponível.
Uma resposta 201 inclui `{ "order": { ... } }` com ID, referência e subtotal,
sem devolver dados pessoais.

## A ativação depende da configuração do receptor

O responsável pelo SDR precisa informar a URL, configurar o segredo se
necessário e reiniciar o servidor. O teste de recebimento real permanece
pendente. Os testes locais usam um receptor simulado, conforme
[orders.test.ts](../tests/integration/orders.test.ts).

Histórico: contrato inicial em 26/11/2026. Não há OpenAPI separado; os campos
são definidos em [types.ts](../src/features/orders/types.ts) e
[order-validation.ts](../src/features/orders/validation.ts).
