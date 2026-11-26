# Cardápio digital · Guto Bebidas 01

Cardápio em Next.js e TypeScript com a identidade visual e os 233 produtos do
[PDF original](docs/reference/cardapio-guto-bebidas.pdf). Os preços e a disponibilidade
vêm da tabela existente `"guto-bebidas"."sdr-guto-bebidas"`. Cada pedido usa os
`product_id` numéricos originais e é enviado ao SDR por webhook.

## Executar localmente

Use Node.js 22.14 ou superior e npm. A versão principal está em [.nvmrc](.nvmrc).

```sh
npm ci
```

Se ainda não tiver um `.env`, copie [.env.example](.env.example) e preencha as
variáveis. Preserve o arquivo existente ao atualizar o projeto.

```sh
npm run env:check
npm run dev
```

Abra <http://127.0.0.1:3000>. As rotas `/` e `/cardapio` exibem o mesmo cardápio.

## Configuração

As credenciais ficam no `.env`, ignorado pelo Git. Nenhuma variável do servidor
usa o prefixo `NEXT_PUBLIC_`.

| Variável                | Uso                                                                        |
| ----------------------- | -------------------------------------------------------------------------- |
| `SUPABASE_DATABASE_URL` | Obrigatória para consultar o PostgreSQL; use o pooler se precisar de IPv4. |
| `SUPABASE_SCHEMA`       | Padrão `guto-bebidas`; a tabela é sempre `sdr-guto-bebidas`.               |
| `SDR_WEBHOOK_URL`       | URL HTTPS do receptor, necessária para concluir pedidos reais.             |
| `SDR_WEBHOOK_SECRET`    | Opcional conforme o receptor; autentica e assina os envios.                |

`SUPABASE_URL` e `SUPABASE_SECRET_KEY` não são necessárias nesta implementação,
que utiliza a conexão PostgreSQL. Eventuais `GIT_URL` e `GIT_TOKEN` locais são
credenciais de desenvolvimento e não pertencem à configuração da hospedagem.

O carrinho só é limpo após o receptor confirmar com HTTP 2xx. Sem webhook
configurado, o cliente pode montar o pedido e falar com a loja pelo WhatsApp.
A persistência e a deduplicação dos pedidos ficam com o receptor. Consulte o
[contrato SDR](docs/integracao-sdr.md).

## Estrutura

```text
.agents/skills/              Skills Taste e Impeccable, com origem fixada
.github/workflows/          Verificações automáticas do GitHub
docs/                       Arquitetura, integração, revisão e evidências
  reference/                PDF original do cardápio
public/                     Imagens e fonte extraídas do PDF
scripts/
  catalog/                  Extração do PDF e vínculo com IDs do SDR
  testing/                  Execução dos testes Node em Windows e Linux
src/
  app/                      Rotas, layout, estilos e endpoint HTTP
  features/
    catalog/                Componentes, referência, tipos e consulta do catálogo
    orders/                 Validação, tipos, criação do pedido e webhook
  server/                   Conexão PostgreSQL, exclusiva do servidor
  shared/                   Formatação compartilhada
tests/
  unit/                     Validação e integridade do catálogo, sem credenciais
  integration/              Leitura do Supabase e webhook simulado localmente
  e2e/                      Fluxo de compra e acessibilidade no navegador
```

A [arquitetura](docs/architecture.md) explica as responsabilidades e o caminho
do pedido. Arquivos gerados, caches, ambientes Python e resultados de testes
ficam fora do Git. As skills instaladas têm suas licenças em [docs/licenses](docs/licenses).

## Comandos

| Comando                             | Resultado                                                            |
| ----------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                       | Servidor de desenvolvimento em `127.0.0.1:3000`.                     |
| `npm run build`                     | Build de produção.                                                   |
| `npm start`                         | Inicia o build; aceita `PORT` e os argumentos do Next.js.            |
| `npm run check`                     | Formatação, tipos, testes unitários e build; também executado no CI. |
| `npm run format`                    | Formata o código e a documentação próprios do projeto.               |
| `npm run typecheck`                 | Gera os tipos das rotas e verifica TypeScript.                       |
| `npm test`                          | Testes unitários, sem Supabase ou webhook.                           |
| `npm run test:integration`          | Testes com leitura do catálogo real e receptor local.                |
| `npm run test:e2e`                  | Inicia o servidor na porta 3100 e testa no Chrome.                   |
| `npm run test:e2e:ui`               | Abre a interface do Playwright.                                      |
| `npm run test:all`                  | Testes unitários, integração e navegador.                            |
| `npm run env:check`                 | Valida a configuração sem exibir segredos.                           |
| `npm run env:check -- --production` | Também exige o webhook para pedidos reais.                           |

Os testes de integração e navegador precisam do `.env` com acesso ao catálogo.
Os pedidos de teste vão para um receptor local ou são interceptados; não
acionam o SDR real. O Playwright utiliza Chrome instalado. Para outro navegador
Chromium compatível, configure `PLAYWRIGHT_CHANNEL`. Para um servidor de teste
já ativo, configure `PLAYWRIGHT_BASE_URL` com uma URL local; o Playwright deixa
de iniciar outro servidor. Capturas ficam em `tmp/qa/`, traces e falhas em
`test-results/`.

## Atualizar o catálogo

Os arquivos em `src/features/catalog/data/` preservam categorias, nomes, ordem
e vínculos do PDF. Os valores exibidos são consultados novamente ao finalizar
o pedido. O servidor rejeita um envio cujo total tenha mudado.

Na conferência inicial, os 233 preços coincidiram com o PDF. O item adicional
`PINGO D'OURO BACON` do banco não aparece na referência e permanece fora do menu.
Os [scripts do catálogo](scripts/catalog/README.md) reproduzem a extração e
os vínculos sem alterar o Supabase.

## Publicar a aplicação

Use uma hospedagem com runtime Node.js para Next.js. Configure as variáveis
na hospedagem e execute `npm ci`, `npm run build` e `npm start`. O catálogo
e o endpoint de pedidos precisam do servidor; exportação estática não atende
esse fluxo.

Antes de receber pedidos, execute `npm run env:check -- --production` e
valide a persistência e a deduplicação no receptor SDR. As credenciais Git
e o `.env` local não são enviados ao GitHub.

## Referências de design

As skills [Taste](.agents/skills/design-taste-frontend/SKILL.md) e
[Impeccable](.agents/skills/impeccable/SKILL.md) estão instaladas no projeto.
As [versões e commits](docs/design-skills.json) registram sua origem.
O [relatório visual](docs/design-refinement.md) documenta as verificações e
limitações, com [prévia desktop](docs/qa/cardapio-desktop.png) e
[prévia mobile](docs/qa/cardapio-mobile.png).
