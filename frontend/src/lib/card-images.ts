// Configuration des images de cartes personnalisées
export const CARD_IMAGES = {
  // Cartes spéciales
  SKULL_KING: '/images/cards/special/skullking.png',
  TIGRESS: '/images/cards/special/tigress.png',
  TIGRESS_PIRATE: '/images/cards/special/tigress-pirate.png',
  TIGRESS_ESCAPE: '/images/cards/special/tigress-escape.png',
  ESCAPE: '/images/cards/special/escape.png',
  
  // Sirènes (2 images différentes)
  MERMAID_1: '/images/cards/mermaids/mermaid1.png',
  MERMAID_2: '/images/cards/mermaids/mermaid2.png',
  
  // Pirates (5 images différentes)
  PIRATE_1: '/images/cards/pirates/pirate1.png',
  PIRATE_2: '/images/cards/pirates/pirate2.png',
  PIRATE_3: '/images/cards/pirates/pirate3.png',
  PIRATE_4: '/images/cards/pirates/pirate4.png',
  PIRATE_5: '/images/cards/pirates/pirate5.png',
  
  // Couleurs des cartes numériques (1 image par couleur)
  SUITS: {
    BLACK: '/images/cards/suits/black.png',
    GREEN: '/images/cards/suits/green.png',
    PURPLE: '/images/cards/suits/purple.png',
    YELLOW: '/images/cards/suits/yellow.png'
  },
  
  // Image par défaut
  DEFAULT: '/images/cards/special/default.png'
} as const;

// Types pour la configuration
export type CardImagePath = typeof CARD_IMAGES[keyof typeof CARD_IMAGES];
export type SuitImagePath = typeof CARD_IMAGES.SUITS[keyof typeof CARD_IMAGES.SUITS];
