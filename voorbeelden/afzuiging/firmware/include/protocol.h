// Berichten tussen de knop en de module (ESP-NOW op kanaal 1), versie 5 (afzuiging 7.2).
//
// Versie 5: de sleutel van de set gaat niet meer over de lucht. KOPPEL draagt de publieke sleutel (X25519, 32 bytes) van
// de knop, KOPPEL_OK die van de module; elk rekent met zijn eigen geheime sleutel hetzelfde gedeelde geheim uit en daaruit
// (SHA-256 met de uitdaging) de sleutel van de set (16 bytes, ESP-NOW LMK). KOPPEL_BEVESTIG draagt een bewijs (de eerste 8
// bytes van SHA-256 over die sleutel en de uitdaging): de module koppelt alleen als het klopt. Een afluisteraar ziet alleen
// de publieke sleutels. Een actieve aanvaller die in de 60 s van het koppelvenster tussen beide gaat zitten, is niet
// uitgesloten (er is geen scherm op de box om een code te vergelijken); daarom gaat het venster alleen open na de bewuste
// handeling aan de box. Daarnaast: Leven (knop -> module, 1 keer per seconde): de module stopt na 10 min zonder enig bericht
// van de knop.
//
// Koppeling per set, per module: een knop die (opnieuw) wil koppelen zendt KOPPEL (broadcast) met een willekeurige
// sleutel van 16 bytes en een willekeurige uitdaging. Een module neemt dat alleen aan in de eerste 60 s na het aanzetten
// van de voedingsbox én alleen als ze nog geen knop heeft of na een bewuste handeling (de schakelaar van de box 3 keer
// kort aan en uit). Ze antwoordt KOPPEL_OK met haar eigen MAC-adres en dezelfde uitdaging, maar bewaart nog niets. De
// knop neemt alleen het EERSTE geldige antwoord aan en stuurt die ene module een gerichte KOPPEL_BEVESTIG (unicast, met
// de uitdaging en het MAC-adres van die module). Pas dan bewaart de module de knop (binnen 5 s, anders vergeet ze de
// vraag). Een tweede verse module in de buurt krijgt geen bevestiging en blijft ongekoppeld. Daarna praten beide alleen
// nog met elkaar, versleuteld (ESP-NOW CCMP met die sleutel), en weigert de module elke andere afzender.
//   knop -> module  Opdracht, 4 keer per seconde en meteen bij een wijziging, maar pas na de eerste handeling van de
//                   gebruiker sinds de knop startte. De sessie is een teller die de knop bij elke start verhoogt (NVS);
//                   binnen een sessie stijgt het volgnummer. De module weigert vroegere sessies en herhaalde berichten.
//                   startId is het startnummer van de module uit haar laatste status: AAN geldt alleen met haar
//                   huidige startId (een oude AAN-opdracht zet een herstarte module niet weer aan).
//   module -> knop  Status, 4 keer per seconde: de bevestigde toestand van de module (niet wat de knop wil), met het
//                   startnummer (willekeurig, bij elke start nieuw).
// Verbindingsverlies: de module draait verder op de laatste gewone stand (de stofvangst valt niet weg tijdens het
// werk), hoogstens 10 minuten; een boost vervalt in de module zelf. Na elke start van de module staat ze UIT tot een nieuwe handeling op de
// knop. De schakelaar op de box zet de ventilator spanningsloos; netisolatie is de stekker (alleen nodig om de box te
// openen).
#pragma once
#include <stdint.h>

namespace afzuiging {

constexpr uint32_t MAGIE = 0x5A41424C; // "LBAZ"
constexpr uint8_t VERSIE = 5;
constexpr uint8_t KANAAL = 1;
constexpr uint8_t SOORT_OPDRACHT = 1, SOORT_STATUS = 2, SOORT_KOPPEL = 3, SOORT_KOPPEL_OK = 4, SOORT_KOPPEL_BEVESTIG = 5, SOORT_LEVEN = 6;

struct __attribute__((packed)) Opdracht {
  uint32_t magie = MAGIE;
  uint8_t versie = VERSIE;
  uint8_t soort = SOORT_OPDRACHT;
  uint8_t aan = 0;      // de gebruiker wil de afzuiging aan
  uint8_t pct = 80;     // gewone stand 20..80 % van het maximale toerental (80 = dagstand)
  uint8_t ijk = 0;      // teller: verhoogt bij elke bevestigde vraag om te ijken
  uint8_t boost = 0;    // teller: verhoogt bij elke vraag om boost (de module houdt tijd en tegoed bij)
  uint16_t sessie = 0;  // stijgt bij elke start van de knop: een herstart is geen ijk- of boostvraag
  uint32_t volgnr = 0;  // stijgt per bericht binnen een sessie
  uint32_t startId = 0; // startnummer van de module uit haar laatste status (0 = nog geen gezien: alleen UIT geldt)
  uint8_t refWis = 0;   // teller (7.2): verhoogt bij "ander merk filter": de eerste ijking vervalt, de volgende wordt de referentie
};

// levensteken van de knop (7.2): 1 keer per seconde, versleuteld, zelfde sessie en volgnummers als de opdrachten
struct __attribute__((packed)) Leven {
  uint32_t magie = MAGIE;
  uint8_t versie = VERSIE;
  uint8_t soort = SOORT_LEVEN;
  uint16_t sessie = 0;
  uint32_t volgnr = 0;
};

struct __attribute__((packed)) Koppel {
  uint32_t magie = MAGIE;
  uint8_t versie = VERSIE;
  uint8_t soort = SOORT_KOPPEL;
  uint32_t uitdaging = 0;    // willekeurig (niet 0); KOPPEL_OK en KOPPEL_BEVESTIG sturen dezelfde mee
  uint8_t pub[32] = {0};     // KOPPEL: publieke sleutel (X25519) van de knop; KOPPEL_OK: die van de module
  uint8_t mac[6] = {0};      // KOPPEL_OK: het MAC-adres van de module; KOPPEL_BEVESTIG: de gekozen module
  uint8_t bewijs[8] = {0};   // KOPPEL_BEVESTIG: SHA-256(sleutel van de set, uitdaging), eerste 8 bytes
};

// fout bij het ijken (de vorige geldige ijking blijft dan bewaard)
enum IjkFout : uint8_t {
  IJK_OK = 0, IJK_GEEN_METING = 1, IJK_ONPLAUSIBEL = 2, IJK_BUITEN_BEREIK = 3, IJK_GEEN_TOEREN = 4, IJK_AFGEBROKEN = 5,
  IJK_TE_HOOG = 6, // meer dan 15 % boven de eerste ijking: geen schoon filter (een vuil filter wordt geen referentie)
  IJK_TE_LAAG = 7, // 7.2: onder 0,70 x de eerste ijking: geijkt zonder filter of met een kier?
};
// waarom de module zelf stopte (7.2); de knop toont het en zet zijn wens op UIT
enum Stop : uint8_t { STOP_GEEN = 0, STOP_LUCHT = 1, STOP_GEEN_KNOP = 2, STOP_AUTO = 3 };
// storing tijdens het werk
enum Storing : uint8_t { STORING_GEEN = 0, STORING_GEEN_LUCHT = 1, STORING_STIL = 2, STORING_TOEREN = 3 };
// wat de filterbewaking op dit moment weet (alleen bij BEW_OK is vol een geldige waarde); zie de tabel in regel.h
enum Bewaking : uint8_t {
  BEW_UIT = 0,           // de ventilator staat stil
  BEW_OK = 1,            // vol is geldig
  BEW_STABILISEREN = 2,  // na een standwissel: nog geen oordeel (geen oude melding)
  BEW_NIET_GEIJKT = 3,   // nog geen ijking op een schoon filter
  BEW_GEEN_METING = 4,   // drukmeter weg of meting niet vers
  BEW_BUITEN_BEREIK = 5, // de meting of de vervanggrens valt boven het meetbereik
  BEW_LAGE_STAND = 6,    // deze stand haalt het minimumdebiet voor de vangst niet: geen bescherming beloofd
  BEW_IJKEN = 7,
  BEW_TOEREN = 8,        // het toerental volgt de stand niet: de druk zegt dan niets over het filter
  BEW_FILTER_LEK = 9,    // drukverschil onder 0,70 x schoon: filter ontbreekt of sluit niet af (lucht loopt om)
};

struct __attribute__((packed)) Status {
  uint32_t magie = MAGIE;
  uint8_t versie = VERSIE;
  uint8_t soort = SOORT_STATUS;
  uint8_t aan = 0;          // bevestigd: de module stuurt de ventilator aan
  uint8_t pct = 0;          // de stand die de module nu geeft (% van het maximale toerental; 0 = stil)
  uint8_t gewoon = 0;       // de gewone stand die de module houdt (20..80 %, 0 = UIT); een herstarte knop neemt die over
  uint8_t pwm = 0;          // de PWM die daarvoor nodig is (0..100 %)
  uint8_t boostRest = 0;    // resterende boost in s (0 = geen)
  uint8_t boostTegoed = 0;  // 0..100 % van het boosttegoed (120 s); onder 8 % geen nieuwe boost
  uint8_t meter = 0;        // drukmeter antwoordt
  uint8_t meetVers = 0;     // de laatste meting is jonger dan 1 s (anders is dp ongeldig)
  uint8_t geijkt = 0;       // een geldige ijking op een schoon filter is bewaard
  uint8_t storing = STORING_GEEN;
  uint8_t bewaking = BEW_UIT;
  uint8_t ijken = 0;        // 0 = niet aan het ijken, anders de stap 1..5
  uint8_t ijkVoortgang = 0; // 0..100 %
  uint8_t ijkFout = IJK_OK; // uitkomst van de laatste ijking
  uint16_t toeren = 0;      // gemeten toerental (omw/min, uit de tacho)
  float dp = 0;             // drukverschil rooster + filter (Pa), NAN als niet vers
  float vol = 0;            // drukreserve verbruikt: 0 = schoon, 1 = vervangen; NAN tenzij bewaking == BEW_OK
  uint32_t startId = 0;     // startnummer van de module (willekeurig, bij elke start nieuw, nooit 0)
  uint8_t filterVol = 0;    // 7.2: de melding "filter vervangen" staat (minimum over 5 min; blijft tot een nieuwe ijking)
  uint8_t uitReden = STOP_GEEN; // 7.2: de module stopte zelf (Stop)
};

} // namespace afzuiging
