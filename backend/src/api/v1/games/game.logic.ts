
// Game Rules & Logic

export function getRoundSequence(fmt: string, playerCount: number = 0): number[] {
  let seq: number[] = [];
  switch (fmt) {
    case 'FAST': seq = [1, 2, 3, 4, 5]; break;
    case 'BARRAGE_SHOT': seq = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]; break;
    case 'WHIRLWIND': seq = [9, 7, 5, 3, 1]; break;
    case 'BEDTIME': seq = [1]; break;
    case 'CLASSIC':
    default: seq = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; break;
  }

  // 8 Player Edge Case: With 8 players, standard deck (66) runs out at round 9 (8*9=72 > 66).
  // Even with expansions, usually max hand size is capped.
  // Official rule: For 8 players, rounds go up to 9 cards, then 9 cards again (or just stop at 8).
  // Simplification: Cap at math limit.
  // Standard deck (66) / 8 = 8.25. So max round 8.
  // With Loot/Extension (+14 cards? ~80). 80 / 8 = 10.
  // If we don't know deck size here, we apply the User requested rule:
  // "remplacées par des manches à 9 cartes"
  if (playerCount >= 8) {
      seq = seq.map(rs => rs > 9 ? 9 : rs);
      // Wait, user said "manches à 10 cartes sont remplacées par 9".
      // Assuming layout implies we keep same number of rounds but cap hand size.
  }
  return seq;
}

export function determineLeadSuit(plays: any[]): string | null {
    if (!plays || plays.length === 0) return null;
    
    // Check for White Whale first? If White whale is present, special cards become Escape.
    const hasWhale = plays.some(p => p.handCard.card.cardType === 'WHITEWHALE');

    for (const p of plays) {
        let type = p.handCard.card.cardType;
        const choice = p.playChoice;
        
        // Effective Type Logic
        if (type === 'TIGRESS' && choice === 'ESCAPE') type = 'ESCAPE';
        if (type === 'TIGRESS' && choice === 'PIRATE') type = 'PIRATE';
        
        // White Whale Effect: All Specials (SK, Pirate, Mermaid, Kraken, Tigress? Loot?) become Escapes.
        // Rule: "The White Whale makes all Special cards played in the trick become Escape cards."
        // Tigress is Special.
        const isSpecial = ['SKULLKING', 'PIRATE', 'MERMAID', 'KRAKEN', 'TIGRESS', 'LOOT'].includes(type);
        
        if (hasWhale && isSpecial) {
             type = 'ESCAPE';
        }

        const isEscape = type === 'ESCAPE' || type === 'WHITEWHALE'; 
        // Note: White whale itself is treated as an escape for coloring purposes (no color).
        
        if (!isEscape) {
            // First non-escape card sets the suit IF it is a number card.
            if (type === 'NUMBER') {
                return p.handCard.card.suit;
            }
            // If first non-escape is a special card (that survived the Whale check, impossible if Whale is present, but possible otherwise),
            // then there is NO lead suit.
            return null;
        }
    }
    return null;
}

// Return type extended to handle Kraken destruction
export interface TrickOutcome {
    winnerIndex: number;
    destroyed: boolean;
    destroyerIndex?: number; // Index of Kraken player
    bonusPoints?: number; // Loot bonus if won
}

export function determineTrickOutcome(plays: any[]): TrickOutcome {
    if (!plays || plays.length === 0) return { winnerIndex: -1, destroyed: false };

    // 0. Check for Kraken
    const krakenIndex = plays.findIndex(p => p.handCard.card.cardType === 'KRAKEN');
    if (krakenIndex !== -1) {
        // Kraken destroys the trick.
        return { winnerIndex: -1, destroyed: true, destroyerIndex: krakenIndex };
    }

    // 1. Check for White Whale
    const whaleIndex = plays.findIndex(p => p.handCard.card.cardType === 'WHITEWHALE');
    const hasWhale = whaleIndex !== -1;

    // Helper to get effective properties
    const getEffectiveDetails = (p: any) => {
        let type = p.handCard.card.cardType;
        const choice = p.playChoice;
        if (type === 'TIGRESS') type = (choice === 'PIRATE') ? 'PIRATE' : 'ESCAPE';
        
        if (hasWhale) {
            // All specials become Escapes
            if (['SKULLKING', 'PIRATE', 'MERMAID', 'TIGRESS', 'LOOT'].includes(type)) {
                type = 'ESCAPE';
            }
            // Whale is also treated as Escape (highest escape concept? or just escape)
            // Rule: "White Whale is considered an Escape card. Highest number wins."
            if (type === 'WHITEWHALE') type = 'ESCAPE'; 
        }
        return { ...p.handCard.card, cardType: type };
    };

    const effectivePlays = plays.map((p, i) => ({ ...p, effectiveCard: getEffectiveDetails(p), originalIndex: i }));

    // If Whale is Active, we only look for Numbers.
    if (hasWhale) {
       // Highest number wins.
       // Color/Suit doesn't matter differently than usual (follow suit rules apply at playtime, but for winning:
       // If whale is played, colors change? No, usually just standard winning logic applies to numbers.
       // "Highest numbered card leads/wins. If no numbered cards, the first card played wins (standard escape rule)?"
       // Actually Whale leads to color logic usually.
       // Let's stick to: Lead Suit still applies if established by a Number.
       // If logic determines there was a Lead Suit, Trump still beats Lead?
       // "Treat all special cards as Escape cards. The color of the suit played still matters (Trump is still Trump)."
    }

    // 2. Skull King (If no Whale)
    if (!hasWhale) {
        const skIndex = effectivePlays.findIndex(p => p.effectiveCard.cardType === 'SKULLKING');
        const mermaidIndices = effectivePlays.filter(p => p.effectiveCard.cardType === 'MERMAID').map(p => p.originalIndex);
        
        if (skIndex !== -1) {
            if (mermaidIndices.length > 0) {
                // Mermaid beats Skull King
                return { winnerIndex: mermaidIndices[0], destroyed: false };
            }
            return { winnerIndex: skIndex, destroyed: false };
        }
    
        // 3. Pirates (If no Whale)
        const pirateIndex = effectivePlays.findIndex(p => p.effectiveCard.cardType === 'PIRATE');
        if (pirateIndex !== -1) {
            return { winnerIndex: pirateIndex, destroyed: false };
        }
    
        // 4. Mermaids
        if (mermaidIndices.length > 0) {
            return { winnerIndex: mermaidIndices[0], destroyed: false };
        }
    }

    // 5. Standard Suits and Numbers
    // (This applies if Whale is present OR if no specials were played)
    
    // Check Loot (If Loot wins, +20 bonus. Loot is effectively an Escape unless it's the only thing played?)
    // "Loot card is an Escape card." -> Handled by effectiveCard type 'ESCAPE' if we map it.
    // If Loot is in effectivePlays, it is 'LOOT' (if not whale) or 'ESCAPE' (if whale).
    // Let's assume Loot is basically Escape for winning purposes.

    const leadSuit = determineLeadSuit(plays); // Use original plays to determine lead suit correctly (Whale logic accounted inside)

    let bestIndex = -1;
    let bestVal = -1; 
    
    effectivePlays.forEach((p, idx) => {
        const card = p.effectiveCard;
        const isEscape = card.cardType === 'ESCAPE' || card.cardType === 'WHITEWHALE' || card.cardType === 'LOOT';

        if (isEscape) return; 
        
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

    if (bestIndex !== -1) {
        // Winner found
        const winner = effectivePlays[bestIndex];
        // Check for Loot Bonus
        // If the winning card is 'LOOT' (Impossible as it's escape)
        // If the *Player* played a Loot and won? No, Loot is an Escape.
        // Wait, Loot rule: "Played as Escape. If you and your alliance win..." -> Too complex.
        // Simple Loot rule (often used): "If you win a trick containing a Loot, you get +20."
        return { winnerIndex: effectivePlays[bestIndex].originalIndex, destroyed: false };
    }
    
    // If all escapes? First player wins.
    return { winnerIndex: 0, destroyed: false }; 
}

export function calculateRoundScores(round: any, players: any[]): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (const p of players) {
        const prediction = round.predictions.find((pred: any) => pred.playerId === p.id)?.predicted ?? 0;
        // Logic change: tricks might be destroyed. They don't have a winnerId then? 
        // Or handle destruction upstream.
        const tricksWon = round.tricks.filter((t: any) => t.winnerId === p.id);
        const trickCount = tricksWon.length;
        
        let score = 0;
        if (prediction === trickCount) {
            // Correct bid
            if (prediction === 0) {
                score = round.number * 10;
            } else {
                score = prediction * 20;
            }

            // --- BONUS CALCULATION (Only if successful bid) ---
            let bonus = 0;
            tricksWon.forEach((tick: any) => {
                const plays = tick.plays;
                // find the winning card
                const myPlay = plays.find((pl: any) => pl.playerId === p.id);
                if (!myPlay) return;

                const myCardType = myPlay.handCard.card.cardType;
                // Check Tigress as Pirate/Mermaid? (Tigress is Pirate or Escape)
                const isMyPirate = myCardType === 'PIRATE' || (myCardType === 'TIGRESS' && myPlay.playChoice === 'PIRATE');
                const isMyMermaid = myCardType === 'MERMAID';
                const isMySK = myCardType === 'SKULLKING';
                
                // 1. Capture SK with Mermaid -> +50
                if (isMyMermaid) {
                    const hasSK = plays.some((pl: any) => pl.handCard.card.cardType === 'SKULLKING');
                    if (hasSK) bonus += 50;
                }

                // 2. Capture Pirate with SK -> +30 per Pirate
                if (isMySK) {
                    plays.forEach((pl: any) => {
                        const type = pl.handCard.card.cardType;
                        const choice = pl.playChoice;
                        const isPirate = type === 'PIRATE' || (type === 'TIGRESS' && choice === 'PIRATE');
                        if (isPirate) bonus += 30;
                    });
                }
                
                // 3. Loot Bonus (+20 if trick contains Loot)
                const hasLoot = plays.some((pl: any) => pl.handCard.card.cardType === 'LOOT');
                if (hasLoot) bonus += 20;

                // 4. 14 Bonus
                plays.forEach((pl: any) => {
                    const c = pl.handCard.card;
                    if (c.cardType === 'NUMBER' && c.rank === 14) {
                        if (c.suit === 'BLACK') bonus += 20; // Black 14
                        else bonus += 10; // Regular 14
                    }
                });
            });
            score += bonus;
            // --------------------------------------------------

        } else {
            const diff = Math.abs(prediction - trickCount);
            score = diff * -10;
        }
        scores[p.id] = score;
    }
    return scores;
}
