GATE: FAIL 37 (round 1 of 3)

# Revisão final do cardápio

Status: Accepted para a revisão visual e a compilação local; ativação do
atendimento depende do webhook. Data: 26/11/2026. Versão: 1.0.0.

A linha acima é o resultado original do preset de landing pages da Taste.
Ela não representa aprovação desse preset. Quatro apontamentos de busca e
foco foram corrigidos depois dessa rodada e verificados no navegador. Os
demais foram avaliados à luz do pedido de preservar o PDF e o fluxo de compra.

## As duas skills estão instaladas neste projeto

Taste 2.5.1 e Impeccable 4.11.1 vieram dos repositórios oficiais, com commits
fixados em [design-skills.json](design-skills.json). Os arquivos ficam em
[.agents/skills](../.agents/skills). As licenças originais estão em
[licenses](licenses). As ferramentas das skills não foram modificadas.

O escopo é um aplicativo de pedidos. O PDF existente determina preto,
amarelo, Bebas Neue, logotipo, imagens, categorias e nomes dos produtos.
O refinamento conserva esses elementos e usa os IDs originais de
`guto-bebidas.sdr-guto-bebidas`. As regras do projeto estão em
[AGENTS.md](../AGENTS.md).

Voz: português brasileiro do cardápio, rótulos diretos de compra e descrições
originais. Nenhum preço, contato, horário, depoimento ou produto foi inventado.
Todas as imagens vêm do PDF; não há imagens provisórias para substituir.

## O refinamento cobre o caminho completo do pedido

Os nomes dos produtos usam 16 px, os controles de quantidade têm alvos de
44 × 44 px e as linhas se reorganizam no celular para acomodar nomes longos.
A numeração das categorias usa contraste calculado sobre cada cor original.

A busca ganhou rótulo visível e foco explícito. O atalho de teclado leva aos
produtos; o contato por ícone no celular tem nome acessível. As transições
respeitam a preferência de movimento reduzido.

A revisão de pedido usa o espaço da tela no celular. O cabeçalho e as ações
permanecem acessíveis durante a rolagem. A validação compartilha o schema do
servidor, mostra as mensagens junto aos campos e foca o primeiro erro.
Uma falha de envio conserva os itens e os dados preenchidos. Remover o último
item apresenta um estado vazio com retorno à seleção.

## Os testes funcionais e a compilação passaram

| Verificação                                   | Resultado                          |
| --------------------------------------------- | ---------------------------------- |
| Build de produção e TypeScript                | Aprovados                          |
| Testes de validação, catálogo e webhook local | 3 de 3 aprovados                   |
| Testes no navegador                           | 2 de 2 aprovados                   |
| Larguras verificadas                          | 1440, 1024, 820, 768, 390 e 320 px |
| Teclado, foco, toque e movimento reduzido     | Aprovados nos cenários cobertos    |
| Detector estático Impeccable                  | 0 apontamentos                     |
| Desempenho Taste sobre o build de produção    | 0 falhas e 4 avisos                |

Os cenários são verificáveis em [orders.test.ts](../tests/integration/orders.test.ts),
[menu.spec.ts](../tests/e2e/menu.spec.ts) e
[refinement.spec.ts](../tests/e2e/refinement.spec.ts). Os pedidos de teste
foram interceptados ou recebidos por um servidor local simulado. A consulta
ao catálogo foi somente leitura; nenhum pedido real foi enviado ao SDR.

Ambiente: Windows, Node.js 22.14, Next.js 16.4.6 e Chrome headless.
As prévias finais vieram do build de produção iniciado localmente.

## O desempenho local passou com avisos registrados

Em três carregamentos por tamanho, o LCP mediano medido foi 620 ms em 1440 px
e 484 ms em 390 px. O deslocamento de layout foi 0,006 e 0,000,
respectivamente. São medições locais em Chrome com CPU, não dados de uso real.

Os quatro avisos correspondem a dois tipos, repetidos nos dois tamanhos:
JavaScript interpretado de 571,9 KiB, com 172,3 KiB comprimidos, e o PNG
original do logotipo em resolução superior à exibida. A transferência de
imagens ficou em 435,4 KiB. Não houve falhas de requisição ou de layout
horizontal. Os resultados completos estão em
[design-review.json](qa/design-review.json).

## As regras de landing pages não substituem o cardápio

O gate da Taste espera um hero de uma tela, seções com altura de uma ou duas
telas, fotografias dominantes e cenas decorativas. Também restringe telefones
reais e compara nomes de subcategorias com um vocabulário de marketing.
Esses critérios não se aplicam integralmente ao fluxo de seleção com o PDF
como referência. O catálogo, a paleta, o telefone e as subcategorias foram
preservados conforme a solicitação.

Não foram criadas exceções para fabricar um resultado PASS. O gate completo
não foi repetido depois dos ajustes; o rótulo e os focos corrigidos foram
checados pela regressão de navegador. O histórico abaixo mantém cada um dos
37 apontamentos originais para revisão.

## O envio real ainda exige configuração

Preencha `SDR_WEBHOOK_URL` e, se o receptor exigir, `SDR_WEBHOOK_SECRET` no
`.env` da hospedagem. Valide a persistência e a deduplicação no receptor,
conforme [integração SDR](integracao-sdr.md), antes de receber pedidos reais.
Sem essa configuração, o carrinho permanece disponível e o envio informa
indisponibilidade.

A revisão cobriu Chrome com larguras emuladas. Safari, Firefox, aparelhos
físicos e a integração com o receptor real não foram validados nesta etapa.

## Evidências visuais e histórico do gate

- [Computador, 1440 × 900](qa/cardapio-desktop.png)
- [Celular, 390 × 844](qa/cardapio-mobile.png)
- [Validação de campo e ação fixa](qa/validacao-pedido.png)

| Apontamento original | Local                                                                                                            | Tratamento nesta revisão                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `hero-fill`          | main.site-main > div.menu-layout > aside.categories-panel "Explore o cardápio 9 categorias 01 Cerve"             | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `flush`              | main.site-main > div.menu-layout > aside.categories-panel > div.panel-label "Explore o cardápio 9 categorias"    | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `flush`              | section#produtos > div.menu-tools > label.search                                                                 | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `no-visual`          | section#produtos "CERVEJAS"                                                                                      | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `cta`                | main.site-main > section.intro                                                                                   | A compra começa na seleção; o carrinho vazio não pode concluir.          |
| `cta`                | main.site-main > div.menu-layout > aside.order-panel "Seu pedido"                                                | A compra começa na seleção; o carrinho vazio não pode concluir.          |
| `copy-headings`      | section#produtos > div.product-groups > section.product-group:nth-of-type(2) > h3 "LATA"                         | Preservado: nomes das subcategorias em português do PDF.                 |
| `phone-number`       | main.site-main > div.store-contact "(31) 99504-0101"                                                             | Preservado: contato real fornecido no PDF.                               |
| `phone-number`       | header.site-header > div.header-inner > a.whatsapp-link "https://wa.me/5531995040101"                            | Preservado: contato real fornecido no PDF.                               |
| `field-label`        | section#produtos > div.menu-tools:nth-of-type(1) > label.search > input                                          | Corrigido: rótulo explícito, foco visível e teste por teclado.           |
| `focus-ring`         | .products-panel:focus                                                                                            | Corrigido: rótulo explícito, foco visível e teste por teclado.           |
| `focus-ring`         | .search input:focus-visible                                                                                      | Corrigido: rótulo explícito, foco visível e teste por teclado.           |
| `focus-visible`      | section#produtos > div.menu-tools:nth-of-type(1) > label.search > input "Buscar produtos em todas as categorias" | Corrigido: rótulo explícito, foco visível e teste por teclado.           |
| `moment-none`        | (the page)                                                                                                       | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `hero-screen`        | main.site-main > section.intro "CardápioGuto Bebidas 01 · Delivery em Be"                                        | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `hero-screen`        | main.site-main > div.menu-layout "Explore o cardápio9 categorias01Cervejas"                                      | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `section-height`     | main.site-main > div.store-contact "Peça no WhatsApp (31) 99504-0101"                                            | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `section-height`     | footer.site-footer "BEBA COM MODERAÇÃOVENDA PROIBIDA PARA ME"                                                    | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `section-height`     | main.site-main > div.menu-layout "Explore o cardápio9 categorias01Cervejas"                                      | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `section-air`        | main.site-main > div.menu-layout / main.site-main > div.store-contact                                            | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `one-section`        | main.site-main > section.intro > div.intro-copy > h1 "Cardápio"                                                  | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `one-section`        | footer.site-footer "BEBA COM MODERAÇÃOVENDA PROIBIDA PARA ME"                                                    | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `one-section`        | main.site-main > div.menu-layout "Explore o cardápio9 categorias01Cervejas"                                      | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `one-section`        | main.site-main > div.store-contact "Peça no WhatsApp (31) 99504-0101"                                            | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `one-heading`        | div.menu-layout > aside.order-panel > div.order-title > h2 "Seu pedido"                                          | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `container-edges`    | main.site-main > div.store-contact "Peça no WhatsApp (31) 99504-0101"                                            | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `container-edges`    | header.site-header "GUTO BEBIDAS 01Ouro Preto · Belo Horizon"                                                    | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `container-edges`    | a.skip-link "Ir para os produtos"                                                                                | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `container-edges`    | footer.site-footer > strong "BEBA COM MODERAÇÃO"                                                                 | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `container-edges`    | footer.site-footer > span "VENDA PROIBIDA PARA MENORES DE 18 ANOS"                                               | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `container-edges`    | section#produtos > div.menu-tools > label.search                                                                 | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `hero-fill`          | section#produtos "CERVEJAS"                                                                                      | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `flush`              | section#produtos > p.price-note "Preços do cardápio de 25/11/2026, sujeit"                                       | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `no-visual`          | main.site-main > section.intro "CARDÁPIO"                                                                        | Preset de landing page; mantido o layout transacional definido pelo PDF. |
| `off-grid`           | section.product-group:nth-of-type(1) > ul > li.product-row:nth-of-type(1) > span.product-price "R$ 8,50"         | Prefixo monetário e valor formam um preço; a leitura foi conferida.      |
| `centre-axis`        | main.site-main > div.store-contact > span "Peça no WhatsApp (31) 99504-0101"                                     | O grupo ícone + contato está centralizado; a regra mede o texto isolado. |
| `container`          | page                                                                                                             | Preset de landing page; mantido o layout transacional definido pelo PDF. |
