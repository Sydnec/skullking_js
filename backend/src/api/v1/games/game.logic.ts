
// Game Rules & Logic

export function getRoundSequence(fmt: string): number[] {
    switch (fmt) {
      case 'FAST': return [1, 2, 3, 4, 5];
      case 'BARRAGE_SHOT': return [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      case 'WHIRLWIND': return [9, 7, 5, 3, 1];
      case 'BEDTIME': return [1];
      case 'CLASSIC':
      default: return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
}

export function determineLeadSuit(plays: any[]): string | null {
    if (!plays || plays.length === 0) return null;
    
    for (const p of plays) {
        // Tigress playing as Escape counts as Escape
        const isEscape = p.handCard.card.cardType === 'ESCAPE' || 
                         (p.handCard.card.cardType === 'TIGRESS' && p.playChoice === 'ESCAPE');
        
        if (!isEscape) {
            // First non-escape card sets the suit IF it is a number card.
            // Special cards (Pirate, Mermaid, SK, Kraken, etc.) do NOT set a suit (no suit to follow).
            if (p.handCard.card.cardType === 'NUMBER') {
                return p.handCard.card.suit;
            }
            // If first non-escape is a special card (e.g. Pirate), then there is NO lead suit.
            return null;
        }
    }
    return null;
}

export function determineTrickWinner(plays: any[]): number {
    if (!plays || plays.length === 0) return -1;
    
    // 1. Check for Skull King
    const skIndex = plays.findIndex(p => p.handCard.card.cardType === 'SKULLKING');
    // 2. Check for Mermaid
    const mermaidIndices = plays.map((p, i) => p.handCard.card.cardType === 'MERMAID' ? i : -1).filter(i => i !== -1);
    
    // Skull King rule: SK beats everything EXCEPT Mermaid
    if (skIndex !== -1) {
        if (mermaidIndices.length > 0) {
            // Mermaid beats Skull King
            // Which mermaid? Usually the first one played beats SK? 
            // Standard rule: "The Mermaid wins the trick... If the Skull King is in the trick, the Mermaid wins."
            // If multiple Mermaids, usually first one wins? Or highest? Mermaid has no value.
            // Let's assume first Mermaid played wins against SK.
            return mermaidIndices[0];
        }
        return skIndex;
    }

    // 3. Check for Pirates (including Tigress as Pirate)
    const pirateIndex = plays.findIndex(p => 
        p.handCard.card.cardType === 'PIRATE' || 
        (p.handCard.card.cardType === 'TIGRESS' && p.playChoice === 'PIRATE')
    );
    if (pirateIndex !== -1) {
        // First pirate wins
        return pirateIndex;
    }

    // 4. Check for Mermaids (if no SK, no Pirate)
    if (mermaidIndices.length > 0) {
        return mermaidIndices[0];
    }

    // 5. Standard Suits and Numbers
    const leadSuit = determineLeadSuit(plays);

    let bestIndex = -1;
    let bestVal = -1; 
    
    plays.forEach((p, idx) => {
        const card = p.handCard.card;
        const isEscape = card.cardType === 'ESCAPE' || (card.cardType === 'TIGRESS' && p.playChoice === 'ESCAPE');

        if (isEscape) return; 
        
        // Only numbered cards are left here (SK, Pirate, Mermaid handled above)
        // Wait, what about LOOT, KRAKEN, WHITEWHALE?
        // Let's stick to basic set for now, avoiding breaking.
        
        let val = 0;
        
        if (card.suit === 'BLACK') {
            val = 200 + (card.rank || 0); // Trump
        } else if (card.suit === leadSuit) {
            val = 100 + (card.rank || 0); // Lead suit
        } else {
            val = (card.rank || 0); // Off suit
        }

        if (val > bestVal) {
            bestVal = val;
            bestIndex = idx;
        }
    });

    if (bestIndex !== -1) return bestIndex;
    
    // If all escapes? First player wins.
    return 0; 
}

export function calculateRoundScores(round: any, players: any[]): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (const p of players) {
        const prediction = round.predictions.find((pred: any) => pred.playerId === p.id)?.predicted ?? 0;
        const tricksWon = round.tricks.filter((t: any) => t.winnerId === p.id).length;
        
        let score = 0;
        if (prediction === tricksWon) {
            if (prediction === 0) {
                score = round.number * 10;
            } else {
                score = prediction * 20;
            }
        } else {
            const diff = Math.abs(prediction - tricksWon);
            score = diff * -10;
        }
        scores[p.id] = score;
    }
    return scores;
}
