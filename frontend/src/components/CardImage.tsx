import Image from 'next/image';
import { Card } from '@/types/skull-king';
import { CARD_IMAGES } from '@/lib/card-images';

interface CardImageProps {
  card: Card;
  className?: string;
  onClick?: () => void;
  isPlayable?: boolean;
  tigressChoice?: 'PIRATE' | 'ESCAPE'; // Pour afficher la bonne image selon le choix de la tigresse
}

export default function CardImage({ card, className = '', onClick, isPlayable = false, tigressChoice }: CardImageProps) {
  const getCardImagePath = (card: Card): string => {
    switch (card.type) {
      case 'SKULL_KING':
        return CARD_IMAGES.SKULL_KING;
      
      case 'TIGRESS':
        // Afficher l'image appropriée selon le choix de la tigresse
        if (tigressChoice === 'PIRATE') {
          return CARD_IMAGES.TIGRESS_PIRATE;
        } else if (tigressChoice === 'ESCAPE') {
          return CARD_IMAGES.TIGRESS_ESCAPE;
        } else {
          // Image par défaut de la tigresse (dans la main du joueur)
          return CARD_IMAGES.TIGRESS;
        }
      
      case 'ESCAPE':
        return CARD_IMAGES.ESCAPE;
      
      case 'MERMAID':
        // 2 sirènes différentes basées sur l'ID
        if (card.id === 'MERMAID_1') {
          return CARD_IMAGES.MERMAID_1;
        } else {
          return CARD_IMAGES.MERMAID_2;
        }
      
      case 'PIRATE':
        // 5 pirates différents basés sur l'ID
        const pirateNumber = card.id.split('_')[1] || '1';
        const pirateKey = `PIRATE_${pirateNumber}` as 'PIRATE_1' | 'PIRATE_2' | 'PIRATE_3' | 'PIRATE_4' | 'PIRATE_5';
        return CARD_IMAGES[pirateKey] || CARD_IMAGES.DEFAULT;
      
      case 'NUMBER':
        // Cartes de couleur basées sur la couleur
        return CARD_IMAGES.SUITS[card.suit!] || CARD_IMAGES.DEFAULT;
      
      default:
        return CARD_IMAGES.DEFAULT;
    }
  };

  const getCardAltText = (card: Card): string => {
    if (card.type === 'NUMBER') {
      return `${card.value} of ${card.suit}`;
    }
    return card.name;
  };

  const cardImagePath = getCardImagePath(card);
  const altText = getCardAltText(card);

  return (
    <div 
      className={`
        relative group cursor-pointer transition-all duration-200
        ${isPlayable ? 'hover:scale-105 hover:shadow-lg' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="relative w-full h-full">
        <Image
          src={cardImagePath}
          alt={altText}
          width={112}
          height={160}
          className="object-cover rounded-lg shadow-md w-full h-full"
          sizes="(max-width: 768px) 100px, 150px"
        />
        
        {/* Numéros pour les cartes numériques - haut gauche et bas droite */}
        {card.type === 'NUMBER' && (
          <>
            {/* Numéro en haut à gauche */}
            <div className="absolute top-0 left-0">
              <span className={`font-bold text-sm px-1 py-0.5 rounded ${
                card.suit === 'BLACK' || card.suit === 'PURPLE' ? 'text-white' :
                'text-black'
              }`}>
                {card.value}
              </span>
            </div>
            
            {/* Numéro en bas à droite (retourné) */}
            <div className="absolute bottom-0 right-0 transform rotate-180">
              <span className={`font-bold text-sm px-1 py-0.5 rounded ${
                card.suit === 'BLACK' || card.suit === 'PURPLE' ? 'text-white' :
                'text-black'
              }`}>  
                {card.value}
              </span>
            </div>
          </>
        )}

        {/* Emojis pour les cartes spéciales - haut gauche et bas droite */}
        {card.type !== 'NUMBER' && (
          <>
            {/* Emoji en haut à gauche */}
            <div className="absolute top-0 left-0">
              <span className="text-lg px-1 py-0.5 filter">
                {card.type === 'SKULL_KING' && '💀'}
                {card.type === 'PIRATE' && '🏴‍☠️'}
                {card.type === 'MERMAID' && '🧜‍♀️'}
                {card.type === 'TIGRESS' && '🐯'}
                {card.type === 'ESCAPE' && '🏃'}
              </span>
            </div>
            
            {/* Emoji en bas à droite (retourné) */}
            <div className="absolute bottom-0 right-0 transform rotate-180">
              <span className="text-lg px-1 py-0.5 filter">
                {card.type === 'SKULL_KING' && '💀'}
                {card.type === 'PIRATE' && '🏴‍☠️'}
                {card.type === 'MERMAID' && '🧜‍♀️'}
                {card.type === 'TIGRESS' && '🐯'}
                {card.type === 'ESCAPE' && '🏃'}
              </span>
            </div>
          </>
        )}
        
        {/* Effet de survol pour les cartes jouables */}
        {isPlayable && (
          <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-20 rounded-lg transition-all duration-200" />
        )}
      </div>
    </div>
  );
}
