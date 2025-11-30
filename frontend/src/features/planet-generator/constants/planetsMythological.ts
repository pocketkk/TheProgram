/**
 * Mythological Planet Prompts
 *
 * Roman/Greek deity personifications for each celestial body.
 * Features classical mythology, symbolic attributes, and divine imagery
 * instead of astronomical depictions.
 */

// Base prompt prefix for mythological consistency
const MYTH_PREFIX = 'Classical mythology illustration, divine deity portrait, Renaissance painting style, dramatic lighting:'

// Base suffix for mythological art style
const MYTH_SUFFIX = ', oil painting aesthetic, rich colors, celestial background with subtle cosmic elements, no text or labels'

/**
 * Mythological tradition prompts mapped by planet key
 */
export const MYTHOLOGICAL_PROMPTS: Record<string, string> = {
  // Personal Planets
  sun: `${MYTH_PREFIX} Sol/Helios the sun god, radiant golden-haired youth with crown of sunrays, driving golden chariot pulled by four fire-breathing horses across the sky, trailing light${MYTH_SUFFIX}`,

  moon: `${MYTH_PREFIX} Luna/Selene the moon goddess, ethereal silver-haired woman in flowing white robes, crescent moon diadem, driving silver chariot through night sky, serene luminous face${MYTH_SUFFIX}`,

  mercury: `${MYTH_PREFIX} Mercury/Hermes the messenger god, youthful athletic figure with winged sandals (talaria) and winged helmet (petasos), holding caduceus staff with entwined serpents, swift and clever${MYTH_SUFFIX}`,

  venus: `${MYTH_PREFIX} Venus/Aphrodite goddess of love and beauty, emerging from seafoam on scallop shell, golden hair flowing, surrounded by roses and doves, embodiment of feminine grace${MYTH_SUFFIX}`,

  mars: `${MYTH_PREFIX} Mars/Ares god of war, powerful armored warrior with red-plumed helmet, holding spear and shield, fierce expression, standing among battlefield symbols, vultures overhead${MYTH_SUFFIX}`,

  // Social Planets
  jupiter: `${MYTH_PREFIX} Jupiter/Zeus king of the gods, majestic bearded figure enthroned on clouds, holding lightning bolt and eagle-topped scepter, eagle companion, commanding cosmic authority${MYTH_SUFFIX}`,

  saturn: `${MYTH_PREFIX} Saturn/Kronos god of time and harvest, elderly bearded figure with hourglass and sickle/scythe, father time aspect, draped in dark robes, contemplating cycles of ages${MYTH_SUFFIX}`,

  // Transpersonal Planets
  uranus: `${MYTH_PREFIX} Uranus/Ouranos primordial sky god, vast cosmic figure arching over earth, body filled with stars, ancient and eternal, representing the heavens themselves${MYTH_SUFFIX}`,

  neptune: `${MYTH_PREFIX} Neptune/Poseidon god of the seas, powerful bearded figure rising from ocean waves, holding trident, crowned with seaweed, dolphins and sea creatures attending, tempest power${MYTH_SUFFIX}`,

  pluto: `${MYTH_PREFIX} Pluto/Hades god of the underworld, dark-robed regal figure on obsidian throne, three-headed dog Cerberus at feet, pomegranate in hand, realm of shadows and souls${MYTH_SUFFIX}`,

  // Points & Asteroids
  chiron: `${MYTH_PREFIX} Chiron the wounded healer, noble centaur (half-man half-horse) teaching from a cave, holding herbs and medical instruments, arrow wound visible, wise and compassionate${MYTH_SUFFIX}`,

  north_node: `${MYTH_PREFIX} The Moirai/Fates figure of Clotho spinning the thread of destiny, glowing golden thread ascending toward future, symbols of potential and dharmic path${MYTH_SUFFIX}`,

  south_node: `${MYTH_PREFIX} The Moirai/Fates figure of Atropos with shears, silver thread descending into past, symbols of karma and ancestral memory, releasing what has been${MYTH_SUFFIX}`,

  lilith: `${MYTH_PREFIX} Lilith as dark goddess figure, wild-haired woman with owl wings in moonless night, serpent companion, embodiment of primal feminine power, unbound and sovereign${MYTH_SUFFIX}`,

  pof: `${MYTH_PREFIX} Fortuna goddess of fortune and luck, blindfolded woman with great wheel of fate, cornucopia of abundance, rudder to steer destiny, balanced between providence and chance${MYTH_SUFFIX}`,
}

export default MYTHOLOGICAL_PROMPTS
