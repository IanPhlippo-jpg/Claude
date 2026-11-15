# Maakt ui/tv.html (de /tv-pagina van de doos) uit de tv-pagina van het situatieplan plus de live-koppeling.
#
#   ../situatieplan/tv.html   tekenen, simulatie, zetMelding/zetWissel/zetLicht (bron, niet aanpassen hier)
#   ui/tv-live.js              live-koppeling aan de doos (/api/meldingen, /api/staat?kort=1, /api/plan)
#
# Gebruik (vanuit de map firmware):  python ui/maak-tv.py
# Daarna pakt ui/maak-header.py ui/tv.html in als src/tv.h (TV_GZ). De doos serveert de pagina op /tv/ (en /tv stuurt
# door naar /tv/), zodat plan.json en achtergrond.jpg relatief van /tv/ komen.
import os

UI = os.path.dirname(os.path.abspath(__file__))
BRON = os.path.normpath(os.path.join(UI, "..", "..", "situatieplan", "tv.html"))
LIVE = os.path.join(UI, "tv-live.js")
DOEL = os.path.join(UI, "tv.html")

DOORSTUREN = "<script>if (location.pathname === '/tv') location.replace('/tv/' + location.search + location.hash);</script>\n"


def maak():
    with open(BRON, encoding="utf-8") as f:
        html = f.read()
    with open(LIVE, encoding="utf-8") as f:
        live = f.read()
    assert html.count("</body>") == 1 and html.count("<head>") == 1, "situatieplan/tv.html heeft een onverwachte vorm"
    kop = "<!-- GEMAAKT door firmware/ui/maak-tv.py uit situatieplan/tv.html + firmware/ui/tv-live.js: niet met de hand aanpassen. -->\n"
    html = html.replace("<head>", "<head>\n" + DOORSTUREN, 1)
    html = html.replace("</body>", "<script>\n" + live + "</script>\n</body>", 1)
    html = html.replace("<html", kop + "<html", 1)
    oud = None
    if os.path.exists(DOEL):
        with open(DOEL, encoding="utf-8") as f:
            oud = f.read()
    if oud != html:
        with open(DOEL, "w", encoding="utf-8", newline="\n") as f:
            f.write(html)
        print(f"ui/tv.html gemaakt: {len(html)} bytes")
    else:
        print("ui/tv.html is al bij")


maak()
