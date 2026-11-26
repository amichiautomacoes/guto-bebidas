"""Render source PDF pages and extract their text for local inspection."""
import argparse
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source", type=Path,
        default=ROOT / "docs/reference/cardapio-guto-bebidas.pdf",
    )
    parser.add_argument("--output", type=Path, default=ROOT / "tmp/pdfs")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with pymupdf.open(args.source) as document:
        for number, page in enumerate(document, 1):
            page.get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2)).save(
                args.output / f"page-{number}.png"
            )
            (args.output / f"page-{number}.txt").write_text(
                page.get_text(sort=True), encoding="utf-8"
            )
        print(f"{len(document)} páginas renderizadas em {args.output}.")


if __name__ == "__main__":
    main()
