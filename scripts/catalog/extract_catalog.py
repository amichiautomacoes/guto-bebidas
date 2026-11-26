"""Rebuild the exact catalog and original visual assets from the source PDF."""
from pathlib import Path
import argparse
import json
import re
import uuid
import pymupdf

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--source', type=Path,
        default=ROOT / 'docs/reference/cardapio-guto-bebidas.pdf',
    )
    parser.add_argument('--output-root', type=Path, default=ROOT)
    args = parser.parse_args()
    doc = pymupdf.open(args.source)
    assets = args.output_root / 'public/images'
    assets.mkdir(parents=True, exist_ok=True)
    (args.output_root / 'public/fonts').mkdir(parents=True, exist_ok=True)
    (args.output_root / 'src/features/catalog/data').mkdir(parents=True, exist_ok=True)
    definitions = [
        ('cervejas', 'Cervejas', 'Long neck, lata e garrafa. Trincando de gelada.', 27, 2, 3, '#d99a11', 64),
        ('destilados', 'Destilados', 'Pro drink, pra dose e pro gin tônica.', 46, 4, 7, '#b95520', 76),
        ('vinhos-e-espumantes', 'Vinhos e espumantes', 'Tinto, branco, rosé e espumante pra brindar.', 25, 8, 9, '#9c3154', 94),
        ('bebidas-nao-alcoolicas', 'Bebidas não alcoólicas', 'Água, refrigerante, suco e energético, tudo gelado.', 22, 10, 11, '#315bbb', 106),
        ('drinks-e-bebidas-prontas', 'Drinks e bebidas prontas', 'Abriu, tá pronto. Bebidas prontas, copões e doses.', 24, 12, 13, '#7142a4', 118),
        ('combos', 'Combos', 'Bebida que combina, num preço só.', 26, 14, 15, '#2d7c55', 129),
        ('petiscos-e-conveniencia', 'Petiscos e conveniência', 'O que acompanha a bebida: salgadinho e doce.', 46, 16, 18, '#c45e24', 140),
        ('gelos-e-acessorios', 'Gelos e acessórios', 'Gelo e o que faltar pro rolê.', 7, 19, 19, '#3995af', 154),
        ('tabacaria', 'Tabacaria', 'Produtos e acessórios de tabacaria.', 10, 20, 20, '#765a45', 162),
    ]
    groups = {'Long neck', 'Lata', 'Garrafa', 'Cervejas artesanais', 'Gin', 'Vodka', 'Whisky', 'Rum', 'Licor', 'Vinhos', 'Espumantes', 'Águas', 'Refrigerantes', 'Sucos', 'Energéticos', 'Cerveja sem álcool', 'Bebidas prontas', 'Copões', 'Doses', 'Salgadinhos', 'Doces', 'Gelos', 'Acessórios gerais'}

    def extract_image(xref, filename):
        pix = pymupdf.Pixmap(doc, xref)
        item = next(image for page in doc for image in page.get_images() if image[0] == xref)
        if item[1]:
            pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, item[1]))
        pix.save(assets / filename)

    extract_image(6, 'logo-guto.png')
    font = doc.extract_font(9)
    (args.output_root / 'public/fonts/bebas-neue.ttf').write_bytes(font[3])
    categories, products = [], []
    for position, (slug, name, description, expected, start, end, color, xref) in enumerate(definitions, 1):
        extract_image(xref, f'{slug}.png')
        categories.append(dict(id=slug, name=name, description=description, position=position, color=color, image=f'/images/{slug}.png', expected_count=expected))
        group = ''
        category_products = []
        for page_number in range(start, end + 1):
            blocks = [b for b in doc[page_number-1].get_text('blocks') if b[6] == 0 and b[1] > (139 if page_number == start else 40) and b[3] < 490]
            for block in sorted(blocks, key=lambda b: b[1]):
                content = block[4].strip()
                if content in groups:
                    group = content
                match = re.search(r'R\$\s*([\d.]+,\d{2})', content)
                if not match:
                    continue
                product_name = content[:match.start()].strip()
                if not product_name:
                    candidates = [b for b in blocks if b[0] < 30 and 'R$' not in b[4] and abs(b[1] - block[1]) < 11]
                    assert len(candidates) == 1, (page_number, content, candidates)
                    product_name = candidates[0][4].strip()
                product_name = re.sub(r'\s+', ' ', product_name)
                price = int(match[1].replace('.', '').replace(',', ''))
                number = len(products) + len(category_products) + 1
                category_products.append(dict(id=str(uuid.uuid5(uuid.NAMESPACE_URL, f'guto-bebidas/{slug}/{product_name}')), category_id=slug, name=product_name, subcategory=group, price_cents=price, position=number, source_page=page_number, active=True))
        assert len(category_products) == expected, (slug, len(category_products), expected)
        products.extend(category_products)
    result = dict(source='docs/reference/cardapio-guto-bebidas.pdf', price_date='2026-11-25', categories=categories, products=products)
    (args.output_root / 'src/features/catalog/data/catalog.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'categories':len(categories),'products':len(products),'by_category':{c['name']:sum(p['category_id']==c['id'] for p in products) for c in categories}},ensure_ascii=True))

    doc.close()


if __name__ == '__main__':
    main()
