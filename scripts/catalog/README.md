# Manutenção do catálogo

Os scripts atualizam arquivos locais. O Supabase é consultado apenas para
relacionar produtos do PDF a IDs já existentes no SDR.

## Preparar a extração do PDF

Use Python 3.10 ou superior. A aplicação Next.js não depende de Python.
Instale a dependência em um ambiente virtual; no PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r scripts/catalog/requirements.txt
```

Em Linux/macOS, ative com `source .venv/bin/activate`.

| Comando na raiz           | Efeito                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| `npm run catalog:render`  | Salva imagens e texto das 20 páginas em `tmp/pdfs/`.                          |
| `npm run catalog:extract` | Recria `catalog.json`, imagens de categorias, logo e fonte.                   |
| `npm run catalog:link`    | Consulta a tabela SDR em transação de leitura e recria `database-links.json`. |

Os scripts Python localizam a raiz a partir do próprio arquivo. Use `--help`
para opções de entrada e saída. Para conferir a extração sem substituir os
arquivos do aplicativo:

```sh
npm run catalog:extract -- --output-root tmp/catalog-preview
```

A extração foi escrita para o layout do PDF em `docs/reference/`: páginas,
coordenadas e imagens incorporadas são específicos dessa referência. Um PDF
com layout diferente exige revisar o extrator e conferir os produtos.

`catalog:link` usa as dependências Node.js do projeto e o `.env`. O arquivo
de vínculos só é substituído quando cada produto possui uma correspondência
única e os IDs não se repetem. Após atualizar, execute `npm run format`,
`npm run check` e `npm run test:integration`, e revise o diff antes do commit.
