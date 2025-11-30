/**
 * Marseille Tarot Prompts (Traditional French Style)
 *
 * The Tarot de Marseille features traditional woodcut aesthetic,
 * limited color palette (red, blue, yellow, flesh), flat styling,
 * and pip-style minor arcana without scenic illustrations.
 *
 * Key characteristics:
 * - Woodcut/block print aesthetic
 * - Limited palette: red, blue, yellow, flesh tones, white, black
 * - Flat, two-dimensional composition
 * - Simple geometric pip arrangements for minor arcana
 * - Traditional French titles (kept in English for consistency)
 */

// Base prompt prefix for Marseille-style consistency
const MARSEILLE_PREFIX = 'Tarot card in Tarot de Marseille woodcut style, traditional French playing card aesthetic, limited color palette of red blue yellow flesh tones:'

// Base suffix for Marseille art style
const MARSEILLE_SUFFIX = ', flat two-dimensional illustration, bold black outlines, simple woodblock print, medieval European style, no text or labels'

/**
 * Marseille tradition prompts mapped by card key
 */
export const MARSEILLE_PROMPTS: Record<string, string> = {
  // Major Arcana
  major_00: `${MARSEILLE_PREFIX} Le Mat (The Fool) as ragged traveler in motley clothing with walking stick and bundle, small dog biting torn clothes, simple landscape${MARSEILLE_SUFFIX}`,

  major_01: `${MARSEILLE_PREFIX} Le Bateleur (The Magician) as street performer at simple table with cups and dice, hat with wide brim, one hand raised, wand held${MARSEILLE_SUFFIX}`,

  major_02: `${MARSEILLE_PREFIX} La Papesse (The High Priestess) as papal figure in blue robe and triple tiara, holding open book, simple veil behind${MARSEILLE_SUFFIX}`,

  major_03: `${MARSEILLE_PREFIX} L'Imperatrice (The Empress) as crowned queen in red and blue robes, holding eagle shield and scepter, seated on throne${MARSEILLE_SUFFIX}`,

  major_04: `${MARSEILLE_PREFIX} L'Empereur (The Emperor) as bearded ruler in profile, crown and scepter, seated with crossed legs, eagle on shield${MARSEILLE_SUFFIX}`,

  major_05: `${MARSEILLE_PREFIX} Le Pape (The Hierophant) as pope figure with triple crown and cross staff, two tonsured monks kneeling before him${MARSEILLE_SUFFIX}`,

  major_06: `${MARSEILLE_PREFIX} L'Amoureux (The Lovers) as young man between two women, Cupid aiming arrow from above, simple ground line${MARSEILLE_SUFFIX}`,

  major_07: `${MARSEILLE_PREFIX} Le Chariot (The Chariot) as crowned prince in cubic chariot, two horses in red and blue, canopy above${MARSEILLE_SUFFIX}`,

  major_08: `${MARSEILLE_PREFIX} La Justice (Justice) as crowned woman seated with sword raised in right hand, scales in left, simple throne${MARSEILLE_SUFFIX}`,

  major_09: `${MARSEILLE_PREFIX} L'Hermite (The Hermit) as hooded old man with grey beard, holding lantern and staff, blue cloak${MARSEILLE_SUFFIX}`,

  major_10: `${MARSEILLE_PREFIX} La Roue de Fortune (Wheel of Fortune) as wheel with three figures (rising, falling, sphinx at top), crank handle, simple clouds${MARSEILLE_SUFFIX}`,

  major_11: `${MARSEILLE_PREFIX} La Force (Strength) as woman in broad hat opening lion's jaws with bare hands, yellow dress, calm expression${MARSEILLE_SUFFIX}`,

  major_12: `${MARSEILLE_PREFIX} Le Pendu (The Hanged Man) as man hanging upside down from wooden beam by one foot, hands behind back, peaceful face${MARSEILLE_SUFFIX}`,

  major_13: `${MARSEILLE_PREFIX} L'Arcane Sans Nom (Death) as skeleton with scythe walking among scattered body parts, heads and limbs, simple ground${MARSEILLE_SUFFIX}`,

  major_14: `${MARSEILLE_PREFIX} Temperance as winged angel in red and blue pouring liquid between two pitchers, simple ground and sky${MARSEILLE_SUFFIX}`,

  major_15: `${MARSEILLE_PREFIX} Le Diable (The Devil) as bat-winged demon with antlers standing on pedestal, two small chained demons below${MARSEILLE_SUFFIX}`,

  major_16: `${MARSEILLE_PREFIX} La Maison Dieu (The Tower) as brick tower struck by colored flames from sky, two figures falling, crown toppling${MARSEILLE_SUFFIX}`,

  major_17: `${MARSEILLE_PREFIX} L'Etoile (The Star) as nude woman kneeling pouring water from two jugs, one large yellow star with seven smaller stars${MARSEILLE_SUFFIX}`,

  major_18: `${MARSEILLE_PREFIX} La Lune (The Moon) as moon face in profile, two towers, two dogs howling, crayfish in pool, drops falling${MARSEILLE_SUFFIX}`,

  major_19: `${MARSEILLE_PREFIX} Le Soleil (The Sun) as sun face with straight and wavy rays, two children standing before brick wall, drops falling${MARSEILLE_SUFFIX}`,

  major_20: `${MARSEILLE_PREFIX} Le Jugement (Judgement) as angel blowing trumpet from clouds, three nude figures rising from tomb, cross on banner${MARSEILLE_SUFFIX}`,

  major_21: `${MARSEILLE_PREFIX} Le Monde (The World) as nude dancing figure with sash in oval wreath, four creatures in corners (angel, eagle, lion, bull)${MARSEILLE_SUFFIX}`,

  // Wands (Batons) - Simple geometric pip arrangements
  wands_01: `${MARSEILLE_PREFIX} Ace of Batons as single large club held by hand emerging from cloud, leafy branch with new growth${MARSEILLE_SUFFIX}`,

  wands_02: `${MARSEILLE_PREFIX} Two of Batons as two crossed wooden clubs forming X, decorative floral pattern between${MARSEILLE_SUFFIX}`,

  wands_03: `${MARSEILLE_PREFIX} Three of Batons as three clubs arranged with one vertical and two crossing, floral decorations${MARSEILLE_SUFFIX}`,

  wands_04: `${MARSEILLE_PREFIX} Four of Batons as four clubs forming diamond pattern, central floral rosette, geometric arrangement${MARSEILLE_SUFFIX}`,

  wands_05: `${MARSEILLE_PREFIX} Five of Batons as five clubs with one vertical center and four crossing, floral embellishments${MARSEILLE_SUFFIX}`,

  wands_06: `${MARSEILLE_PREFIX} Six of Batons as six clubs in balanced arrangement, three crossing pairs, decorative leaves${MARSEILLE_SUFFIX}`,

  wands_07: `${MARSEILLE_PREFIX} Seven of Batons as seven clubs with one vertical center, three crossing pairs, floral pattern${MARSEILLE_SUFFIX}`,

  wands_08: `${MARSEILLE_PREFIX} Eight of Batons as eight clubs in symmetrical arrangement, four crossing pairs, geometric flower pattern${MARSEILLE_SUFFIX}`,

  wands_09: `${MARSEILLE_PREFIX} Nine of Batons as nine clubs with one vertical center, four crossing pairs, elaborate floral design${MARSEILLE_SUFFIX}`,

  wands_10: `${MARSEILLE_PREFIX} Ten of Batons as ten clubs in complex symmetric pattern, two vertical with four crossing pairs, flowers${MARSEILLE_SUFFIX}`,

  wands_11: `${MARSEILLE_PREFIX} Valet de Baton (Page of Wands) as young man in profile holding tall staff, short tunic, feathered hat${MARSEILLE_SUFFIX}`,

  wands_12: `${MARSEILLE_PREFIX} Cavalier de Baton (Knight of Wands) as mounted rider on horse in profile, holding upright staff, simple ground${MARSEILLE_SUFFIX}`,

  wands_13: `${MARSEILLE_PREFIX} Reine de Baton (Queen of Wands) as crowned queen seated holding flowering staff, blue and red robes${MARSEILLE_SUFFIX}`,

  wands_14: `${MARSEILLE_PREFIX} Roi de Baton (King of Wands) as crowned king seated in profile holding staff, full beard, royal robes${MARSEILLE_SUFFIX}`,

  // Cups (Coupes) - Simple geometric pip arrangements
  cups_01: `${MARSEILLE_PREFIX} Ace of Cups as ornate chalice held by hand from cloud, Gothic architecture style cup, lid or dome${MARSEILLE_SUFFIX}`,

  cups_02: `${MARSEILLE_PREFIX} Two of Cups as two chalices with decorative banner or ribbon flowing between, floral design${MARSEILLE_SUFFIX}`,

  cups_03: `${MARSEILLE_PREFIX} Three of Cups as three chalices in triangle arrangement, flowers between cups${MARSEILLE_SUFFIX}`,

  cups_04: `${MARSEILLE_PREFIX} Four of Cups as four chalices in square arrangement, floral design in center${MARSEILLE_SUFFIX}`,

  cups_05: `${MARSEILLE_PREFIX} Five of Cups as five chalices with one in center and four around, flower pattern${MARSEILLE_SUFFIX}`,

  cups_06: `${MARSEILLE_PREFIX} Six of Cups as six chalices in two rows of three, decorative vine pattern${MARSEILLE_SUFFIX}`,

  cups_07: `${MARSEILLE_PREFIX} Seven of Cups as seven chalices with one large center cup and six around, elaborate flowers${MARSEILLE_SUFFIX}`,

  cups_08: `${MARSEILLE_PREFIX} Eight of Cups as eight chalices in two columns of four, floral decorations between${MARSEILLE_SUFFIX}`,

  cups_09: `${MARSEILLE_PREFIX} Nine of Cups as nine chalices in three rows of three, ornate floral pattern${MARSEILLE_SUFFIX}`,

  cups_10: `${MARSEILLE_PREFIX} Ten of Cups as ten chalices arranged symmetrically, two columns with elaborate flowers${MARSEILLE_SUFFIX}`,

  cups_11: `${MARSEILLE_PREFIX} Valet de Coupe (Page of Cups) as young person standing holding covered chalice, feathered cap${MARSEILLE_SUFFIX}`,

  cups_12: `${MARSEILLE_PREFIX} Cavalier de Coupe (Knight of Cups) as mounted rider holding raised cup, horse in profile${MARSEILLE_SUFFIX}`,

  cups_13: `${MARSEILLE_PREFIX} Reine de Coupe (Queen of Cups) as crowned queen seated holding lidded chalice, flowing robes${MARSEILLE_SUFFIX}`,

  cups_14: `${MARSEILLE_PREFIX} Roi de Coupe (King of Cups) as crowned king seated holding chalice, beard, royal attire${MARSEILLE_SUFFIX}`,

  // Swords (Epees) - Simple geometric pip arrangements
  swords_01: `${MARSEILLE_PREFIX} Ace of Swords as curved sword held by hand from cloud, crowned with laurel and palm, ornate hilt${MARSEILLE_SUFFIX}`,

  swords_02: `${MARSEILLE_PREFIX} Two of Swords as two curved swords crossing with floral oval design at center${MARSEILLE_SUFFIX}`,

  swords_03: `${MARSEILLE_PREFIX} Three of Swords as three swords with one vertical and two crossing, decorative pattern${MARSEILLE_SUFFIX}`,

  swords_04: `${MARSEILLE_PREFIX} Four of Swords as four swords forming cross pattern, floral center design${MARSEILLE_SUFFIX}`,

  swords_05: `${MARSEILLE_PREFIX} Five of Swords as five swords with one vertical center and four crossing, elaborate flowers${MARSEILLE_SUFFIX}`,

  swords_06: `${MARSEILLE_PREFIX} Six of Swords as six swords in balanced crossing pattern, decorative leaves and flowers${MARSEILLE_SUFFIX}`,

  swords_07: `${MARSEILLE_PREFIX} Seven of Swords as seven swords with one large center sword, six around it crossing${MARSEILLE_SUFFIX}`,

  swords_08: `${MARSEILLE_PREFIX} Eight of Swords as eight swords in symmetric pattern, four pairs crossing, floral center${MARSEILLE_SUFFIX}`,

  swords_09: `${MARSEILLE_PREFIX} Nine of Swords as nine swords with one vertical center and four pairs crossing, flowers${MARSEILLE_SUFFIX}`,

  swords_10: `${MARSEILLE_PREFIX} Ten of Swords as ten swords in complex symmetric pattern, two vertical with four pairs crossing${MARSEILLE_SUFFIX}`,

  swords_11: `${MARSEILLE_PREFIX} Valet d'Epee (Page of Swords) as young figure standing with raised sword, hat with feather${MARSEILLE_SUFFIX}`,

  swords_12: `${MARSEILLE_PREFIX} Cavalier d'Epee (Knight of Swords) as mounted warrior with raised sword, horse prancing${MARSEILLE_SUFFIX}`,

  swords_13: `${MARSEILLE_PREFIX} Reine d'Epee (Queen of Swords) as crowned queen seated holding upright sword, stern expression${MARSEILLE_SUFFIX}`,

  swords_14: `${MARSEILLE_PREFIX} Roi d'Epee (King of Swords) as crowned king seated holding sword, full beard, armor${MARSEILLE_SUFFIX}`,

  // Pentacles (Deniers/Coins) - Simple geometric pip arrangements
  pentacles_01: `${MARSEILLE_PREFIX} Ace of Coins as large ornate gold coin with floral center design, held by hand from cloud${MARSEILLE_SUFFIX}`,

  pentacles_02: `${MARSEILLE_PREFIX} Two of Coins as two gold coins connected by decorative ribbon or banner forming S shape${MARSEILLE_SUFFIX}`,

  pentacles_03: `${MARSEILLE_PREFIX} Three of Coins as three gold coins in triangle arrangement with floral decorations${MARSEILLE_SUFFIX}`,

  pentacles_04: `${MARSEILLE_PREFIX} Four of Coins as four gold coins in square arrangement with flower center${MARSEILLE_SUFFIX}`,

  pentacles_05: `${MARSEILLE_PREFIX} Five of Coins as five gold coins with one center and four corners, floral pattern${MARSEILLE_SUFFIX}`,

  pentacles_06: `${MARSEILLE_PREFIX} Six of Coins as six gold coins in two rows of three, decorative leaf pattern${MARSEILLE_SUFFIX}`,

  pentacles_07: `${MARSEILLE_PREFIX} Seven of Coins as seven gold coins with one large center coin and six around${MARSEILLE_SUFFIX}`,

  pentacles_08: `${MARSEILLE_PREFIX} Eight of Coins as eight gold coins in two columns of four, floral decorations${MARSEILLE_SUFFIX}`,

  pentacles_09: `${MARSEILLE_PREFIX} Nine of Coins as nine gold coins in three rows of three, elaborate flowers${MARSEILLE_SUFFIX}`,

  pentacles_10: `${MARSEILLE_PREFIX} Ten of Coins as ten gold coins in symmetric pattern, ornate floral design${MARSEILLE_SUFFIX}`,

  pentacles_11: `${MARSEILLE_PREFIX} Valet de Denier (Page of Pentacles) as young figure standing holding large coin, hat with feather${MARSEILLE_SUFFIX}`,

  pentacles_12: `${MARSEILLE_PREFIX} Cavalier de Denier (Knight of Pentacles) as mounted rider holding coin, horse walking${MARSEILLE_SUFFIX}`,

  pentacles_13: `${MARSEILLE_PREFIX} Reine de Denier (Queen of Pentacles) as crowned queen seated holding large coin, rich robes${MARSEILLE_SUFFIX}`,

  pentacles_14: `${MARSEILLE_PREFIX} Roi de Denier (King of Pentacles) as crowned king seated holding coin, beard, crown${MARSEILLE_SUFFIX}`,
}

export default MARSEILLE_PROMPTS
