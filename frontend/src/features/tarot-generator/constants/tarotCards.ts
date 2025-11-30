/**
 * Tarot Card Definitions
 *
 * Complete 78-card deck: 22 Major Arcana + 56 Minor Arcana
 */

export interface TarotCard {
  key: string
  name: string
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  number?: number
  defaultPrompt: string
}

// Base prompt prefix for tarot card consistency
const CARD_PREFIX = 'Tarot card illustration, portrait orientation, single scene composition, rich symbolic imagery:'

// Base suffix for consistent tarot art style
const CARD_SUFFIX = ', ornate illustrated tarot card style, jewel-tone colors, gold accents, mystical atmosphere, detailed linework, no text or labels on card'

// Major Arcana (0-21)
export const MAJOR_ARCANA: TarotCard[] = [
  {
    key: 'major_00',
    name: 'The Fool',
    arcana: 'major',
    number: 0,
    defaultPrompt: `${CARD_PREFIX} A young traveler standing at the edge of a cliff with a small white dog, carrying a bundle on a stick, looking upward with innocent wonder, bright sunrise behind, mountain landscape${CARD_SUFFIX}`,
  },
  {
    key: 'major_01',
    name: 'The Magician',
    arcana: 'major',
    number: 1,
    defaultPrompt: `${CARD_PREFIX} A skilled magician at a wooden table with wand, cup, sword and pentacle, one hand pointing up one down, infinity symbol floating above head, red roses and white lilies${CARD_SUFFIX}`,
  },
  {
    key: 'major_02',
    name: 'The High Priestess',
    arcana: 'major',
    number: 2,
    defaultPrompt: `${CARD_PREFIX} A serene priestess seated between black and white pillars marked B and J, holding a scroll, crescent moon at feet, pomegranate veil behind, blue robes${CARD_SUFFIX}`,
  },
  {
    key: 'major_03',
    name: 'The Empress',
    arcana: 'major',
    number: 3,
    defaultPrompt: `${CARD_PREFIX} A nurturing empress in flowing robes seated on cushioned throne in lush garden, crown of twelve stars, wheat field and waterfall, Venus symbol on heart-shaped shield${CARD_SUFFIX}`,
  },
  {
    key: 'major_04',
    name: 'The Emperor',
    arcana: 'major',
    number: 4,
    defaultPrompt: `${CARD_PREFIX} A powerful emperor on stone throne carved with ram heads, long white beard, holding ankh scepter and golden orb, red robes, barren mountains behind${CARD_SUFFIX}`,
  },
  {
    key: 'major_05',
    name: 'The Hierophant',
    arcana: 'major',
    number: 5,
    defaultPrompt: `${CARD_PREFIX} A spiritual pope figure on throne between grey pillars, triple crown, blessing two tonsured monks kneeling before him, crossed golden keys at feet${CARD_SUFFIX}`,
  },
  {
    key: 'major_06',
    name: 'The Lovers',
    arcana: 'major',
    number: 6,
    defaultPrompt: `${CARD_PREFIX} A nude man and woman standing beneath a radiant angel with purple wings, tree of knowledge with serpent behind woman, tree of flames behind man${CARD_SUFFIX}`,
  },
  {
    key: 'major_07',
    name: 'The Chariot',
    arcana: 'major',
    number: 7,
    defaultPrompt: `${CARD_PREFIX} An armored warrior standing in stone chariot with starry canopy, pulled by one black and one white sphinx, city walls and river behind, crescent moons on shoulders${CARD_SUFFIX}`,
  },
  {
    key: 'major_08',
    name: 'Strength',
    arcana: 'major',
    number: 8,
    defaultPrompt: `${CARD_PREFIX} A gentle woman in white robes calmly holding open the jaws of a golden lion, infinity symbol above head, chain of flowers, green mountains in background${CARD_SUFFIX}`,
  },
  {
    key: 'major_09',
    name: 'The Hermit',
    arcana: 'major',
    number: 9,
    defaultPrompt: `${CARD_PREFIX} A hooded sage standing on snowy mountain peak, holding a golden lantern containing six-pointed star, leaning on grey staff, grey cloak, alone in darkness${CARD_SUFFIX}`,
  },
  {
    key: 'major_10',
    name: 'Wheel of Fortune',
    arcana: 'major',
    number: 10,
    defaultPrompt: `${CARD_PREFIX} A great eight-spoked wheel floating in clouds with Hebrew letters and alchemical symbols, sphinx with sword at top, Anubis ascending, serpent descending, four winged creatures in corners${CARD_SUFFIX}`,
  },
  {
    key: 'major_11',
    name: 'Justice',
    arcana: 'major',
    number: 11,
    defaultPrompt: `${CARD_PREFIX} A crowned figure seated between grey pillars holding golden scales in left hand and upright double-edged sword in right, red cloak over green, purple veil behind${CARD_SUFFIX}`,
  },
  {
    key: 'major_12',
    name: 'The Hanged Man',
    arcana: 'major',
    number: 12,
    defaultPrompt: `${CARD_PREFIX} A serene figure hanging upside-down from a wooden T-cross by right ankle, left leg crossed behind, arms behind back forming triangle, golden halo around head, peaceful expression${CARD_SUFFIX}`,
  },
  {
    key: 'major_13',
    name: 'Death',
    arcana: 'major',
    number: 13,
    defaultPrompt: `${CARD_PREFIX} A skeleton in black armor riding a white horse, carrying black flag with white five-petaled rose, fallen king below, bishop and maiden before him, sun rising between two towers${CARD_SUFFIX}`,
  },
  {
    key: 'major_14',
    name: 'Temperance',
    arcana: 'major',
    number: 14,
    defaultPrompt: `${CARD_PREFIX} A winged angel in white robes with one foot on rocks and one in pool, pouring water between two golden cups, triangle with sun on chest, yellow irises, path to distant mountains${CARD_SUFFIX}`,
  },
  {
    key: 'major_15',
    name: 'The Devil',
    arcana: 'major',
    number: 15,
    defaultPrompt: `${CARD_PREFIX} A horned goat-headed figure with bat wings perched on black pedestal, inverted pentagram above, nude man and woman chained loosely below with tails, torch held downward${CARD_SUFFIX}`,
  },
  {
    key: 'major_16',
    name: 'The Tower',
    arcana: 'major',
    number: 16,
    defaultPrompt: `${CARD_PREFIX} A tall grey tower on rocky peak struck by lightning bolt, golden crown blasted from top, two figures falling headfirst, flames erupting from windows, dark stormy sky with falling sparks${CARD_SUFFIX}`,
  },
  {
    key: 'major_17',
    name: 'The Star',
    arcana: 'major',
    number: 17,
    defaultPrompt: `${CARD_PREFIX} A nude woman kneeling with one foot on water and one on land, pouring water from two pitchers onto earth and into pool, one large yellow eight-pointed star with seven smaller white stars above, ibis in tree${CARD_SUFFIX}`,
  },
  {
    key: 'major_18',
    name: 'The Moon',
    arcana: 'major',
    number: 18,
    defaultPrompt: `${CARD_PREFIX} A large full moon with feminine face in profile between two grey towers, wolf and dog howling at moon, crayfish emerging from pool onto path, drops falling from moon${CARD_SUFFIX}`,
  },
  {
    key: 'major_19',
    name: 'The Sun',
    arcana: 'major',
    number: 19,
    defaultPrompt: `${CARD_PREFIX} A radiant golden sun with straight and wavy rays and benevolent face, nude child with red feather riding white horse, arms outstretched, tall sunflowers behind stone wall${CARD_SUFFIX}`,
  },
  {
    key: 'major_20',
    name: 'Judgement',
    arcana: 'major',
    number: 20,
    defaultPrompt: `${CARD_PREFIX} A great angel with red wings blowing a golden trumpet with cross banner from clouds, grey figures rising naked from coffins with arms raised, snowy mountains behind${CARD_SUFFIX}`,
  },
  {
    key: 'major_21',
    name: 'The World',
    arcana: 'major',
    number: 21,
    defaultPrompt: `${CARD_PREFIX} A nude dancing figure wrapped in purple sash within green laurel wreath, holding two wands, four winged creatures in corners (angel, eagle, lion, bull) on clouds${CARD_SUFFIX}`,
  },
]

// Minor Arcana - Wands (Fire, Passion, Energy)
export const WANDS_SUIT: TarotCard[] = [
  { key: 'wands_01', name: 'Ace of Wands', arcana: 'minor', suit: 'wands', number: 1, defaultPrompt: `${CARD_PREFIX} A hand emerging from grey clouds gripping a living wooden wand sprouting fresh green leaves, distant mountains and castle below, clear blue sky${CARD_SUFFIX}` },
  { key: 'wands_02', name: 'Two of Wands', arcana: 'minor', suit: 'wands', number: 2, defaultPrompt: `${CARD_PREFIX} A noble figure in red robe holding small globe in right hand and wand in left, standing on castle battlements between two tall wands, overlooking sea and distant lands${CARD_SUFFIX}` },
  { key: 'wands_03', name: 'Three of Wands', arcana: 'minor', suit: 'wands', number: 3, defaultPrompt: `${CARD_PREFIX} A merchant figure in red and green robes standing on cliff with back turned, holding one of three wands, watching three ships sail on golden sea toward distant mountains${CARD_SUFFIX}` },
  { key: 'wands_04', name: 'Four of Wands', arcana: 'minor', suit: 'wands', number: 4, defaultPrompt: `${CARD_PREFIX} Four tall wands forming a canopied arch with garlands of flowers and grapes, two figures raising bouquets in celebration, castle with bridge in background${CARD_SUFFIX}` },
  { key: 'wands_05', name: 'Five of Wands', arcana: 'minor', suit: 'wands', number: 5, defaultPrompt: `${CARD_PREFIX} Five young men in varied colored tunics engaged in mock combat with raised wands, chaotic scene with wands crossing, clear sky background${CARD_SUFFIX}` },
  { key: 'wands_06', name: 'Six of Wands', arcana: 'minor', suit: 'wands', number: 6, defaultPrompt: `${CARD_PREFIX} A victorious rider on white horse wearing laurel crown, holding upright wand with laurel wreath, five supporters alongside holding wands, triumphant procession${CARD_SUFFIX}` },
  { key: 'wands_07', name: 'Seven of Wands', arcana: 'minor', suit: 'wands', number: 7, defaultPrompt: `${CARD_PREFIX} A determined young man on rocky hilltop in defensive stance, wielding wand against six wands attacking from below, one shoe missing, green tunic${CARD_SUFFIX}` },
  { key: 'wands_08', name: 'Eight of Wands', arcana: 'minor', suit: 'wands', number: 8, defaultPrompt: `${CARD_PREFIX} Eight wooden wands flying diagonally through clear blue sky above green countryside with river, rapid movement toward distant hills, no figures${CARD_SUFFIX}` },
  { key: 'wands_09', name: 'Nine of Wands', arcana: 'minor', suit: 'wands', number: 9, defaultPrompt: `${CARD_PREFIX} A weary bandaged figure leaning on wand with alert watchful expression, eight upright wands standing like fence behind, green hills beyond${CARD_SUFFIX}` },
  { key: 'wands_10', name: 'Ten of Wands', arcana: 'minor', suit: 'wands', number: 10, defaultPrompt: `${CARD_PREFIX} A bent figure carrying heavy bundle of ten wands obscuring their view, struggling toward distant village with red-roofed houses, green fields${CARD_SUFFIX}` },
  { key: 'wands_11', name: 'Page of Wands', arcana: 'minor', suit: 'wands', number: 11, defaultPrompt: `${CARD_PREFIX} A young page in yellow tunic decorated with salamanders, holding tall wand and gazing at sprouting leaves, desert with pyramids in background${CARD_SUFFIX}` },
  { key: 'wands_12', name: 'Knight of Wands', arcana: 'minor', suit: 'wands', number: 12, defaultPrompt: `${CARD_PREFIX} An armored knight on rearing chestnut horse, holding raised wand, yellow tunic with salamanders, red plume on helmet, desert landscape with pyramids${CARD_SUFFIX}` },
  { key: 'wands_13', name: 'Queen of Wands', arcana: 'minor', suit: 'wands', number: 13, defaultPrompt: `${CARD_PREFIX} A confident queen seated on throne decorated with lions and sunflowers, holding tall wand in right hand and sunflower in left, black cat at feet, yellow robe${CARD_SUFFIX}` },
  { key: 'wands_14', name: 'King of Wands', arcana: 'minor', suit: 'wands', number: 14, defaultPrompt: `${CARD_PREFIX} A commanding king seated on throne carved with lions and salamanders, holding living wand, wearing yellow robe over armor, small salamander at feet${CARD_SUFFIX}` },
]

// Minor Arcana - Cups (Water, Emotions, Relationships)
export const CUPS_SUIT: TarotCard[] = [
  { key: 'cups_01', name: 'Ace of Cups', arcana: 'minor', suit: 'cups', number: 1, defaultPrompt: `${CARD_PREFIX} A hand emerging from clouds holding ornate golden chalice overflowing with five streams of water, white dove descending with communion wafer, water lilies on pool below${CARD_SUFFIX}` },
  { key: 'cups_02', name: 'Two of Cups', arcana: 'minor', suit: 'cups', number: 2, defaultPrompt: `${CARD_PREFIX} A young man and woman facing each other exchanging golden cups, winged lion head above caduceus between them, pledging vows${CARD_SUFFIX}` },
  { key: 'cups_03', name: 'Three of Cups', arcana: 'minor', suit: 'cups', number: 3, defaultPrompt: `${CARD_PREFIX} Three maidens in flowing robes dancing in circle raising golden cups high, surrounded by pumpkins, grapes and harvest fruits, joyful celebration${CARD_SUFFIX}` },
  { key: 'cups_04', name: 'Four of Cups', arcana: 'minor', suit: 'cups', number: 4, defaultPrompt: `${CARD_PREFIX} A young man sitting cross-legged under tree with arms folded, three cups on grass before him, hand from cloud offering fourth cup which he ignores${CARD_SUFFIX}` },
  { key: 'cups_05', name: 'Five of Cups', arcana: 'minor', suit: 'cups', number: 5, defaultPrompt: `${CARD_PREFIX} A cloaked figure in black facing three spilled cups, two full cups standing behind unnoticed, bridge over river leading to castle in background${CARD_SUFFIX}` },
  { key: 'cups_06', name: 'Six of Cups', arcana: 'minor', suit: 'cups', number: 6, defaultPrompt: `${CARD_PREFIX} An older child offering cup filled with white flowers to younger child in old village square, six cups with white flowers, guard walking away in background${CARD_SUFFIX}` },
  { key: 'cups_07', name: 'Seven of Cups', arcana: 'minor', suit: 'cups', number: 7, defaultPrompt: `${CARD_PREFIX} A dark silhouette figure facing seven floating cups in swirling clouds, each containing vision: castle, jewels, laurel wreath, dragon, veiled figure, snake, glowing figure${CARD_SUFFIX}` },
  { key: 'cups_08', name: 'Eight of Cups', arcana: 'minor', suit: 'cups', number: 8, defaultPrompt: `${CARD_PREFIX} A cloaked figure with walking staff leaving eight neatly stacked cups behind, walking toward distant mountains under eclipsed moon, marshy ground${CARD_SUFFIX}` },
  { key: 'cups_09', name: 'Nine of Cups', arcana: 'minor', suit: 'cups', number: 9, defaultPrompt: `${CARD_PREFIX} A well-fed prosperous man seated on wooden bench before curved shelf displaying nine golden cups, arms crossed contentedly, satisfied smile${CARD_SUFFIX}` },
  { key: 'cups_10', name: 'Ten of Cups', arcana: 'minor', suit: 'cups', number: 10, defaultPrompt: `${CARD_PREFIX} A couple with arms raised toward rainbow arc of ten cups in sky, two children dancing beside them, cottage and trees in peaceful countryside${CARD_SUFFIX}` },
  { key: 'cups_11', name: 'Page of Cups', arcana: 'minor', suit: 'cups', number: 11, defaultPrompt: `${CARD_PREFIX} A young page in blue floral tunic holding golden cup, small fish emerging from cup as if speaking to him, calm sea behind${CARD_SUFFIX}` },
  { key: 'cups_12', name: 'Knight of Cups', arcana: 'minor', suit: 'cups', number: 12, defaultPrompt: `${CARD_PREFIX} A romantic knight on calm white horse holding golden cup before him, wearing winged helmet, river flowing past, peaceful landscape${CARD_SUFFIX}` },
  { key: 'cups_13', name: 'Queen of Cups', arcana: 'minor', suit: 'cups', number: 13, defaultPrompt: `${CARD_PREFIX} A contemplative queen on ornate throne at waters edge holding elaborate covered chalice with angel handles, gazing into cup, shells and pebbles at feet${CARD_SUFFIX}` },
  { key: 'cups_14', name: 'King of Cups', arcana: 'minor', suit: 'cups', number: 14, defaultPrompt: `${CARD_PREFIX} A composed king on throne floating on turbulent sea, holding cup in right hand and scepter in left, fish jumping and ship sailing in background${CARD_SUFFIX}` },
]

// Minor Arcana - Swords (Air, Intellect, Conflict)
export const SWORDS_SUIT: TarotCard[] = [
  { key: 'swords_01', name: 'Ace of Swords', arcana: 'minor', suit: 'swords', number: 1, defaultPrompt: `${CARD_PREFIX} A hand emerging from clouds gripping upright double-edged sword piercing golden crown with laurel and olive branches, jagged grey mountains below${CARD_SUFFIX}` },
  { key: 'swords_02', name: 'Two of Swords', arcana: 'minor', suit: 'swords', number: 2, defaultPrompt: `${CARD_PREFIX} A blindfolded woman in white robe seated on stone bench, holding two crossed swords balanced on shoulders, crescent moon over calm sea with rocks${CARD_SUFFIX}` },
  { key: 'swords_03', name: 'Three of Swords', arcana: 'minor', suit: 'swords', number: 3, defaultPrompt: `${CARD_PREFIX} A red heart pierced by three swords at angles, heavy grey storm clouds behind, rain falling, no figures present${CARD_SUFFIX}` },
  { key: 'swords_04', name: 'Four of Swords', arcana: 'minor', suit: 'swords', number: 4, defaultPrompt: `${CARD_PREFIX} A knight effigy lying in repose on stone tomb in church, hands pressed together in prayer, three swords hanging on wall above, one sword beneath${CARD_SUFFIX}` },
  { key: 'swords_05', name: 'Five of Swords', arcana: 'minor', suit: 'swords', number: 5, defaultPrompt: `${CARD_PREFIX} A smirking figure holding three collected swords watching two defeated figures walk away leaving two swords behind, jagged stormy clouds and choppy sea${CARD_SUFFIX}` },
  { key: 'swords_06', name: 'Six of Swords', arcana: 'minor', suit: 'swords', number: 6, defaultPrompt: `${CARD_PREFIX} A ferryman poling flat boat carrying huddled cloaked woman and child, six swords standing upright in bow, crossing from rough to calm water${CARD_SUFFIX}` },
  { key: 'swords_07', name: 'Seven of Swords', arcana: 'minor', suit: 'swords', number: 7, defaultPrompt: `${CARD_PREFIX} A figure in red cap tiptoeing away from military camp carrying five swords awkwardly, looking back, two swords left standing in ground behind${CARD_SUFFIX}` },
  { key: 'swords_08', name: 'Eight of Swords', arcana: 'minor', suit: 'swords', number: 8, defaultPrompt: `${CARD_PREFIX} A bound and blindfolded woman in red dress standing in muddy water surrounded by eight upright swords forming loose cage, castle on cliff in distance${CARD_SUFFIX}` },
  { key: 'swords_09', name: 'Nine of Swords', arcana: 'minor', suit: 'swords', number: 9, defaultPrompt: `${CARD_PREFIX} A figure sitting up in bed at night with face in hands in despair, nine swords mounted horizontally on dark wall behind, quilt with roses and zodiac${CARD_SUFFIX}` },
  { key: 'swords_10', name: 'Ten of Swords', arcana: 'minor', suit: 'swords', number: 10, defaultPrompt: `${CARD_PREFIX} A figure lying face down on ground with ten swords stabbed into back, black sky above but golden dawn breaking on horizon over calm water${CARD_SUFFIX}` },
  { key: 'swords_11', name: 'Page of Swords', arcana: 'minor', suit: 'swords', number: 11, defaultPrompt: `${CARD_PREFIX} A young page standing on rocky ground holding raised sword ready, looking over shoulder alertly, wind blowing hair and clouds, birds flying${CARD_SUFFIX}` },
  { key: 'swords_12', name: 'Knight of Swords', arcana: 'minor', suit: 'swords', number: 12, defaultPrompt: `${CARD_PREFIX} An armored knight on charging white horse with raised sword, red cape flying, stormy wind-torn clouds, butterflies on armor, trees bent by wind${CARD_SUFFIX}` },
  { key: 'swords_13', name: 'Queen of Swords', arcana: 'minor', suit: 'swords', number: 13, defaultPrompt: `${CARD_PREFIX} A stern-faced queen seated on stone throne decorated with butterflies, holding upright sword in right hand, left hand raised, one bird flying in cloudy sky${CARD_SUFFIX}` },
  { key: 'swords_14', name: 'King of Swords', arcana: 'minor', suit: 'swords', number: 14, defaultPrompt: `${CARD_PREFIX} An authoritative king seated on throne carved with butterflies and sylphs, holding upright sword in right hand, purple robe, two birds flying in sky${CARD_SUFFIX}` },
]

// Minor Arcana - Pentacles (Earth, Material, Practical)
export const PENTACLES_SUIT: TarotCard[] = [
  { key: 'pentacles_01', name: 'Ace of Pentacles', arcana: 'minor', suit: 'pentacles', number: 1, defaultPrompt: `${CARD_PREFIX} A hand emerging from clouds holding large golden pentacle with five-pointed star, lush garden with flowering hedge archway below, path leading to distant mountains${CARD_SUFFIX}` },
  { key: 'pentacles_02', name: 'Two of Pentacles', arcana: 'minor', suit: 'pentacles', number: 2, defaultPrompt: `${CARD_PREFIX} A young man in red cap and motley dancing while juggling two pentacles connected by green infinity ribbon, two ships on high rolling waves behind${CARD_SUFFIX}` },
  { key: 'pentacles_03', name: 'Three of Pentacles', arcana: 'minor', suit: 'pentacles', number: 3, defaultPrompt: `${CARD_PREFIX} A young sculptor on bench working on stone arch in cathedral, monk and architect reviewing plans beside him, three pentacles carved in arch above${CARD_SUFFIX}` },
  { key: 'pentacles_04', name: 'Four of Pentacles', arcana: 'minor', suit: 'pentacles', number: 4, defaultPrompt: `${CARD_PREFIX} A crowned figure seated on stone cube hugging golden pentacle to chest, one pentacle balanced on crown, one under each foot, city skyline behind${CARD_SUFFIX}` },
  { key: 'pentacles_05', name: 'Five of Pentacles', arcana: 'minor', suit: 'pentacles', number: 5, defaultPrompt: `${CARD_PREFIX} Two ragged figures trudging through snow past illuminated stained glass church window showing five golden pentacles, one on crutches, barefoot in cold${CARD_SUFFIX}` },
  { key: 'pentacles_06', name: 'Six of Pentacles', arcana: 'minor', suit: 'pentacles', number: 6, defaultPrompt: `${CARD_PREFIX} A wealthy merchant in red robe holding balanced scales, giving coins to two kneeling beggars, six golden pentacles floating around him${CARD_SUFFIX}` },
  { key: 'pentacles_07', name: 'Seven of Pentacles', arcana: 'minor', suit: 'pentacles', number: 7, defaultPrompt: `${CARD_PREFIX} A young farmer leaning on hoe contemplating seven pentacles growing on green leafy vine, considering whether to continue or harvest${CARD_SUFFIX}` },
  { key: 'pentacles_08', name: 'Eight of Pentacles', arcana: 'minor', suit: 'pentacles', number: 8, defaultPrompt: `${CARD_PREFIX} A craftsman at workbench diligently carving pentacle with hammer and chisel, six finished pentacles displayed on post, one in progress, one at feet${CARD_SUFFIX}` },
  { key: 'pentacles_09', name: 'Nine of Pentacles', arcana: 'minor', suit: 'pentacles', number: 9, defaultPrompt: `${CARD_PREFIX} An elegant woman in flowing golden robe standing alone in abundant vineyard, hooded falcon perched on gloved hand, nine pentacles on grapevines, manor house behind${CARD_SUFFIX}` },
  { key: 'pentacles_10', name: 'Ten of Pentacles', arcana: 'minor', suit: 'pentacles', number: 10, defaultPrompt: `${CARD_PREFIX} An elderly patriarch in richly patterned robe seated under archway with two white dogs, family with child nearby, ten pentacles arranged in Tree of Life pattern, castle walls${CARD_SUFFIX}` },
  { key: 'pentacles_11', name: 'Page of Pentacles', arcana: 'minor', suit: 'pentacles', number: 11, defaultPrompt: `${CARD_PREFIX} A studious young page in green tunic standing in blooming field gazing intently at golden pentacle held up in both hands, trees and plowed earth behind${CARD_SUFFIX}` },
  { key: 'pentacles_12', name: 'Knight of Pentacles', arcana: 'minor', suit: 'pentacles', number: 12, defaultPrompt: `${CARD_PREFIX} A patient knight in dark armor on heavy stationary black horse, holding golden pentacle and gazing at it, plowed field and oak leaves on helmet${CARD_SUFFIX}` },
  { key: 'pentacles_13', name: 'Queen of Pentacles', arcana: 'minor', suit: 'pentacles', number: 13, defaultPrompt: `${CARD_PREFIX} A nurturing queen seated on throne carved with fruit and cherubs in lush garden bower, gazing at golden pentacle in lap, rabbit at feet, roses and greenery${CARD_SUFFIX}` },
  { key: 'pentacles_14', name: 'King of Pentacles', arcana: 'minor', suit: 'pentacles', number: 14, defaultPrompt: `${CARD_PREFIX} A prosperous bearded king in rich robes on throne carved with bull heads, holding scepter and golden pentacle, castle courtyard with grapevines, armor at feet${CARD_SUFFIX}` },
]

// Complete deck
export const FULL_TAROT_DECK: TarotCard[] = [
  ...MAJOR_ARCANA,
  ...WANDS_SUIT,
  ...CUPS_SUIT,
  ...SWORDS_SUIT,
  ...PENTACLES_SUIT,
]

// Helper functions
export function getCardByKey(key: string): TarotCard | undefined {
  return FULL_TAROT_DECK.find(card => card.key === key)
}

export function getMajorArcana(): TarotCard[] {
  return MAJOR_ARCANA
}

export function getMinorArcana(): TarotCard[] {
  return [...WANDS_SUIT, ...CUPS_SUIT, ...SWORDS_SUIT, ...PENTACLES_SUIT]
}

export function getSuitCards(suit: 'wands' | 'cups' | 'swords' | 'pentacles'): TarotCard[] {
  switch (suit) {
    case 'wands': return WANDS_SUIT
    case 'cups': return CUPS_SUIT
    case 'swords': return SWORDS_SUIT
    case 'pentacles': return PENTACLES_SUIT
  }
}
