/**
 * Thoth Tarot Prompts (Aleister Crowley / Lady Frieda Harris)
 *
 * The Thoth deck features Egyptian symbolism, Kabbalistic correspondences,
 * astrological associations, geometric precision, and vibrant colors.
 *
 * Key differences from RWS:
 * - VIII Justice → Adjustment
 * - X Wheel of Fortune → Fortune
 * - XI Strength → Lust
 * - XIV Temperance → Art
 * - XX Judgement → The Aeon
 * - XXI The World → The Universe
 */

// Base prompt prefix for Thoth-style consistency
const THOTH_PREFIX = 'Tarot card illustration in Thoth deck style, Egyptian and Kabbalistic symbolism, geometric precision, vibrant saturated colors:'

// Base suffix for Thoth art style
const THOTH_SUFFIX = ', art deco influence, projective synthetic geometry, mystical symbolism, rich occult imagery, no text or labels'

/**
 * Thoth tradition prompts mapped by card key
 */
export const THOTH_PROMPTS: Record<string, string> = {
  // Major Arcana
  major_00: `${THOTH_PREFIX} The Fool as a green-skinned figure leaping joyfully in spiral of cosmic energy, tiger biting leg, crocodile below, flowers and butterflies spiraling, three-headed Cerberus, dove and vulture${THOTH_SUFFIX}`,

  major_01: `${THOTH_PREFIX} The Magus surrounded by swirling magical implements (wand, cup, sword, disk, stylus, scroll, winged egg), mercurial figure juggling cosmic forces, figure-eight infinity symbol, ape of Thoth${THOTH_SUFFIX}`,

  major_02: `${THOTH_PREFIX} The Priestess seated with bow of Artemis, flowing blue robes becoming crystalline geometry, camel at feet, veils of light, seed pods and fruits, spiral of lunar energy${THOTH_SUFFIX}`,

  major_03: `${THOTH_PREFIX} The Empress as golden-crowned goddess with lotus scepter, pelican feeding young, white eagle, sparrows flying, blue flames and moons, seated on geometric throne of nature${THOTH_SUFFIX}`,

  major_04: `${THOTH_PREFIX} The Emperor as fiery red armored figure with ram-headed throne, fleur-de-lis scepter, orb with Maltese cross, twin eagles, bees, geometric rays of solar power${THOTH_SUFFIX}`,

  major_05: `${THOTH_PREFIX} The Hierophant as bull-faced figure with triple wand and five-pointed star, woman with sword before him, serpent, elephant, nine nails, geometric pentagram structure${THOTH_SUFFIX}`,

  major_06: `${THOTH_PREFIX} The Lovers with hooded figure presiding over alchemical marriage, twins embracing, black and white children below, lance and grail, swords crossed above serpent-entwined egg, winged Orphic egg${THOTH_SUFFIX}`,

  major_07: `${THOTH_PREFIX} The Chariot as amber-armored knight in crab-shell chariot, four sphinx (angel, eagle, human, lion) pulling vehicle, Holy Grail held aloft, geometric wheels and canopy${THOTH_SUFFIX}`,

  major_08: `${THOTH_PREFIX} Adjustment as masked Egyptian goddess Maat holding scales and sword, geometric diamond shape, feather of truth, balanced alpha and omega symbols, blue and green geometries${THOTH_SUFFIX}`,

  major_09: `${THOTH_PREFIX} The Hermit cloaked in red holding lantern containing sun, wheat grain, spermatozoon serpent coiled around him, Orphic egg at center, Cerberus three-headed dog${THOTH_SUFFIX}`,

  major_10: `${THOTH_PREFIX} Fortune as ten-spoked wheel with sphinx, cynocephalus ape, and typhon, three figures rotating eternally, lightning bolt, geometric cosmic machinery, stars in motion${THOTH_SUFFIX}`,

  major_11: `${THOTH_PREFIX} Lust as scarlet woman riding seven-headed lion beast, holding Holy Grail with fire, serpent coiled around her, intoxicated divine ecstasy, flames and geometric passion${THOTH_SUFFIX}`,

  major_12: `${THOTH_PREFIX} The Hanged Man as blue-green figure suspended from ankh cross, serpent coiled at waist, nails through feet, geometric grid background, hair becoming roots${THOTH_SUFFIX}`,

  major_13: `${THOTH_PREFIX} Death as skeleton with crowned skull wielding scythe, dancing in bubbles of new life, eagle, scorpion, serpent transforming, fish swimming upward, geometric decay and rebirth${THOTH_SUFFIX}`,

  major_14: `${THOTH_PREFIX} Art as androgynous alchemist mixing fire and water between two vessels, black and white eagle with lion heads, bees, rainbow, cauldron of transformation, geometric alchemical union${THOTH_SUFFIX}`,

  major_15: `${THOTH_PREFIX} The Devil as goat of Mendes (Pan) with third eye, two serpent-staff figures below, testicles as globes, wand of chief adept, geometric spiral horns${THOTH_SUFFIX}`,

  major_16: `${THOTH_PREFIX} The Tower with mouth of Hades belching flames, geometric fortress shattering, eye of Shiva, dove and serpent escaping, falling figures, crystalline destruction${THOTH_SUFFIX}`,

  major_17: `${THOTH_PREFIX} The Star as Nuit arching over creation, pouring water from two vessels, seven-pointed stars, sphere of Chokmah, geometric spirals of hope and cosmic truth${THOTH_SUFFIX}`,

  major_18: `${THOTH_PREFIX} The Moon with scarab pushing sun through darkness, jackals howling, dark gateway towers, path between drops of blood and tears, geometric lunar madness${THOTH_SUFFIX}`,

  major_19: `${THOTH_PREFIX} The Sun with green zodiac circle, twins dancing, rose cross at center, twelve zodiacal rays, butterfly transformation, geometric solar glory${THOTH_SUFFIX}`,

  major_20: `${THOTH_PREFIX} The Aeon showing Nuit arched over Hadit point, Horus as seated child, Ra-Hoor-Khuit falcon-headed, Hebrew letter Shin of fire, geometric new age dawning${THOTH_SUFFIX}`,

  major_21: `${THOTH_PREFIX} The Universe with dancing figure in cosmic oval, seventy-two-circle serpent, eye of Horus, four elemental kerubs in corners, geometric completion and totality${THOTH_SUFFIX}`,

  // Wands (Fire)
  wands_01: `${THOTH_PREFIX} Ace of Wands as fiery torch bursting with flame, ten flames branching like tree of life, lightning from clouds, ankh-shaped scepter, geometric fire energy${THOTH_SUFFIX}`,

  wands_02: `${THOTH_PREFIX} Dominion: two crossed dorjes (thunderbolts) with flames, Tibetan scepters of power, six flames arranged geometrically, Mars in Aries fiery command${THOTH_SUFFIX}`,

  wands_03: `${THOTH_PREFIX} Virtue: three lotus wands crossing in established strength, Sun in Aries, flames of integrity, geometric stability of fire${THOTH_SUFFIX}`,

  wands_04: `${THOTH_PREFIX} Completion: four crossed wands forming perfect square, wheels turning, Venus in Aries, settled and orderly fire${THOTH_SUFFIX}`,

  wands_05: `${THOTH_PREFIX} Strife: five wands in fierce conflict pattern, phoenix heads at tips, Saturn in Leo, geometric chaos of competing flames${THOTH_SUFFIX}`,

  wands_06: `${THOTH_PREFIX} Victory: six wands in perfect lotus arrangement, flames triumphant, Jupiter in Leo, geometric balanced conquest${THOTH_SUFFIX}`,

  wands_07: `${THOTH_PREFIX} Valour: six wands defending against one crude club, Mars in Leo, courageous opposition, geometric battle stance${THOTH_SUFFIX}`,

  wands_08: `${THOTH_PREFIX} Swiftness: eight wands as electric arrows racing through rainbow, Mercury in Sagittarius, lightning bolts of communication, geometric swift motion${THOTH_SUFFIX}`,

  wands_09: `${THOTH_PREFIX} Strength: eight wands guarding central moon-arrow, Sun and Moon joined, great power in reserve, geometric fortress of fire${THOTH_SUFFIX}`,

  wands_10: `${THOTH_PREFIX} Oppression: eight wands crushed by two heavy dorjes, Saturn in Sagittarius, fire overwhelmed, geometric collapse${THOTH_SUFFIX}`,

  wands_11: `${THOTH_PREFIX} Princess of Wands dancing with tiger, flame-tipped wand, altar of fire, naked and joyful, geometric spirals of youthful fire${THOTH_SUFFIX}`,

  wands_12: `${THOTH_PREFIX} Prince of Wands in chariot pulled by lion, flaming torch held high, naked and triumphant, geometric chariot of fire${THOTH_SUFFIX}`,

  wands_13: `${THOTH_PREFIX} Queen of Wands enthroned with leopard, pinecone wand, flame crown, radiant and commanding, geometric throne of passion${THOTH_SUFFIX}`,

  wands_14: `${THOTH_PREFIX} Knight of Wands on black horse with flames, torch blazing, armor of fire, charging forward, geometric speed of flame${THOTH_SUFFIX}`,

  // Cups (Water)
  cups_01: `${THOTH_PREFIX} Ace of Cups as Holy Grail overflowing, lotus emerging, moon reflected, dove descending with host, geometric receptacle of love${THOTH_SUFFIX}`,

  cups_02: `${THOTH_PREFIX} Love: two cups with lotus and dolphin intertwined, Venus in Cancer, water flowing between, geometric union of hearts${THOTH_SUFFIX}`,

  cups_03: `${THOTH_PREFIX} Abundance: three pomegranate cups overflowing into lotus pond, Mercury in Cancer, generous emotional flow, geometric plenty${THOTH_SUFFIX}`,

  cups_04: `${THOTH_PREFIX} Luxury: four cups in square arrangement with lotus, Moon in Cancer, emotional refinement, geometric comfort and ease${THOTH_SUFFIX}`,

  cups_05: `${THOTH_PREFIX} Disappointment: five cups with dead lotuses, roots exposed, Mars in Scorpio, emotional loss, geometric decay${THOTH_SUFFIX}`,

  cups_06: `${THOTH_PREFIX} Pleasure: six cups in hexagram with copper stems, lotus blooming, Sun in Scorpio, harmonious emotion, geometric joy${THOTH_SUFFIX}`,

  cups_07: `${THOTH_PREFIX} Debauch: seven cups with slimy contents, Venus in Scorpio, illusory pleasures, poison lotuses, geometric corruption${THOTH_SUFFIX}`,

  cups_08: `${THOTH_PREFIX} Indolence: eight cups haphazardly arranged, dried lotuses, Saturn in Pisces, stagnant water, geometric lethargy${THOTH_SUFFIX}`,

  cups_09: `${THOTH_PREFIX} Happiness: nine cups in perfect arrangement, Jupiter in Pisces, lotus fully bloomed, water crystal clear, geometric fulfillment${THOTH_SUFFIX}`,

  cups_10: `${THOTH_PREFIX} Satiety: ten cups in Tree of Life pattern, overflowing to excess, Mars in Pisces, too much of good thing, geometric overflow${THOTH_SUFFIX}`,

  cups_11: `${THOTH_PREFIX} Princess of Cups rising from sea with lotus cup, swan, turtle, dolphin, dreamy and receptive, geometric water dance${THOTH_SUFFIX}`,

  cups_12: `${THOTH_PREFIX} Prince of Cups in chariot on water pulled by eagle, lotus cup, serpent emerging, scorpion, geometric vessel of dreams${THOTH_SUFFIX}`,

  cups_13: `${THOTH_PREFIX} Queen of Cups enthroned on water with crab claw throne, ibis, crayfish, reflection pool, geometric mirror of emotion${THOTH_SUFFIX}`,

  cups_14: `${THOTH_PREFIX} Knight of Cups on white horse emerging from sea, cup with crab, peacock, geometric wave rider${THOTH_SUFFIX}`,

  // Swords (Air)
  swords_01: `${THOTH_PREFIX} Ace of Swords as great sword piercing crown, sun and moon balanced, geometric intellect triumphant, twenty-two rays${THOTH_SUFFIX}`,

  swords_02: `${THOTH_PREFIX} Peace: two swords crossing with rose, Moon in Libra, balanced mind, blue lotus, geometric mental harmony${THOTH_SUFFIX}`,

  swords_03: `${THOTH_PREFIX} Sorrow: three swords piercing rose, Saturn in Libra, tears of intellect, broken flower, geometric anguish${THOTH_SUFFIX}`,

  swords_04: `${THOTH_PREFIX} Truce: four swords forming cross with rose at center, Jupiter in Libra, temporary peace, geometric pause${THOTH_SUFFIX}`,

  swords_05: `${THOTH_PREFIX} Defeat: five swords in inverted pentagram, Venus in Aquarius, loss and degradation, geometric failure${THOTH_SUFFIX}`,

  swords_06: `${THOTH_PREFIX} Science: six swords in hexagram formation, Mercury in Aquarius, geometric precision, intellectual triumph${THOTH_SUFFIX}`,

  swords_07: `${THOTH_PREFIX} Futility: six swords broken against larger one, Moon in Aquarius, wasted effort, geometric struggle${THOTH_SUFFIX}`,

  swords_08: `${THOTH_PREFIX} Interference: six swords tangled and blocked by two, Jupiter in Gemini, mental obstacles, geometric confusion${THOTH_SUFFIX}`,

  swords_09: `${THOTH_PREFIX} Cruelty: nine swords dripping blood, Mars in Gemini, mental anguish, rusty blades, geometric torment${THOTH_SUFFIX}`,

  swords_10: `${THOTH_PREFIX} Ruin: ten swords arranged in Tree of Death, Sun in Gemini, complete intellectual collapse, geometric destruction${THOTH_SUFFIX}`,

  swords_11: `${THOTH_PREFIX} Princess of Swords standing on clouds with raised sword, vengeful attitude, geometric air princess${THOTH_SUFFIX}`,

  swords_12: `${THOTH_PREFIX} Prince of Swords in chariot of geometric shapes, fairies pulling, sickle and sword, winged, geometric speed of thought${THOTH_SUFFIX}`,

  swords_13: `${THOTH_PREFIX} Queen of Swords enthroned on clouds, child's head severed, stern judgment, geometric severity${THOTH_SUFFIX}`,

  swords_14: `${THOTH_PREFIX} Knight of Swords charging on brown horse, three swallows, attacking pose, geometric intellectual assault${THOTH_SUFFIX}`,

  // Disks/Pentacles (Earth)
  pentacles_01: `${THOTH_PREFIX} Ace of Disks as great winged solar disk, intricate geometric pattern, roots below, angels and wheels, geometric earth manifest${THOTH_SUFFIX}`,

  pentacles_02: `${THOTH_PREFIX} Change: two pentacles connected by serpent eating tail (Ouroboros), yin yang center, Jupiter in Capricorn, geometric flux${THOTH_SUFFIX}`,

  pentacles_03: `${THOTH_PREFIX} Works: three wheels interlocking like gears, Mars in Capricorn, pyramid in background, geometric industry${THOTH_SUFFIX}`,

  pentacles_04: `${THOTH_PREFIX} Power: four pentagrams in corners of fortress, Sun in Capricorn, moat and tower, geometric earthly dominion${THOTH_SUFFIX}`,

  pentacles_05: `${THOTH_PREFIX} Worry: five disks in inverted pentagram, Mercury in Taurus, anxiety and strain, geometric pressure${THOTH_SUFFIX}`,

  pentacles_06: `${THOTH_PREFIX} Success: six disks in hexagram, rose cross at center, Moon in Taurus, material achievement, geometric fulfillment${THOTH_SUFFIX}`,

  pentacles_07: `${THOTH_PREFIX} Failure: seven disks in broken pattern, Saturn in Taurus, crops withered, geometric disappointment${THOTH_SUFFIX}`,

  pentacles_08: `${THOTH_PREFIX} Prudence: great tree with eight disks as fruit, Sun in Virgo, careful growth, geometric cultivation${THOTH_SUFFIX}`,

  pentacles_09: `${THOTH_PREFIX} Gain: nine disks in triple triangle, Venus in Virgo, material increase, geometric abundance${THOTH_SUFFIX}`,

  pentacles_10: `${THOTH_PREFIX} Wealth: ten disks in Tree of Life pattern with Mercury center, complete material success, geometric prosperity${THOTH_SUFFIX}`,

  pentacles_11: `${THOTH_PREFIX} Princess of Disks pregnant goddess with shield and staff, altar, grove, geometric earth mother${THOTH_SUFFIX}`,

  pentacles_12: `${THOTH_PREFIX} Prince of Disks in chariot pulled by bull, flowers growing, scepter with orb, geometric earth prince${THOTH_SUFFIX}`,

  pentacles_13: `${THOTH_PREFIX} Queen of Disks enthroned in desert with goat beside, holding crystal sphere, geometric earth queen${THOTH_SUFFIX}`,

  pentacles_14: `${THOTH_PREFIX} Knight of Disks on heavy workhorse, holds pentacle as shield, flail weapon, patient and enduring, geometric earth knight${THOTH_SUFFIX}`,
}

export default THOTH_PROMPTS
