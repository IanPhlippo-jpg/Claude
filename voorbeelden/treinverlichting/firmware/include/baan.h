// De hele lichtsturing samen, zonder hardware: groepen (aan/uit), effecten, dag/nacht, scènes, functies en ingangen.
// main.cpp roept elke 5 ms tick() aan met de tijd, de ingangen en hun flanken, en schrijft lampen.uitgang (een masker:
// bit g = groep g+1 brandt) naar de PCA9685.
// Het dashboard (api.h) gebruikt de bedieningsfuncties hieronder. Testen: test/test_functies, test/test_api.
//
// Afspraken:
//   - "Alles uit" stopt alle functies en de dag/nacht-cyclus en zet alle groepen uit (het effect blijft bewaard:
//     weer aanzetten geeft dezelfde lamp terug);
//   - overweg (om beurten): een groep met een tweede groep (p2) neemt die tweede groep mee: zelfde tempo, tegengesteld,
//     samen aan en uit. Een functiestap met effect overweg op meer groepen laat ze om beurten knipperen
//     (1e, 3e, ... samen; 2e, 4e, ... samen);
//   - dag/nacht: alleen op de overgangen (avond: aan, ochtend: uit) zet de cyclus een deelnemende groep; wie een
//     groep tussendoor met de hand aan- of uitzet, houdt die stand tot de volgende overgang;
//   - cfgRev telt elke wijziging van de instellingen (main.cpp bewaart dan /instellingen.json; het dashboard laadt
//     alles opnieuw), standRev elke wijziging van de stand (main.cpp bewaart /stand.json).
// Firmware 2.0.0 erbij:
//   - servo's (servo.h): main.cpp schrijft servos.tellen() elke 20 ms naar de PCA9685 op 0x42; de stand A/B komt in
//     /stand.json (na een stroomonderbreking meteen op de laatste stand, zonder beweging);
//   - IR zenden: irZenden() zet een opdracht in een rij (hoogstens 8); de lichttaak haalt ze op (haalIrZend), zet de
//     IR-leds via de MCP23017 en stuurt de pulsen met de RMT op GPIO47;
//   - IR ontvangen: main.cpp geeft elk frame van een ontvanger in ns (irFrame); leren (10 s) of herkennen, dan een
//     melding bij het punt van die ontvanger (bussen.h) en de haltes (halte.h);
//   - ingangen: 37 (1..16 GPIO, 17..23 MCP23017 0x20, 25..38 MCP23017 0x21 als die er is: ingangAanwezig); een ingang die
//     actief wordt en aan een punt hangt, geeft een melding;
//   - geluidskastjes (kastjes.h): een stap "geluid" zet een HTTP-opdracht in de rij; main.cpp stuurt ze.
// Firmware 2.1.0 erbij (Fable 5.2):
//   - ingangen: printSoort per print (E3): omkeerMasker keert de ingangen om met print "gnd" en polariteit "npn";
//     37 ingangen (E7), 17..23 voor reflexsensoren (E2);
//   - ontvangerNiveau (E2): main.cpp geeft elke 5 ms het niveau van de ontvangerpinnen 2..4: laag > 50 ms = een
//     melding "ftr" op het punt van die ontvanger (aanwezigheid), weer hoog = einde (ontvangerBezet);
//   - IR: continu-codes (F1, continuLeds), de zelftest via -B1 (E4, zelftestStart), "code te lang" bij leren (F17);
//   - servo's wachten zolang meer dan 12 lichtgroepen aan staan (E14) en gaan bij het opstarten één voor één (E8);
//     (2.2.0: de rem standaard uit en instelbaar, één tegelijk in plaats van stil; servoMaxBewegend, FN3 en EN3)
//   - haltes: meldingen van de haltes (F12) in logicaMelding().
#pragma once
#include <string>

#include "functies.h"
#include "ingangen.h"
#include "irzend.h"
#include "licht.h"
#include "opslag.h"

namespace trein {

constexpr const char *FW_VERSIE = "2.2.0";
constexpr uint32_t LEER_MS = 10000;   // zo lang wacht leren op een code
constexpr int MAX_IR_RIJ = 8;
constexpr uint32_t ZELFTEST_MS = 3000; // E4: zo lang wacht de IR-zelftest op -B1
constexpr uint16_t ZELFTEST_ADRES = 0x7E, ZELFTEST_COMMANDO = 0x5A;

/** E4: IR-zelftest: een NEC-testcode via één IR-led, -B1 (de leerontvanger) leest mee */
struct IrZelftest {
  bool loopt = false, ok = false, gedaan = false;
  // TN3 (2.2.0): -B1 is een TSMP58000 en laat alleen 20-60 kHz door. Licht ZONDER draaggolf geeft geen uitgang; dit
  // vlagje betekent alleen "een flank zonder herkenbare draaggolf" (toeval, storing), niet "de led brandt continu".
  bool ongemoduleerd = false;
  int8_t led = -1;
  uint32_t start = 0;
  int khzTiende = 0;
  char code[IR_TEKST_LEN] = {0};
  const char *fout = "";
};

/** de testcode van de zelftest (NEC, 38 kHz) */
inline IrCode zelftestCode() {
  IrCode c;
  c.gebruikt = true;
  strcpy(c.naam, "Zelftest");
  c.soort = IR_NEC;
  c.khz = 38;
  c.adres = ZELFTEST_ADRES;
  c.commando = ZELFTEST_COMMANDO;
  return c;
}

inline int telBits(uint32_t m) {
  int n = 0;
  for (; m; m &= m - 1) n++;
  return n;
}

/** leren: loopt, of het resultaat van de laatste keer */
struct Leren {
  bool loopt = false;
  int8_t ontvanger = 0;    // index 0..3
  uint32_t start = 0;
  char naam[NAAM_LEN] = {0};
  int8_t nr = -1;          // de pas geleerde code (index), -1 = geen
  const char *fout = "";   // waarom het niet lukte ("" = geen fout)
};

// Testmodus (voor de ingebruikname en het meetblad): de uitgangen worden overschreven, de rest rekent gewoon door.
//   looplicht  groep 1, 2, ... N om de beurt aan (zonder effect), elk stapMs lang
//   vast       één groep aan (stroom van die groep meten), de andere uit
// Stoppen: {"actie":"stop"} of "Alles uit". Daarna krijgen de lampen weer hun gewone stand.
enum TestSoort : uint8_t { TEST_GEEN, TEST_LOOPLICHT, TEST_VAST };
constexpr uint32_t TEST_STAP_MIN_MS = 300, TEST_STAP_MAX_MS = 5000, TEST_STAP_STD_MS = 1000;

inline const char *testId(int t) {
  static const char *T[] = {"", "looplicht", "vast"};
  return T[(t >= 0 && t <= TEST_VAST) ? t : 0];
}

class Baan : public Uitvoerder, public HalteUit {
 public:
  Config cfg;
  Lampen lampen;
  Sequencer seq;
  Ingangen ingangen;
  DagNacht dn;
  Servos servos;
  Volg volg;
  Haltes haltes;
  Kastjes kastjes;
  Leren leren;
  IngangMasker ingangRuw = 0;
  IngangMasker ingangAanwezig = INGANGEN_GPIO | INGANGEN_MCP1; // 25..38 pas als de tweede MCP23017 er is
  IrZelftest zelftest;
  NiveauWacht niveau[IR_ONTVANGERS]; // E2: lang laag op een ontvangerpin
  bool ontvangerLaag[IR_ONTVANGERS] = {false, false, false, false}; // TN3: het niveau nu (laag = licht of signaal)
  // IR zenden: main.cpp vult dit in (IrZender)
  uint32_t irNietVerzonden = 0;
  uint32_t irRijVol = 0;   // FN7: een halte kon een code niet in de rij zetten (8 vol)
  const char *irLaatsteFout = "";
  uint32_t msNu = 0;       // de tijd van de laatste tick
  uint32_t cfgRev = 1, standRev = 1;
  std::string melding; // voor het dashboard (instellingen hersteld, chip niet gevonden, ...)
  // thuis-wifi: main.cpp vult dit in (verbonden en het IP-adres dat de router gaf)
  bool thuisVerbonden = false;
  std::string thuisIp;
  // testmodus
  uint8_t testSoort = TEST_GEEN;
  int testGroep = 0;          // vast: de groep (index)
  uint32_t testStapMs = TEST_STAP_STD_MS, testStart = 0;

  explicit Baan(uint32_t zaad = 20261108u) : lampen(zaad) {
    standaard(cfg);
    dn.zaad = zaad;
    for (int g = 0; g < N_GROEPEN; g++) dnVorig_[g] = false;
    toepassen(0);
  }

  /** na het laden of wijzigen van de instellingen: de dag/nacht-duur doorgeven */
  void toepassen(uint32_t nu) {
    uint32_t duur = (uint32_t)cfg.inst.dagnachtMin * 60000u;
    if (duur != dn.duurMs) dn.zetDuur(duur, nu);
  }

  void instellingenGewijzigd(uint32_t nu) {
    toepassen(nu);
    cfgRev++;
  }

  /** de ingangen die de Baan omkeert (print "gnd" met een npn-sensor, E3) */
  IngangMasker omkeerMasker() const {
    IngangMasker m = 0;
    for (int i = 0; i < N_INGANGEN; i++)
      if (ingangOmgekeerd(cfg.inst, cfg.ingang[i], i)) m |= ingangBit(i);
    return m;
  }

  /** elke 5 ms; ruw: bit i = ingang i+1 trekt laag (actief bij npn); flanken: bit i = er was een flank op ingang i+1
   *  sinds de vorige tick (GPIO-interrupt, of INTF van de MCP23017) */
  void tick(uint32_t nu, IngangMasker ruw, IngangMasker flanken = 0) {
    msNu = nu;
    ruw = (ruw ^ omkeerMasker()) & ingangAanwezig;
    flanken &= ingangAanwezig;
    ingangRuw = ruw;
    IngangMasker voor = ingangen.actiefMasker();
    Opdracht op[N_INGANGEN];
    int n = ingangen.stap(ruw, nu, cfg.ingang, op, N_INGANGEN, flanken);
    for (int i = 0; i < n; i++) {
      int f = op[i].functie;
      if (op[i].soort == OPDR_STOP || (op[i].soort == OPDR_WISSEL && seq.loopt(f))) functieStop(f, nu);
      else functieStart(f, nu);
    }
    // meetpunten: een ingang die actief wordt (hallsensor) geeft een melding
    IngangMasker nieuw = ingangen.actiefMasker() & ~voor & ~ingangen.herbegonnen();
    for (int i = 0; nieuw && i < N_INGANGEN; i++) {
      if (!(nieuw >> i & 1)) continue;
      const Melding *m = volg.ingangActief(i, cfg.punt, cfg.bus, nu);
      if (m) haltes.melding(cfg.halte, m->punt, m->bus, *this, nu);
    }
    seq.stap(cfg.functie, *this, nu);
    dagnachtStap(nu);
    haltes.stap(cfg.halte, ingangen.actiefMasker(), *this, nu);
    // E14/FN3: standaard uit; aan = boven zoveel groepen één servo tegelijk (de stand van de vorige tick). EN3.
    servos.geremd = cfg.inst.servoRemGroepen && telBits(lampen.uitgang) > cfg.inst.servoRemGroepen;
    servos.maxBewegend = cfg.inst.servoMaxBewegend;
    servos.stap(cfg.servo, nu);
    if (leren.loopt && nu - leren.start >= LEER_MS) {
      leren.loopt = false;
      leren.fout = "Er kwam geen code binnen (10 s).";
    }
    if (zelftest.loopt && nu - zelftest.start >= ZELFTEST_MS) {
      zelftest.loopt = false;
      zelftest.gedaan = true;
      // TN3: licht zonder draaggolf kan -B1 niet zien (TSMP58000: alleen 20-60 kHz)
      zelftest.fout = zelftest.ongemoduleerd
                          ? "-B1 zag een flank zonder herkenbare draaggolf (storing of toeval): kijk -Q3 (GPIO47) en "
                            "-Q4 na en probeer opnieuw, of zet de duty op 50 %."
                          : "-B1 zag niets: houd de IR-led voor het venster van -B1 en kijk -Q3, -Q4 en de draden na. "
                            "Licht zonder draaggolf ziet -B1 nooit (TSMP58000: 20-60 kHz).";
    }
    lampen.stap(nu);
    if (testSoort != TEST_GEEN) {
      int aan = testAan(nu);
      lampen.uitgang = aan >= 0 ? groepBit(aan) : 0;
    }
  }

  // ------------------------------------------------------------------------------------------------- servo's
  /** servo s (index) naar stand 0 = a, 1 = b, 2 = wisselen. false = bestaat niet */
  bool servoNaar(int s, int stand, uint32_t nu) {
    if (s < 0 || s >= MAX_SERVOS || !cfg.servo[s].gebruikt) return false;
    if (stand == 2) stand = servos.t[s].stand == STAND_B ? STAND_A : STAND_B;
    const ServoCfg &c = cfg.servo[s];
    servos.naar(s, stand == STAND_B ? c.b : c.a, (uint8_t)stand, c, nu);
    standRev++;
    return true;
  }
  /** een proefstand in µs (eindstanden instellen) */
  bool servoProef(int s, uint16_t us, uint32_t nu) {
    if (s < 0 || s >= MAX_SERVOS || !cfg.servo[s].gebruikt) return false;
    const ServoCfg &c = cfg.servo[s];
    uint8_t dichtst = (us > c.a ? us - c.a : c.a - us) <= (us > c.b ? us - c.b : c.b - us) ? STAND_A : STAND_B;
    servos.naar(s, us, dichtst, c, nu);
    return true;
  }

  // ------------------------------------------------------------------------------------------------------- IR
  /** IR-code (index) zenden via de IR-leds in het masker (0 = alle). false = onbekende code of de rij is vol.
   *  Een continu-code (F1) brandt IR_CONTINU_PROEF_MS lang zonder draaggolf. */
  bool irZenden(int code, uint8_t leds) {
    if (code < 0 || code >= MAX_IR_CODES || !cfg.ir[code].gebruikt) return false;
    if (cfg.ir[code].soort == IR_CONTINU) {
      proefLeds_ = leds ? leds : 0xFF;
      proefTot_ = msNu + IR_CONTINU_PROEF_MS;
      return true;
    }
    return irRij(code, leds);
  }
  /** de IR-leds die nu zonder draaggolf moeten branden: haltes met een continu-stopcode die een bus vasthouden (de
   *  eerste via stopLeds, een wachtende via wachtLeds: FN1), en een continu-code die met de hand gezonden werd */
  uint8_t continuLeds(uint32_t nu) const {
    uint8_t m = 0;
    for (int h = 0; h < MAX_HALTES; h++) {
      const HalteCfg &c = cfg.halte[h];
      if (!continuHalte(h)) continue;
      if (haltes.continuMag(h, c, nu, false)) m |= c.stopLeds ? c.stopLeds : 0xFF; // EN1: met een tijdsgrens
      if (haltes.continuMag(h, c, nu, true)) m |= c.wachtLeds;
    }
    if (proefLeds_ && !voorbij(nu, proefTot_)) m |= proefLeds_;
    return m;
  }
  /** heeft halte h een stopcode "continu"? */
  bool continuHalte(int h) const {
    const HalteCfg &c = cfg.halte[h];
    return c.gebruikt && c.stopCode >= 0 && cfg.ir[c.stopCode].gebruikt && cfg.ir[c.stopCode].soort == IR_CONTINU;
  }
  /** EN1: is er een continu-code in gebruik (bewaard)? Dan toont het dashboard de waarschuwing over de 470 Ω */
  bool continuGebruikt() const {
    for (int i = 0; i < MAX_IR_CODES; i++)
      if (cfg.ir[i].gebruikt && cfg.ir[i].soort == IR_CONTINU) return true;
    return false;
  }
  /** de code bij een opdracht uit de rij (ook de testcode van de zelftest) */
  bool irCodeVoor(const IrZend &z, IrCode &c) const {
    if (z.code == IR_ZELFTEST) { c = zelftestCode(); return true; }
    if (z.code < 0 || z.code >= MAX_IR_CODES || !cfg.ir[z.code].gebruikt) return false;
    c = cfg.ir[z.code];
    return true;
  }
  /** E4: de IR-zelftest starten met IR-led led (0..7). "" = gestart, anders waarom niet */
  const char *zelftestStart(int led, uint32_t nu) {
    if (led < 0 || led >= IR_LEDS) return "Welke IR-led? Geef \"led\" van 1 tot 8.";
    if (leren.loopt) return "Er wordt een code geleerd: wacht tot dat klaar is.";
    if (zelftest.loopt) return "De zelftest loopt al.";
    if (!irRij(IR_ZELFTEST, (uint8_t)(1u << led))) return "De doos is nog bezig met zenden. Probeer zo dadelijk opnieuw.";
    zelftest = IrZelftest();
    zelftest.loopt = true;
    zelftest.led = (int8_t)led;
    zelftest.start = nu;
    return "";
  }
  /** E2: het niveau van ontvangerpin o (0..3), elke tick: laag langer dan 50 ms = een ftr-melding (aanwezigheid) */
  void ontvangerNiveau(int o, bool laag, uint32_t nu) {
    if (o < 0 || o >= IR_ONTVANGERS) return;
    ontvangerLaag[o] = laag; // TN3: zichtbaar in /api/staat (fototransistor op GPIO11: laag = IR-licht)
    if (niveau[o].stap(laag, nu) != 1) return;
    const Melding *m = volg.ontvangen(o, "", cfg.punt, cfg.bus, nu);
    if (m) haltes.melding(cfg.halte, m->punt, m->bus, *this, nu);
  }
  /** meldingen van de logica voor het dashboard (F12: een halte gaf toch groen; FN3: een servo wacht > 5 s) */
  std::string logicaMelding() const {
    std::string m;
    int s = servos.langWachtend(msNu);
    if (s >= 0)
      m = "Servo \"" + std::string(cfg.servo[s].naam) + "\" wacht al langer dan 5 s om te bewegen" +
          (servos.geremd ? " (meer dan " + std::to_string(cfg.inst.servoRemGroepen) +
                               " lichtgroepen aan: de servo's gaan één voor één)."
                         : " (er bewegen al " + std::to_string(servos.limiet()) + " servo's tegelijk).");
    for (int h = 0; h < MAX_HALTES; h++) { // EN1: een continu-stopled die op haar grens uit ging
      if (!continuHalte(h) || !haltes.continuTeLang(h, cfg.halte[h], msNu)) continue;
      if (!m.empty()) m += " ";
      m += "Halte \"" + std::string(cfg.halte[h].naam) + "\": de continu-stopled brandde " +
           std::to_string(Haltes::continuGrensMs(cfg.halte[h], haltes.houdtWacht(h)) / 1000) +
           " s en is uit gezet om de serieweerstand te sparen. " + IR_CONTINU_WAARSCHUWING;
    }
    for (int h = 0; h < MAX_HALTES; h++) {
      if (!cfg.halte[h].gebruikt || !haltes.t[h].teLang) continue;
      if (!m.empty()) m += " ";
      m += "Halte \"" + std::string(cfg.halte[h].naam) + "\": het verkeer bleef langer dan " +
           std::to_string(cfg.halte[h].maxVerkeerS) + " s bezet; de bus kreeg toch groen. Kijk de vrij-ingangen na.";
    }
    return m;
  }
  /** de servo's: per kanaal van de PCA9685 op 0x42 de tellen (een kanaal met meer servo's: de laatste telt) */
  void servoTellen(uint16_t *tellen) const {
    for (int k = 0; k < 16; k++) tellen[k] = 0;
    for (int i = 0; i < MAX_SERVOS; i++)
      if (cfg.servo[i].gebruikt) tellen[cfg.servo[i].kanaal & 15] = servos.tellen(i);
  }
  bool irRij(int code, uint8_t leds) {
    if (nIrRij_ >= MAX_IR_RIJ) return false;
    irRij_[nIrRij_].code = (int8_t)code;
    irRij_[nIrRij_].leds = leds ? leds : 0xFF;
    nIrRij_++;
    return true;
  }
  bool haalIrZend(IrZend &z) {
    if (!nIrRij_) return false;
    z = irRij_[0];
    memmove(irRij_, irRij_ + 1, sizeof(IrZend) * (size_t)(nIrRij_ - 1));
    nIrRij_--;
    return true;
  }

  void lerenStart(int ontvanger, const char *naam, uint32_t nu) {
    leren = Leren();
    leren.loopt = true;
    leren.ontvanger = (int8_t)ontvanger;
    leren.start = nu;
    kopieerNaam(leren.naam, naam);
  }

  /** een frame van ontvanger o (0..3): duren in ns, aan/uit om beurten, begint met aan (leerontvanger: met de
   *  draaggolf; de andere: al gedemoduleerd). afgekapt: het frame was langer dan de buffer (F17) */
  void irFrame(int o, const uint32_t *ns, int n, uint32_t nu, bool afgekapt = false) {
    if (o < 0 || o >= IR_ONTVANGERS || n <= 0) return;
    static Leerresultaat r; // 0,5 kB: niet op de stapel
    if (!leerUitDraaggolf(ns, n, r)) return;
    IrGelezen g;
    bool code = irHerken(r.us, r.n, g);
    if (zelftest.loopt && o == 0) {
      zelftestFrame(r, code, g);
      return;
    }
    if (leren.loopt && leren.ontvanger == o) {
      if (afgekapt || r.afgekapt) { // F17: niet stil een half frame bewaren
        leren.loopt = false;
        leren.fout = "De code is te lang om te leren (meer dan 256 tijden): kies een kortere knop of stuur hem als raw.";
        return;
      }
      if (!code || g.herhaling) return; // een stoorpuls of een herhaalcode: verder wachten
      int plaats = -1;
      for (int i = 0; i < MAX_IR_CODES && plaats < 0; i++)
        if (!cfg.ir[i].gebruikt) plaats = i;
      leren.loopt = false;
      if (plaats < 0) { leren.fout = "Alle 32 plaatsen voor IR-codes zijn bezet. Wis eerst een code."; return; }
      IrCode &c = cfg.ir[plaats];
      c = IrCode();
      c.gebruikt = true;
      leerNaarCode(r, c);
      if (leren.naam[0]) strcpy(c.naam, leren.naam);
      else standaardNaam(c.naam, "Code", plaats + 1);
      leren.nr = (int8_t)plaats;
      leren.fout = "";
      cfgRev++;
      return;
    }
    if (code && g.herhaling) return; // NEC-herhaling: dezelfde doorkomst
    char t[IR_TEKST_LEN] = {0};
    if (code) irTekst(g, t, sizeof t);
    const Melding *m = volg.ontvangen(o, t, cfg.punt, cfg.bus, nu);
    if (m) haltes.melding(cfg.halte, m->punt, m->bus, *this, nu);
  }

  /** met de hand (dashboard, testen): bus b gezien bij punt id */
  void busGezien(int b, const char *id, uint32_t nu) {
    const Melding *m = volg.handmatig(b, id, cfg.punt, nu);
    if (m) haltes.melding(cfg.halte, m->punt, m->bus, *this, nu);
  }

  /** na het laden of na het wijzigen van een halte: vrij en rood aan */
  void haltesOpnieuw(uint32_t nu, int h = -1) {
    for (int i = 0; i < MAX_HALTES; i++)
      if (h < 0 || h == i) haltes.begin(i, cfg.halte[i], *this, nu);
  }

  // HalteUit
  void halteIr(int code, uint8_t leds, uint32_t) override {
    // een continu-code brandt via continuLeds zolang de halte vasthoudt (F1)
    if (code < 0 || code >= MAX_IR_CODES || !cfg.ir[code].gebruikt) return; // geen code gekozen
    if (cfg.ir[code].soort == IR_CONTINU) return;
    if (!irZenden(code, leds)) irRijVol++; // FN7: de rij was vol (de stopcode komt 400 ms later opnieuw)
  }
  void halteLicht(int g, bool aan, uint32_t nu) override {
    if (g >= 0 && g < N_GROEPEN && lampen.stand[g].aan != aan) zetAan(g, aan, nu);
  }
  void halteServo(int s, bool naarB, uint32_t nu) override { servoNaar(s, naarB ? STAND_B : STAND_A, nu); }
  void halteVertrek(int bus, uint32_t nu) override { volg.vertrek(bus, nu); }

  // ---------------------------------------------------------------------------------------------- testmodus
  /** welke groep (index) brandt nu in de testmodus; -1 = geen testmodus */
  int testAan(uint32_t nu) const {
    if (testSoort == TEST_VAST) return testGroep;
    if (testSoort == TEST_LOOPLICHT) return (int)(((nu - testStart) / testStapMs) % (uint32_t)N_GROEPEN);
    return -1;
  }
  void testLooplicht(uint32_t nu, uint32_t stapMs) {
    testSoort = TEST_LOOPLICHT;
    testStapMs = (uint32_t)klem((int32_t)stapMs, (int32_t)TEST_STAP_MIN_MS, (int32_t)TEST_STAP_MAX_MS);
    testStart = nu;
  }
  bool testVast(int g) {
    if (g < 0 || g >= N_GROEPEN) return false;
    testSoort = TEST_VAST;
    testGroep = g;
    return true;
  }
  void testStop() { testSoort = TEST_GEEN; }

  // ------------------------------------------------------------------------------------------------ groepen
  /** een groep zetten (met de tweede groep van een overweg) */
  void zetGroep(int g, const GroepStand &s, uint32_t nu) {
    if (g < 0 || g >= N_GROEPEN) return;
    GroepStand n = geldig(s);
    int p = n.p2 - 1;
    if (n.effect == FX_OVERWEG && p >= 0 && p < N_GROEPEN && p != g) {
      GroepStand m = lampen.stand[p];
      m.aan = n.aan;
      m.effect = FX_OVERWEG;
      m.p1 = n.p1;
      m.p2 = g + 1;
      m.fase = (uint8_t)(1 - n.fase);
      lampen.zet(g, n, nu, true);
      lampen.zet(p, m, nu, true);
    } else {
      lampen.zet(g, n, nu);
    }
    standRev++;
  }

  void allesUit(uint32_t nu) {
    testStop();
    seq.stopAlles();
    dn.loopt = false;
    for (int g = 0; g < N_GROEPEN; g++) {
      GroepStand s = lampen.stand[g];
      s.aan = false;
      lampen.zet(g, s, nu);
    }
    standRev++;
  }

  // ------------------------------------------------------------------------------------------------- scènes
  bool sceneOproepen(int i, uint32_t nu) {
    if (i < 0 || i >= MAX_SCENES || !cfg.scene[i].gebruikt) return false;
    for (int g = 0; g < N_GROEPEN; g++) {
      const GroepStand &s = cfg.scene[i].groep[g];
      lampen.zet(g, s, nu, s.effect == FX_OVERWEG); // overweg-paren samen laten beginnen
    }
    standRev++;
    return true;
  }

  /** de huidige stand bewaren; plaats -1 = de eerste vrije. Geeft de plaats, of -1 als alles vol is.
   *  aan != nullptr: niet de huidige stand, maar per groep aan (bit in *aan) of uit (het dashboard kiest per groep);
   *  het effect van een groep in een bestaande scène blijft dan staan. */
  int sceneBewaren(int plaats, const char *naam, const GroepMasker *aan = nullptr) {
    if (plaats < 0)
      for (int i = 0; i < MAX_SCENES && plaats < 0; i++)
        if (!cfg.scene[i].gebruikt) plaats = i;
    if (plaats < 0 || plaats >= MAX_SCENES) return -1;
    Scene &s = cfg.scene[plaats];
    char oud[NAAM_LEN];
    strcpy(oud, s.gebruikt ? s.naam : "");
    s.gebruikt = true;
    kopieerNaam(s.naam, naam);
    if (!s.naam[0]) {
      if (oud[0]) strcpy(s.naam, oud);
      else standaardNaam(s.naam, "Scène", plaats + 1);
    }
    for (int g = 0; g < N_GROEPEN; g++) {
      if (!aan) { s.groep[g] = lampen.stand[g]; continue; }
      if (!oud[0]) s.groep[g] = GroepStand(); // nieuwe scène: zonder effect
      s.groep[g].aan = (*aan >> g) & 1;
    }
    cfgRev++;
    return plaats;
  }

  bool sceneWissen(int i) {
    if (i < 0 || i >= MAX_SCENES || !cfg.scene[i].gebruikt) return false;
    cfg.scene[i] = Scene();
    cfgRev++;
    return true;
  }

  // ----------------------------------------------------------------------------------------------- functies
  void functieStart(int f, uint32_t nu) { seq.start(cfg.functie, f, *this, nu); }
  void functieStop(int f, uint32_t nu) { seq.stop(cfg.functie, f, *this, nu, true); }

  /** een functie bewaren (plaats -1 = de eerste vrije); een lopende functie stopt eerst. -1 = vol. */
  int functieBewaren(int plaats, const Functie &f, uint32_t nu) {
    if (plaats < 0)
      for (int i = 0; i < MAX_FUNCTIES && plaats < 0; i++)
        if (!cfg.functie[i].gebruikt) plaats = i;
    if (plaats < 0 || plaats >= MAX_FUNCTIES) return -1;
    functieStop(plaats, nu);
    cfg.functie[plaats] = f;
    cfg.functie[plaats].gebruikt = true;
    if (!cfg.functie[plaats].naam[0]) standaardNaam(cfg.functie[plaats].naam, "Functie", plaats + 1);
    cfgRev++;
    return plaats;
  }

  /** wissen: stopt hem en haalt hem weg bij de ingangen die hem startten */
  bool functieWissen(int f, uint32_t nu) {
    if (f < 0 || f >= MAX_FUNCTIES || !cfg.functie[f].gebruikt) return false;
    functieStop(f, nu);
    cfg.functie[f] = Functie();
    for (int i = 0; i < N_INGANGEN; i++) {
      if (cfg.ingang[i].functieA == f) cfg.ingang[i].functieA = -1;
      if (cfg.ingang[i].functieB == f) cfg.ingang[i].functieB = -1;
    }
    cfgRev++;
    return true;
  }

  /** een ingang een andere polariteit geven. Keert de Baan hem daardoor anders om, dan begint hij opnieuw: de huidige
   *  lezing is rust (anders zou het omkeren hem meteen laten "drukken") */
  void zetPolariteit(int i, uint8_t p) {
    if (i < 0 || i >= N_INGANGEN || cfg.ingang[i].polariteit == p) return;
    bool voor = ingangOmgekeerd(cfg.inst, cfg.ingang[i], i);
    cfg.ingang[i].polariteit = p;
    if (voor != ingangOmgekeerd(cfg.inst, cfg.ingang[i], i)) ingangen.herbegin(i);
  }
  /** een print (0..4) een andere soort geven (E3); de ingangen die daardoor anders omgekeerd worden, beginnen opnieuw */
  void zetPrintSoort(int p, uint8_t s) {
    if (p < 0 || p >= N_PRINTEN || cfg.inst.printSoort[p] == s) return;
    IngangMasker voor = omkeerMasker();
    cfg.inst.printSoort[p] = s;
    IngangMasker anders = voor ^ omkeerMasker();
    for (int i = 0; i < N_INGANGEN; i++)
      if (anders >> i & 1) ingangen.herbegin(i);
  }

  // ---------------------------------------------------------------------------------------------- dag/nacht
  GroepMasker deelnemers() const {
    GroepMasker m = 0;
    for (int g = 0; g < N_GROEPEN; g++)
      if (cfg.groep[g].dagnacht) m |= groepBit(g);
    return m;
  }

  /** starten vanaf het begin van een fase (DAG, AVOND, NACHT, OCHTEND), of op een bepaalde plaats (ms) */
  void dagnachtStart(uint32_t nu, int vanafFase, int32_t posMs = -1) {
    dn.duurMs = (uint32_t)cfg.inst.dagnachtMin * 60000u;
    dn.begin(nu, vanafFase);
    if (posMs >= 0) dn.start = nu - ((uint32_t)posMs % dn.duurMs);
    // de deelnemers meteen in de juiste stand
    GroepMasker m = deelnemers();
    for (int g = 0; g < N_GROEPEN; g++) {
      if (!(m >> g & 1)) continue;
      dnVorig_[g] = dn.wilAan(g, m, nu);
      zetAan(g, dnVorig_[g], nu);
    }
  }

  void dagnachtStop() {
    dn.loopt = false;
    standRev++;
  }

  // ------------------------------------------------------------------------------------- stand na stroomuitval
  Stand bewaarStand(uint32_t nu) const {
    Stand s;
    for (int g = 0; g < N_GROEPEN; g++) s.groep[g] = lampen.stand[g];
    s.dagnachtLoopt = dn.loopt;
    s.dagnachtPosMs = dn.loopt ? dn.positieMs(nu) : 0;
    for (int f = 0; f < MAX_FUNCTIES; f++)
      if (seq.loopt(f) && cfg.functie[f].herhalen) s.functies |= (uint16_t)(1u << f);
    for (int i = 0; i < MAX_SERVOS; i++)
      if (cfg.servo[i].gebruikt && servos.t[i].actief && servos.t[i].stand == STAND_B) s.servosB |= (uint16_t)(1u << i);
    return s;
  }

  /** de laatste stand terugzetten */
  void herstelStand(const Stand &s, uint32_t nu) {
    for (int g = 0; g < N_GROEPEN; g++) lampen.zet(g, s.groep[g], nu, s.groep[g].effect == FX_OVERWEG);
    if (s.dagnachtLoopt) dagnachtStart(nu, DAG, (int32_t)s.dagnachtPosMs);
    for (int f = 0; f < MAX_FUNCTIES; f++)
      if (s.functies >> f & 1 && cfg.functie[f].herhalen) functieStart(f, nu);
    servosOpStand(s.servosB, nu);
    standRev++;
  }

  /** alle servo's meteen (zonder beweging) op hun stand: bit s = B, anders A */
  void servosOpStand(uint16_t b, uint32_t nu = 0) {
    for (int i = 0; i < MAX_SERVOS; i++) {
      if (!cfg.servo[i].gebruikt) { servos.vergeet(i); continue; }
      bool naarB = b >> i & 1;
      // E8: niet allemaal tegelijk, maar door de rij (één nieuwe servo per 300 ms)
      servos.naarStart(i, naarB ? cfg.servo[i].b : cfg.servo[i].a, naarB ? STAND_B : STAND_A, nu);
    }
  }

  // ------------------------------------------------------------------------------- Uitvoerder (de functies)
  void voerUit(const Stap &st, uint32_t nu) override {
    switch (st.actie) {
      case ACT_AAN:
      case ACT_UIT:
        for (int g = 0; g < N_GROEPEN; g++)
          if (st.groepen >> g & 1) zetAan(g, st.actie == ACT_AAN, nu);
        break;
      case ACT_EFFECT: {
        int lijst[N_GROEPEN], n = 0;
        for (int g = 0; g < N_GROEPEN; g++)
          if (st.groepen >> g & 1) lijst[n++] = g;
        for (int i = 0; i < n; i++) {
          GroepStand s = lampen.stand[lijst[i]];
          s.aan = true;
          s.effect = st.effect;
          s.p1 = st.p1;
          s.p2 = st.p2;
          s.fase = 0;
          if (st.effect == FX_OVERWEG && n >= 2) {
            // om beurten over de gekozen groepen; de buur in het paar is de tweede groep
            s.fase = (uint8_t)(i & 1);
            s.p2 = (i ^ 1) < n ? lijst[i ^ 1] + 1 : 0;
            lampen.zet(lijst[i], s, nu, true);
            standRev++;
          } else {
            zetGroep(lijst[i], s, nu);
          }
        }
        break;
      }
      case ACT_SCENE:
        sceneOproepen(st.waarde - 1, nu);
        break;
      case ACT_WISSEL: {
        bool ietsAan = false;
        for (int g = 0; g < N_GROEPEN; g++)
          if ((st.groepen >> g & 1) && lampen.stand[g].aan) ietsAan = true;
        for (int g = 0; g < N_GROEPEN; g++)
          if (st.groepen >> g & 1) zetAan(g, !ietsAan, nu);
        break;
      }
      case ACT_DAGNACHT:
        if (st.waarde) dagnachtStart(nu, DAG);
        else dagnachtStop();
        break;
      case ACT_SERVO:
        servoNaar(st.waarde - 1, st.stand, nu);
        break;
      case ACT_IR:
        irZenden(st.waarde - 1, st.leds);
        break;
      case ACT_GELUID:
        kastjes.spelen(st.kastje, st.geluid, st.volume, nu); // offline of onbekend: niets
        break;
      default:
        break;
    }
  }

  void groepenUit(GroepMasker groepen, uint32_t nu) override {
    for (int g = 0; g < N_GROEPEN; g++)
      if (groepen >> g & 1) zetAan(g, false, nu);
  }

 private:
  bool dnVorig_[N_GROEPEN];
  IrZend irRij_[MAX_IR_RIJ];
  int nIrRij_ = 0;
  uint8_t proefLeds_ = 0;
  uint32_t proefTot_ = 0;

  void zelftestFrame(const Leerresultaat &r, bool code, const IrGelezen &g) {
    if (!r.khz) { // licht zonder draaggolf: onthouden, verder wachten op een gemoduleerd frame
      zelftest.ongemoduleerd = true;
      return;
    }
    if (!code || g.herhaling) return;
    zelftest.loopt = false;
    zelftest.gedaan = true;
    zelftest.khzTiende = r.khzTiende;
    irTekst(g, zelftest.code, sizeof zelftest.code);
    uint8_t verwacht[4];
    necBytes(ZELFTEST_ADRES, ZELFTEST_COMMANDO, verwacht);
    bool zelfde = g.soort == IR_NEC && memcmp(g.bytes, verwacht, 4) == 0;
    bool khzGoed = r.khzTiende >= 370 && r.khzTiende <= 390; // 38 kHz, binnen 1 kHz
    zelftest.ok = zelfde && khzGoed;
    zelftest.fout = zelfde ? (khzGoed ? "" : "De draaggolf wijkt meer dan 1 kHz af van 38 kHz.")
                           : "-B1 las een andere code dan de testcode (storing, of een ander toestel zendt).";
  }

  void zetAan(int g, bool aan, uint32_t nu) {
    GroepStand s = lampen.stand[g];
    s.aan = aan;
    zetGroep(g, s, nu);
  }

  void dagnachtStap(uint32_t nu) {
    if (!dn.loopt) return;
    GroepMasker m = deelnemers();
    for (int g = 0; g < N_GROEPEN; g++) {
      if (!(m >> g & 1)) continue;
      bool w = dn.wilAan(g, m, nu);
      if (w != dnVorig_[g]) {
        dnVorig_[g] = w;
        zetAan(g, w, nu);
      }
    }
  }
};

} // namespace trein
