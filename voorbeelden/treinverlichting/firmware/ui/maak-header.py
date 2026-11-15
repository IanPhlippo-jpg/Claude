# Pakt de pagina's in voor de firmware: gzip en dan een C-array in een header.
#   ui/dashboard.html -> src/dashboard.h  (DASHBOARD_GZ, DASHBOARD_GZ_LEN)
#   ui/tv.html        -> src/tv.h         (TV_GZ, TV_GZ_LEN; bestaat ui/tv.html niet, dan TV_GZ_LEN = 0 en serveert de doos
#                                          /tv uit LittleFS /tv/tv.html als die er is)
#
# Gebruik:
#   python ui/maak-header.py           (met de hand, vanuit de map firmware)
#   python -m platformio run -e doos   (gebeurt dan vanzelf: platformio.ini, extra_scripts = pre:ui/maak-header.py)
# Een header wordt alleen herschreven als de inhoud verandert (anders bouwt PlatformIO alles opnieuw).
# gzip zonder tijdstempel (mtime=0): dezelfde html geeft altijd dezelfde header.
import gzip
import os

try:
    Import("env")  # noqa: F821  (bestaat alleen als PlatformIO dit script uitvoert)
    BASIS = env.subst("$PROJECT_DIR")  # noqa: F821
except NameError:
    BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAGINAS = [
    # (bron, doel, naam van de array, verplicht)
    ("dashboard.html", "dashboard.h", "DASHBOARD_GZ", True),
    ("tv.html", "tv.h", "TV_GZ", False),
]


def schrijf(doel, tekst):
    oud = None
    if os.path.exists(doel):
        with open(doel, "r", encoding="utf-8") as f:
            oud = f.read()
    if oud == tekst:
        return False
    with open(doel, "w", encoding="utf-8", newline="\n") as f:
        f.write(tekst)
    return True


def maak_een(bron_naam, doel_naam, arr, verplicht):
    bron = os.path.join(BASIS, "ui", bron_naam)
    doel = os.path.join(BASIS, "src", doel_naam)
    if not os.path.exists(bron):
        if verplicht:
            raise FileNotFoundError(bron)
        tekst = (
            f"// GEMAAKT door ui/maak-header.py: ui/{bron_naam} bestaat (nog) niet, dus leeg.\n"
            "#pragma once\n"
            "#include <Arduino.h>\n\n"
            f"const size_t {arr}_LEN = 0;\n"
            f"const uint8_t {arr}[1] PROGMEM = {{0}};\n"
        )
        print(f"src/{doel_naam} {'gemaakt' if schrijf(doel, tekst) else 'is al bij'} (leeg: geen ui/{bron_naam})")
        return
    with open(bron, "rb") as f:
        html = f.read()
    gz = gzip.compress(html, compresslevel=9, mtime=0)
    regels = []
    for i in range(0, len(gz), 20):
        regels.append("  " + ",".join(str(b) for b in gz[i:i + 20]) + ",")
    tekst = (
        f"// GEMAAKT door ui/maak-header.py uit ui/{bron_naam}: niet met de hand aanpassen.\n"
        f"// {len(html)} bytes html, {len(gz)} bytes gzip\n"
        "#pragma once\n"
        "#include <Arduino.h>\n\n"
        f"const size_t {arr}_LEN = {len(gz)};\n"
        f"const uint8_t {arr}[] PROGMEM = {{\n" + "\n".join(regels) + "\n};\n"
    )
    if schrijf(doel, tekst):
        print(f"src/{doel_naam} gemaakt: {len(html)} bytes html -> {len(gz)} bytes gzip")
    else:
        print(f"src/{doel_naam} is al bij")


def maak():
    for p in PAGINAS:
        maak_een(*p)


maak()
