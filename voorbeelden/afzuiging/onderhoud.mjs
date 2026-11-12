// De onderhoudsprocedures van de afzuiging: het bouwschema neemt deze stappen over en de README toont dezelfde tekst
// (src/qa/tekstenAfzuiging.test.ts controleert dat, en dat geen enkele uitvoer nog "uitkloppen" aanraadt).
//
// Waarom zo: met het filter eruit ligt het oog van de ventilator open onder de instroomplaat (gat Ø127, met het vaste
// vingerrooster). Een UIT van de knop is geen spanningsloze motor: eerst de schakelaar op de box uit (24 V onderbroken) en
// wachten tot de waaier stilstaat. Het interieurfilter (MANN CU 20 013 of gelijk) heeft een pijl voor de luchtrichting:
// die wijst naar onder (naar de ventilator); het stof zit dan aan de bovenkant. De afdichting is een siliconenlip op de
// geleiderand: die moet na elke wissel rondom tegen het filter liggen (een kleine kier ziet de drukmeter niet).
// Versie 7.2: de ventilator hangt in een ronde kuip onder de romp (4 x M3); zonder filter stopt hij na 3 s.
export const STILSTAND_S = 10; // uitloop van de waaier na het uitschakelen: een schatting met marge, na te meten in poort F1

/** filter vervangen (bij de melding "filter vervangen") */
export const ONDERHOUD = [
  'Zet de afzuiging uit met de knop en daarna met de schakelaar op de voorkant van de voedingsbox (de ventilator is dan spanningsloos).',
  `Wacht ${STILSTAND_S} seconden tot de ventilator stilstaat. Grijp nooit in de module zolang je hem nog hoort draaien.`,
  'Doe handschoenen en een stofmasker FFP2 aan en houd een vuilniszak open naast het rooster.',
  'Neem de RVS-plaat eraf en trek het filter aan de randen recht omhoog en horizontaal eruit (de lip buigt mee): het stof blijft bovenop.',
  'Leg het filter meteen in de zak en sluit de zak. Niet uitkloppen, niet uitblazen, geen perslucht.',
  'Neem de lip, de foamband en de instroomplaat af met een vochtige doek. Is de lip gescheurd of los, of de foamband plat, vervang ze.',
  'Duw een nieuw interieurfilter MANN CU 20 013 (of gelijk: Bosch 1 987 435 066, Valeo 715828) recht naar onder door de lip tot op de foamband, de lange kant van voor naar achter en de pijl naar onder.',
  'Kijk en voel rondom: de lip ligt overal naar onder gebogen tegen de zijkant van het filter, zonder kier.',
  'Leg de RVS-plaat erop en zet de schakelaar aan. Houd de knop 5 seconden ingedrukt, bevestig "Nieuw filter?" met kort drukken en wacht tot het ijken klaar is.',
];

/** na morsen (een fles valt om op het rooster) */
export const NA_MORSEN = [
  'Zet de schakelaar op de box meteen uit en wacht tot de ventilator stilstaat. Veeg het rooster droog met keukenpapier.',
  'Neem de RVS-plaat eraf. Het natte filter gaat in een zak en weg (ook als het nog maar half vol was).',
  'Kijk met een zaklamp door het vingerrooster: is de instroomplaat droog en de waaier droog en schoon, ga dan naar de laatste stap.',
  'Is er vloeistof voorbij het filter gekomen: trek de M8-stekker onder het blad uit, draai de vier klauwschroeven los en til de module eruit. Schroef de kuip met de ventilator los (4 x M3, van onderen) en dep alles droog. Reinig met een middel op alcohol, nooit met aceton.',
  'Afkeuren en vervangen: een PETG-deel dat wit, zacht of plakkerig is geworden (aceton), of een lip die gezwollen is. Draait de waaier met de hand niet vrij en stil rond, of ruikt de motor verbrand: nieuwe ventilator.',
  'Laat alles minstens een uur open drogen. Bouw weer in (kuip met de foamband, module, klauwen: contact plus een halve slag, M8-stekker).',
  'Leg een nieuw filter in zoals bij het filter vervangen en ijk. De knop moet daarna "x Pa, y tpm" tonen zonder rode of oranje melding; anders uit laten en nakijken.',
];

/** eens per jaar */
export const JAARLIJKS = [
  'Bij een filterwissel, met de schakelaar uit en de ventilator stil: zuig de instroomplaat en het vingerrooster af met een stofzuiger met een smal mondstuk.',
  'Til de module eruit (zoals na morsen), schroef de kuip los en zuig de waaier, de lamellen en de ringsleuven af. Kijk of de waaier vrij draait, of de rubberbuffers en de foamband van de kuip heel zijn en of de klauwen en het rubber heel zijn.',
  'Vervang het propje vlies op de "+"-poort van de drukmeter in de voedingsbox (deksel eraf, netsnoer uit).',
  'Reinig de RVS-plaat met een middel op alcohol en droog ze af; vlekjes of roestpuntjes (RVS 430 is minder corrosievast dan 304) weg met een RVS-reiniger of een zachte schuurspons, in de richting van het borstelpatroon.',
  'Druk de knop na de inbouw 5 seconden in en ijk opnieuw met een nieuw filter.',
];
