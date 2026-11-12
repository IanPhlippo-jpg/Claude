// Kleine proef op de pc (env native):  python -m platformio run -e native  en dan  .pio/build/native/program.exe
// Laat de logica van de doos 35 s lopen zonder hardware: de functie "Overweg" (groepen 3 en 4 om beurten, na 30 s
// uit) en een drukknop op ingang 1, en toont elke 5 s de uitgangen en daarna wat het dashboard te zien krijgt.
#include <stdio.h>

#include "api.h"

using namespace trein;

int main() {
  static Baan baan; // 15 kB: niet op de stapel
  baan.cfg.ingang[0].gedrag = GEDRAG_DRUKKNOP;
  baan.cfg.ingang[0].functieA = 0; // "Overweg"
  baan.toepassen(0);
  for (uint32_t t = 0; t <= 35000; t += 10) {
    uint16_t knop = (t >= 1000 && t < 1200) ? 0x0001 : 0; // ingang 1 even ingedrukt
    baan.tick(t, knop);
    if (t % 5000 == 0) {
      printf("t = %2u s  overweg %s  uitgangen:", (unsigned)(t / 1000), baan.seq.loopt(0) ? "loopt" : "stil ");
      for (int g = 0; g < N_GROEPEN; g++) printf(" %4u", baan.lampen.uitgang[g]);
      printf("\n");
    }
  }
  printf("\nGET /api/staat?kort=1:\n%s\n", apiStaat(baan, 35000, true).c_str());
  return 0;
}
