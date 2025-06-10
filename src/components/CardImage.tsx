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
          fill
          className="object-cover rounded-lg shadow-md"
          sizes="(max-width: 768px) 80px, 120px"
        />
        
        {/* Overlay pour les cartes numériques avec la valeur */}
        {card.type === 'NUMBER' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white bg-opacity-90 rounded-full w-8 h-8 flex items-center justify-center text-black font-bold text-sm shadow-md">
              {card.value}
            </div>
          </div>
        )}
        
        {/* Effet de survol pour les cartes jouables */}
        {isPlayable && (
          <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-20 rounded-lg transition-all duration-200" />
        )}
      </div>
    </div>
  );
}
