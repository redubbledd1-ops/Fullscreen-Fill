#!/usr/bin/env python3
"""Snijd het bronicoon bij en schaal het naar elke maat die de stores vragen.

    python tools/make-icons.py

Bron: store/icon-source.png (vierkant, tegel op een zwarte achtergrond).
Doel: icons/icon{16,32,48,128}.png voor de extensie zelf en
      store/icon-128.png + store/icon-512.png voor de winkelpagina's.

De bron heeft geen alfakanaal: de tegel staat op puur zwart. Zwarte hoeken
zien er in een donkere werkbalk uit als een vierkant blok, dus we knippen de
rand weg en maken er een masker bij. Het masker komt uit de afbeelding zelf
(eerste en laatste niet-zwarte pixel per rij) in plaats van uit een nagetekende
afgeronde rechthoek, zodat de echte vorm van de tegel behouden blijft.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "store", "icon-source.png")
EXT_SIZES = [16, 32, 48, 128]
STORE_SIZES = [128, 512]
# Alles onder deze waarde telt als achtergrond. De tegel zelf zit rond 12.
BLACK = 3


def trim(img):
    """Knip de zwarte rand rondom de tegel weg."""
    box = img.convert("L").point(lambda v: 255 if v > BLACK else 0).getbbox()
    if not box:
        raise SystemExit("bron is helemaal zwart")
    return img.crop(box)


def alpha_mask(img):
    """Maak een masker van de tegel.

    De tegel is bol, dus per rij is alles tussen de eerste en de laatste
    niet-zwarte pixel binnenkant — ook de donkere ruis die op zwart uitkomt.
    Een drempel zonder deze opvulling zou daar gaatjes in prikken.
    """
    grey = img.convert("L")
    width, height = grey.size
    px = grey.load()
    mask = Image.new("L", (width, height), 0)
    fill = mask.load()
    for y in range(height):
        first = last = None
        for x in range(width):
            if px[x, y] > BLACK:
                if first is None:
                    first = x
                last = x
        if first is None:
            continue
        for x in range(first, last + 1):
            fill[x, y] = 255
    return mask


def main():
    if not os.path.exists(SOURCE):
        raise SystemExit(f"bron ontbreekt: {SOURCE}")

    base = trim(Image.open(SOURCE).convert("RGB"))
    base.putalpha(alpha_mask(base))

    store = os.path.join(ROOT, "store")
    os.makedirs(store, exist_ok=True)

    for size in EXT_SIZES:
        out = os.path.join(ROOT, "icons", f"icon{size}.png")
        # Verkleinen met LANCZOS maakt meteen de randen van het masker glad.
        base.resize((size, size), Image.LANCZOS).save(out, optimize=True)
        print(os.path.relpath(out, ROOT))

    for size in STORE_SIZES:
        out = os.path.join(store, f"icon-{size}.png")
        base.resize((size, size), Image.LANCZOS).save(out, optimize=True)
        print(os.path.relpath(out, ROOT))


if __name__ == "__main__":
    main()
