# Pakt het dashboard (ui/dashboard.html) in voor de firmware: gzip en dan een C-array in src/dashboard.h.
#
# Gebruik:
#   python ui/maak-header.py           (met de hand, vanuit de map firmware)
#   python -m platformio run -e doos   (gebeurt dan vanzelf: platformio.ini, extra_scripts = pre:ui/maak-header.py)
# Het bestand wordt alleen herschreven als de inhoud verandert (anders bouwt PlatformIO alles opnieuw).
# gzip zonder tijdstempel (mtime=0): dezelfde html geeft altijd dezelfde header.
import gzip
import os

try:
    Import("env")  # noqa: F821  (bestaat alleen als PlatformIO dit script uitvoert)
    BASIS = env.subst("$PROJECT_DIR")  # noqa: F821
except NameError:
    BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BRON = os.path.join(BASIS, "ui", "dashboard.html")
DOEL = os.path.join(BASIS, "src", "dashboard.h")


def maak():
    with open(BRON, "rb") as f:
        html = f.read()
    gz = gzip.compress(html, compresslevel=9, mtime=0)
    regels = []
    for i in range(0, len(gz), 20):
        regels.append("  " + ",".join(str(b) for b in gz[i:i + 20]) + ",")
    tekst = (
        "// GEMAAKT door ui/maak-header.py uit ui/dashboard.html: niet met de hand aanpassen.\n"
        f"// {len(html)} bytes html, {len(gz)} bytes gzip\n"
        "#pragma once\n"
        "#include <Arduino.h>\n\n"
        f"const size_t DASHBOARD_GZ_LEN = {len(gz)};\n"
        "const uint8_t DASHBOARD_GZ[] PROGMEM = {\n" + "\n".join(regels) + "\n};\n"
    )
    oud = None
    if os.path.exists(DOEL):
        with open(DOEL, "r", encoding="utf-8") as f:
            oud = f.read()
    if oud != tekst:
        with open(DOEL, "w", encoding="utf-8", newline="\n") as f:
            f.write(tekst)
        print(f"src/dashboard.h gemaakt: {len(html)} bytes html -> {len(gz)} bytes gzip")
    else:
        print("src/dashboard.h is al bij")


maak()
