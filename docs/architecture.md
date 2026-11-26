# Como o cardápio está organizado

Status: Accepted como descrição da implementação em 26/11/2026.

## A aplicação entrega catálogo e pedidos em um único servidor Next.js

O navegador monta o carrinho e envia os dados do cliente. O servidor consulta
o catálogo existente no Supabase, recalcula os valores e encaminha o pedido
ao SDR. O receptor mantém os pedidos e conduz o atendimento.

Há uma aplicação implantável: Next.js em Node.js. PostgreSQL/Supabase e o
receptor HTTP do SDR são serviços externos. As rotas públicas estão em
[src/app](../src/app): `/`, `/cardapio` e `POST /api/orders`.

## Cada pasta tem uma responsabilidade

| Pasta                  | Responsabilidade e dependências                                             |
| ---------------------- | --------------------------------------------------------------------------- |
| `src/app`              | Rotas e apresentação global; chama os módulos de catálogo e pedidos.        |
| `src/features/catalog` | Referência do PDF, componentes, tipos e consulta dos produtos.              |
| `src/features/orders`  | Schema compartilhado, tipos de eventos, serviço do pedido e integração SDR. |
| `src/server`           | Infraestrutura PostgreSQL; não pode ser importada pelo navegador.           |
| `src/shared`           | Funções comuns sem credenciais ou efeitos externos.                         |
| `scripts/catalog`      | Manutenção explícita de arquivos locais do catálogo.                        |
| `tests`                | Suites unitária, de integração e de navegador, executadas separadamente.    |

Os arquivos `server/` importam `server-only`. Os componentes do navegador
podem importar tipos e validação compartilhada, mantendo conexões e segredos
no servidor. Prefira imports `@/` entre módulos e imports relativos dentro
do mesmo módulo.

## O servidor valida os produtos e o total antes de enviar

1. [page.tsx](../src/app/page.tsx) chama
   [getCatalog](../src/features/catalog/server/catalog.ts). A consulta usa os
   IDs vinculados ao PDF e filtra produtos ativos e disponíveis.
2. [Menu](../src/features/catalog/components/menu.tsx) controla categorias,
   busca, quantidades e revisão. O carrinho usa `localStorage`; a tentativa
   de envio usa `sessionStorage` para manter sua chave de idempotência.
3. [POST /api/orders](../src/app/api/orders/route.ts) confere origem, JSON,
   limite de 32 KiB e [schema](../src/features/orders/validation.ts).
4. [createOrder](../src/features/orders/server/create-order.ts) consulta os
   preços atuais, confere a disponibilidade e compara o total com o revisado.
5. [sendToSdr](../src/features/orders/server/sdr-webhook.ts) envia o evento
   `order.created`. Apenas uma resposta 2xx gera a confirmação e permite
   limpar o carrinho.

## O PDF define a apresentação e o Supabase define os dados operacionais

[catalog.json](../src/features/catalog/data/catalog.json) preserva a ordem,
os nomes, as categorias e o preço de referência dos 233 produtos.
[database-links.json](../src/features/catalog/data/database-links.json)
relaciona o identificador da referência ao `product_id` numérico do SDR.
Preços atuais, promoções e disponibilidade vêm exclusivamente de
`"guto-bebidas"."sdr-guto-bebidas"`, por
[consulta PostgreSQL](../src/server/db.ts). A aplicação não executa migrações
nem grava nessa tabela.

Valores monetários usam centavos inteiros. O nome enviado ao SDR vem do banco;
a interface preserva o nome do PDF. O [contrato do webhook](integracao-sdr.md)
define o payload, a autenticação e a resposta esperada do receptor.

## Falhas preservam o pedido para uma nova tentativa

Produtos indisponíveis ou mudança de total retornam 409. Webhook ausente
retorna 503; falha de entrega retorna 502. O transporte tem timeout de
8 segundos, recusa redirecionamentos e exige HTTPS, com exceção de HTTP local.
O cliente conserva os itens e os dados preenchidos quando o envio falha.

O servidor reúne tentativas com a mesma chave em memória por até 30 minutos.
Essa proteção vale por processo. O SDR precisa persistir e deduplicar o
`event_id`/`Idempotency-Key` para cobrir reinícios e múltiplas instâncias.
O envio não tem fila durável nem retentativa em segundo plano.

## Configuração e credenciais ficam fora do código versionado

Os nomes necessários estão em [.env.example](../.env.example). Não use o
prefixo `NEXT_PUBLIC_` para a conexão PostgreSQL ou para o segredo do webhook.
[check-env.mjs](../scripts/check-env.mjs) valida os nomes sem imprimir seus
valores. O endpoint aceita pedidos públicos com dados validados; autenticação
do cliente não faz parte do fluxo atual.

## Mudanças seguem os limites dos módulos

Para incluir um produto, atualize a referência do PDF e regenere os vínculos
usando um ID existente no SDR. Para alterar uma regra de pedido, edite o
schema compartilhado e o serviço do pedido. Para mudar o contrato externo,
atualize os tipos, o transporte, a documentação e a integração com receptor
local. A identidade visual segue o PDF e as regras de [AGENTS.md](../AGENTS.md).

## A integração real depende da configuração do receptor

O webhook real, a persistência e a deduplicação no SDR ainda precisam ser
validados com o responsável pelo receptor. Os testes automatizados usam
dados sintéticos e entrega local ou interceptada. A evidência da revisão
visual está em [design-refinement.md](design-refinement.md).
