// De ene onderhoudsprocedure van de afzuiging: het bouwschema neemt deze stappen over en de README toont dezelfde tekst
// (src/qa/tekstenAfzuiging.test.ts controleert dat, en dat geen enkele uitvoer nog "uitkloppen" aanraadt).
//
// Waarom zo: met de cassette eruit ligt het oog van de ventilator open onder de instroomplaat (gat Ø127). Een bevestigde
// UIT van de knop is geen spanningsloze motor: eerst de schakelaar op de box uit (24 V naar de ventilator onderbroken) en
// wachten tot de waaier stilstaat. De mat (Rittal SK 3171.100) is progressief: open aan de stofzijde, dicht aan de
// schone zijde; de open kant hoort boven (naar het rooster).
export const STILSTAND_S = 10; // uitloop van de waaier na het uitschakelen: een schatting met marge, na te meten in poort F1

export const ONDERHOUD = [
  'Zet de afzuiging uit met de knop en daarna met de schakelaar op de voorkant van de voedingsbox (de ventilator is dan spanningsloos).',
  `Wacht ${STILSTAND_S} seconden tot de ventilator stilstaat. Grijp nooit in de module zolang je hem nog hoort draaien.`,
  'Doe handschoenen en een stofmasker FFP2 aan en houd een vuilniszak open naast het rooster.',
  'Neem de RVS-plaat eraf en til de cassette aan de twee grepen recht omhoog en horizontaal eruit: het stof blijft bovenop de mat.',
  'Kantel de mat meteen in de zak en sluit de zak. Niet uitkloppen, niet uitblazen, geen perslucht.',
  'Neem de cassette, de roosterbodem en de bovenkant van de instroomplaat af met een vochtige doek.',
  'Leg een nieuwe mat Rittal SK 3171.100 in de cassette, de open (grove) kant boven, en druk ze rondom aan.',
  'Zet de cassette terug, leg de RVS-plaat erop, zet de schakelaar aan en houd de knop 5 seconden ingedrukt om te ijken met de schone mat.',
];
