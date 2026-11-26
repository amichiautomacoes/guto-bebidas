<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Refinamento visual deste projeto

Use as skills locais `.agents/skills/design-taste-frontend/SKILL.md` e
`.agents/skills/impeccable/SKILL.md` para revisar e refinar a interface.

Este projeto é um aplicativo de pedidos. O PDF em `docs/reference/` e os assets extraídos
dele são a referência visual: preto, amarelo, Bebas Neue, logotipo e imagens
das categorias. Preserve o catálogo, os contatos reais e o fluxo de pedido.
Receitas de landing pages das skills, como hero de uma tela inteira, sorteio
de paleta, cenas decorativas, contatos fictícios e exportação estática, não
se aplicam a esta interface transacional com backend Next.js.

O catálogo consulta exclusivamente `"guto-bebidas"."sdr-guto-bebidas"` e
envia o `product_id` numérico original ao SDR. Não crie outro catálogo nem
altere o Supabase durante um refinamento visual. Os testes de pedidos usam
um receptor local ou interceptam `/api/orders`, sem acionar o SDR real.
