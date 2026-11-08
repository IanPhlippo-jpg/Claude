// De ene onderhoudsprocedure van de afzuiging: het bouwschema neemt deze stappen over en de README toont dezelfde tekst
// (src/qa/tekstenAfzuiging.test.ts controleert dat, en dat geen enkele uitvoer nog "uitkloppen" aanraadt).
//
// Waarom zo: met het filter eruit ligt het oog van de ventilator open onder de instroomplaat (gat Ø127). Een bevestigde
// UIT van de knop is geen spanningsloze motor: eerst de schakelaar op de box uit (24 V naar de ventilator onderbroken) en
// wachten tot de waaier stilstaat. Het interieurfilter (MANN CU 20 013 of gelijk) heeft een pijl voor de luchtrichting:
// die wijst naar onder (naar de ventilator); het stof zit dan aan de bovenkant.
export const STILSTAND_S = 10; // uitloop van de waaier na het uitschakelen: een schatting met marge, na te meten in poort F1

export const ONDERHOUD = [
  'Zet de afzuiging uit met de knop en daarna met de schakelaar op de voorkant van de voedingsbox (de ventilator is dan spanningsloos).',
  `Wacht ${STILSTAND_S} seconden tot de ventilator stilstaat. Grijp nooit in de module zolang je hem nog hoort draaien.`,
  'Doe handschoenen en een stofmasker FFP2 aan en houd een vuilniszak open naast het rooster.',
  'Neem de RVS-plaat eraf en til het filter aan de randen recht omhoog en horizontaal eruit: het stof blijft bovenop.',
  'Leg het filter meteen in de zak en sluit de zak. Niet uitkloppen, niet uitblazen, geen perslucht.',
  'Neem de foamband en de instroomplaat af met een vochtige doek; is de foamband beschadigd of plat, vervang hem.',
  'Leg een nieuw interieurfilter MANN CU 20 013 (of gelijk: Bosch 1 987 435 066, Valeo 715828) op de foamband, de lange kant van voor naar achter en de pijl naar onder.',
  'Leg de RVS-plaat erop, zet de schakelaar aan en houd de knop 5 seconden ingedrukt om te ijken met het schone filter.',
];
