#!/usr/bin/env python3
"""Build per-language landing pages, share cards (og images) and sitemap.

index.html is the template (English). Everything between <!--SEO--> and <!--/SEO-->
is regenerated for each language, and copies are written to /fr/, /de/, /it/, /es/, /zh/.
Run from the repo root after editing index.html:  python3 tools/build_pages.py
"""
import json, os, re, datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SITE = "https://cloudsanctuary.app"
LANGS = ["en", "fr", "de", "it", "es", "zh"]
LOCALE = {"en": "en_US", "fr": "fr_FR", "de": "de_DE", "it": "it_IT", "es": "es_ES", "zh": "zh_CN"}
HTML_LANG = {"en": "en", "fr": "fr", "de": "de", "it": "it", "es": "es", "zh": "zh-CN"}

T = {
 "en": dict(title="Sanctuary · An online church, open day and night",
            desc="Step into a quiet virtual church any time: pray in silence, light a candle for someone, make a private guided confession, or pray together with people around the world. Free to enter.",
            og="Sanctuary — a church that is always open",
            ogd="Pray quietly, light a candle for someone, or pray together with others. Free to enter, day or night.",
            card1="A church that is always open", card2="Pray · Light a candle · Pray together"),
 "fr": dict(title="Sanctuary · Une église en ligne, ouverte jour et nuit",
            desc="Entrez à tout moment dans une église virtuelle paisible : priez en silence, allumez un cierge pour quelqu’un, confessez-vous en privé ou priez avec des personnes du monde entier. Entrée libre.",
            og="Sanctuary — une église toujours ouverte",
            ogd="Priez en silence, allumez un cierge pour quelqu’un ou priez avec d’autres. Entrée libre, jour et nuit.",
            card1="Une église toujours ouverte", card2="Prier · Allumer un cierge · Prier ensemble"),
 "de": dict(title="Sanctuary · Eine Online-Kirche, Tag und Nacht geöffnet",
            desc="Betreten Sie jederzeit eine stille virtuelle Kirche: beten Sie in der Stille, zünden Sie eine Kerze für jemanden an, beichten Sie privat oder beten Sie gemeinsam mit Menschen weltweit. Eintritt frei.",
            og="Sanctuary – eine Kirche, die immer offen ist",
            ogd="Still beten, eine Kerze für jemanden anzünden oder gemeinsam beten. Eintritt frei, Tag und Nacht.",
            card1="Eine Kirche, die immer offen ist", card2="Beten · Kerze anzünden · Gemeinsam beten"),
 "it": dict(title="Sanctuary · Una chiesa online, aperta giorno e notte",
            desc="Entra in qualsiasi momento in una chiesa virtuale silenziosa: prega in silenzio, accendi una candela per qualcuno, confessati in privato o prega insieme a persone di tutto il mondo. Ingresso libero.",
            og="Sanctuary — una chiesa sempre aperta",
            ogd="Prega in silenzio, accendi una candela per qualcuno o prega insieme ad altri. Ingresso libero, giorno e notte.",
            card1="Una chiesa sempre aperta", card2="Pregare · Accendere una candela · Pregare insieme"),
 "es": dict(title="Sanctuary · Una iglesia en línea, abierta día y noche",
            desc="Entra cuando quieras en una iglesia virtual tranquila: ora en silencio, enciende una vela por alguien, confiésate en privado u ora junto a personas de todo el mundo. Entrada libre.",
            og="Sanctuary — una iglesia siempre abierta",
            ogd="Ora en silencio, enciende una vela por alguien u ora junto a otros. Entrada libre, de día y de noche.",
            card1="Una iglesia siempre abierta", card2="Orar · Encender una vela · Orar juntos"),
 "zh": dict(title="云上圣所 · 一座日夜开放的线上教堂",
            desc="随时走进一座安静的线上教堂：安静祷告、为人点一支蜡烛、私密引导式忏悔，或和世界各地的人一起祷告。免费进入。",
            og="云上圣所——一座永远开着门的教堂",
            ogd="安静祷告、为人点一支蜡烛，或和许多人一起祷告。免费进入，日夜开放。",
            card1="一座永远开着门的教堂", card2="祷告 · 点蜡烛 · 一起祷告"),
}

def url(l):
    return SITE + "/" if l == "en" else f"{SITE}/{l}/"

def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")

def seo_block(l):
    t = T[l]
    alt = "\n".join(f'<link rel="alternate" hreflang="{HTML_LANG[x]}" href="{url(x)}">' for x in LANGS)
    alt += f'\n<link rel="alternate" hreflang="x-default" href="{url("en")}">'
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebSite", "@id": SITE + "/#site", "url": url(l), "name": "Sanctuary", "inLanguage": HTML_LANG[l],
             "description": t["desc"], "publisher": {"@id": SITE + "/#org"}},
            {"@type": "Organization", "@id": SITE + "/#org", "name": "Fidova Technology", "url": SITE + "/",
             "email": "fidovatech@gmail.com", "logo": SITE + "/icon-512.png"},
            {"@type": "WebApplication", "name": "Sanctuary", "url": url(l), "applicationCategory": "LifestyleApplication",
             "operatingSystem": "Any (web browser)", "inLanguage": HTML_LANG[l], "isAccessibleForFree": True,
             "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"}, "publisher": {"@id": SITE + "/#org"}},
        ],
    }
    return f"""<!--SEO-->
<title>{esc(t["title"])}</title>
<meta name="description" content="{esc(t["desc"])}">
<link rel="canonical" href="{url(l)}">
{alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sanctuary">
<meta property="og:url" content="{url(l)}">
<meta property="og:title" content="{esc(t["og"])}">
<meta property="og:description" content="{esc(t["ogd"])}">
<meta property="og:image" content="{SITE}/og/og-{l}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="{LOCALE[l]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(t["og"])}">
<meta name="twitter:description" content="{esc(t["ogd"])}">
<meta name="twitter:image" content="{SITE}/og/og-{l}.png">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<!--/SEO-->"""

# ---------- share cards ----------
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SERIF_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
CJK = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
CJK_R = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"

def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(SERIF, size)

def card(l, out):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), (11, 8, 6))
    # warm glow behind the candles
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    for r, c in [(330, (70, 42, 16)), (220, (120, 74, 26)), (120, (190, 120, 40))]:
        g.ellipse([W - 300 - r, 360 - r, W - 300 + r, 360 + r], fill=c)
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    img = Image.blend(img, glow, 0.85)
    d = ImageDraw.Draw(img)
    gold, gold2, dim = (217, 178, 106), (240, 212, 154), (191, 174, 147)
    # gothic window outline
    cx = W - 300
    d.line([(cx - 120, 560), (cx - 120, 250)], fill=(90, 66, 36), width=4)
    d.line([(cx + 120, 560), (cx + 120, 250)], fill=(90, 66, 36), width=4)
    d.arc([cx - 120, 130, cx + 120, 370], 180, 360, fill=(90, 66, 36), width=4)
    # cross
    d.rectangle([cx - 5, 170, cx + 5, 290], fill=gold)
    d.rectangle([cx - 40, 205, cx + 40, 215], fill=gold)
    # candles
    for i, x in enumerate([cx - 80, cx - 25, cx + 30, cx + 85]):
        h = [110, 150, 130, 95][i]
        top = 560 - h
        d.rectangle([x - 12, top, x + 12, 560], fill=(236, 226, 205))
        d.ellipse([x - 9, top - 34, x + 9, top - 2], fill=(255, 196, 92))
        d.ellipse([x - 4, top - 22, x + 4, top - 6], fill=(255, 240, 200))
    d.rectangle([cx - 130, 560, cx + 130, 572], fill=(70, 50, 28))
    # text
    cjk = l == "zh"
    title = "云上圣所" if cjk else "Sanctuary"
    ft = font(CJK if cjk else SERIF_B, 96 if cjk else 104)
    d.text((80, 170), title, font=ft, fill=gold2)
    f1 = font(CJK if cjk else SERIF, 44 if cjk else 42)
    f2 = font(CJK_R if cjk else SERIF, 30)
    size = 44 if cjk else 42
    while d.textlength(T[l]["card1"], font=f1) > 640 and size > 30:
        size -= 2
        f1 = font(CJK if cjk else SERIF, size)
    d.text((82, 318), T[l]["card1"], font=f1, fill=(244, 234, 216))
    line = T[l]["card2"]
    if d.textlength(line, font=f2) <= 640:
        d.text((84, 392), line, font=f2, fill=dim)
    else:  # too wide for the space left of the window: break after the first item
        first, rest = line.split(" · ", 1)
        d.text((84, 392), first + " ·", font=f2, fill=dim)
        d.text((84, 436), rest, font=f2, fill=dim)
    d.line([(84, 300), (300, 300)], fill=gold, width=2)
    d.text((84, 540), "cloudsanctuary.app", font=font(SERIF, 28), fill=gold)
    img.save(out, optimize=True)

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    src = open("index.html", encoding="utf-8").read()
    if "<!--SEO-->" not in src:
        raise SystemExit("index.html has no <!--SEO--> block")
    os.makedirs("og", exist_ok=True)
    for l in LANGS:
        page = re.sub(r"<!--SEO-->.*?<!--/SEO-->", lambda m: seo_block(l), src, flags=re.S)
        page = re.sub(r'<html lang="[^"]*">', f'<html lang="{HTML_LANG[l]}">', page, count=1)
        if l == "en":
            open("index.html", "w", encoding="utf-8").write(page)
        else:
            os.makedirs(l, exist_ok=True)
            open(f"{l}/index.html", "w", encoding="utf-8").write(page)
        card(l, f"og/og-{l}.png")
    today = datetime.date.today().isoformat()
    alts = "".join(f'<xhtml:link rel="alternate" hreflang="{HTML_LANG[x]}" href="{url(x)}"/>' for x in LANGS)
    alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{url("en")}"/>'
    urls = "".join(f"<url><loc>{url(l)}</loc><lastmod>{today}</lastmod>{alts}</url>\n" for l in LANGS)
    urls += f"<url><loc>{SITE}/privacy.html</loc><lastmod>{today}</lastmod></url>\n"
    open("sitemap.xml", "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls + "</urlset>\n")
    print("built", ", ".join(LANGS))

if __name__ == "__main__":
    main()
