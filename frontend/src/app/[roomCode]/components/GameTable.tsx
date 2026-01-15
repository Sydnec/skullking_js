'use client';

import React, { useState } from 'react';
import styles from './GameTable.module.css';
import { apiFetchWithAuth } from '../../../lib/api';

import { CARD_COLORS, UI_COLORS } from '../../../lib/constants';

function getCardClass(card: any) {
  const classes = [styles.cardItem];

  if (!card) return classes.join(' ');

  switch(card.suit) {
    case 'BLACK': classes.push(styles.cardBlack); break;
    case 'GREEN': classes.push(styles.cardGreen); break;
    case 'PURPLE': classes.push(styles.cardPurple); break;
    case 'YELLOW': classes.push(styles.cardYellow); break;
  }
  
  // Special cards
  if(card.cardType === 'PIRATE') classes.push(styles.cardPirate);
  if(card.cardType === 'SKULLKING') classes.push(styles.cardSkullKing);
  if(card.cardType === 'ESCAPE') classes.push(styles.cardEscape);
  if(card.cardType === 'MERMAID') classes.push(styles.cardMermaid);
  if(card.cardType === 'TIGRESS') classes.push(styles.cardTigress);
  if(card.cardType === 'KRAKEN') classes.push(styles.cardKraken);
  if(card.cardType === 'WHITEWHALE') classes.push(styles.cardWhiteWhale);
  if(card.cardType === 'LOOT') classes.push(styles.cardLoot);
  
  return classes.join(' ');
}

export default function GameTable({ room, game, userId }: { room: any; game: any; userId: string | null }) {
  const [submitting, setSubmitting] = useState(false);
  const [tigressModal, setTigressModal] = useState<{ open: boolean; cardId: string | null }>({ open: false, cardId: null });

  if (!game) return <div>Chargement de la partie...</div>;

  const currentRound = game.rounds?.[0];
  if (!currentRound) return <div className={styles.waitMsg}>Erreur: pas de manche active</div>;

  // Map players to game data
  const players = room.players || [];
  players.sort((a: any, b: any) => (a.seat || 0) - (b.seat || 0));

  const myPlayer = players.find((p: any) => p.userId === userId);
  const myHand = currentRound.hands.find((h: any) => h.playerId === myPlayer?.id);

  // Identify active trick (the one being played)
  const tricks = currentRound.tricks || [];
  tricks.sort((a:any, b:any) => a.index - b.index);
  
  const currentTrick = tricks[tricks.length - 1];
  
  // Show last COMPLETED trick
  const completedTricks = tricks.filter((t: any) => t.plays && t.plays.length >= players.length);
  const lastTrick = completedTricks.length > 0 ? completedTricks[completedTricks.length - 1] : null;
  const [showLastTrick, setShowLastTrick] = useState(false);

  // Determine Lead Suit
  let leadSuit = null;
  let leadColorHex = CARD_COLORS.GREEN; 
  
  if (currentTrick && currentTrick.plays && currentTrick.plays.length > 0) {
      for (const p of currentTrick.plays) {
           const isEscape = p.handCard.card.cardType === 'ESCAPE' || 
                            (p.handCard.card.cardType === 'TIGRESS' && p.playChoice === 'ESCAPE');
           if (!isEscape) {
               if (p.handCard.card.cardType === 'NUMBER') {
                   leadSuit = p.handCard.card.suit;
               }
               break;
           }
      }
  }

  // Set visual color for lead suit
  if (leadSuit === 'BLACK') leadColorHex = CARD_COLORS.BLACK;
  if (leadSuit === 'PURPLE') leadColorHex = CARD_COLORS.PURPLE;
  if (leadSuit === 'YELLOW') leadColorHex = CARD_COLORS.YELLOW;
  if (leadSuit === 'GREEN') leadColorHex = CARD_COLORS.GREEN;

  // Identify active player
  let activePlayerId: string | null = null;
  if (currentRound.phase === 'PLAY' && currentTrick) {
     if (currentTrick.plays && currentTrick.plays.length < players.length) {
        if (currentTrick.plays.length === 0) {
            activePlayerId = currentTrick.starterId;
        } else {
            const lastPlay = currentTrick.plays[currentTrick.plays.length - 1];
            const pIndex = players.findIndex((p: any) => p.id === lastPlay.playerId);
            if (pIndex !== -1) {
                activePlayerId = players[(pIndex + 1) % players.length].id;
            }
        }
     }
  }

  const isMyTurn = currentRound.phase === 'PLAY' && activePlayerId === myPlayer?.id;

  // Collect played cards IDs
  const playedCardIds = new Set<string>();
  if (currentRound.hands) {
      tricks.forEach((t: any) => {
          t.plays.forEach((p: any) => {
              playedCardIds.add(p.handCardId);
          });
      });
  }

  async function submitPrediction(n: number) {
      if (submitting) return;
      setSubmitting(true);
      try {
          await apiFetchWithAuth(`/games/${game.id}/prediction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prediction: n })
          });
      } catch (e) {
          alert('Erreur: ' + String(e));
      } finally {
          setSubmitting(false);
      }
  }

  function handleCardClick(card: any, handCardId: string) {
      if (submitting || !isMyTurn) return;
      if (card.cardType === 'TIGRESS') {
          setTigressModal({ open: true, cardId: handCardId });
      } else {
          submitPlayCard(handCardId);
      }
  }

  async function submitPlayCard(cardId: string, choice?: 'PIRATE' | 'ESCAPE') {
      if (submitting) return;
      setSubmitting(true);
      setTigressModal({ open: false, cardId: null });
      try {
          await apiFetchWithAuth(`/games/${game.id}/play`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardId, choice })
          });
      } catch (e) {
          alert('Erreur: ' + String(e));
      } finally {
          setSubmitting(false);
      }
  }

  async function collectTrick() {
      if (submitting) return;
      setSubmitting(true);
      try {
          await apiFetchWithAuth(`/games/${game.id}/collect`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
          });
      } catch (e) {
          alert('Erreur: ' + String(e));
      } finally {
          setSubmitting(false);
      }
  }

  const trickToCollect = (currentTrick?.winnerId && currentTrick?.plays?.length === players.length) ? currentTrick : null;
  const isWinnerOfTrick = trickToCollect && trickToCollect.winnerId === myPlayer?.id;

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <h2>Manche {currentRound.number} / {game.totalRounds}</h2>
        <div>Phase: {currentRound.phase}</div>
        {trickToCollect && (
             <div style={{ marginLeft: 20 }}>
                {isWinnerOfTrick ? (
                    <button onClick={collectTrick} className={styles.collectBtn}>
                        Remporter le pli !
                    </button>
                ) : (
                    <span className={styles.waitMsg}>En attente que le vainqueur ramasse...</span>
                )}
             </div>
        )}
        {lastTrick && (
            <button 
                onClick={() => setShowLastTrick(true)}
                className={styles.lastTrickBtn}
            >
                Voir dernier pli
            </button>
        )}
      </div>

      <div className={styles.gameBoard}>
        {players.map((p: any) => {
          const isMe = p.userId === userId;
          const prediction = currentRound.predictions.find((pred: any) => pred.playerId === p.id);
          const tricksWon = currentRound.tricks.filter((t: any) => t.winnerId === p.id).length;
          
          const activePlay = currentTrick?.plays?.find((pl: any) => pl.playerId === p.id);
          const activeCard = activePlay?.handCard?.card;
          const isActive = activePlayerId === p.id;

          const playerBoardClass = `${styles.playerBoard} ${isMe ? styles.me : ''} ${isActive ? styles.playerActive : ''}`;

          return (
            <div key={p.id} className={playerBoardClass}>
              <div style={{ fontWeight: 'bold', display:'flex', justifyContent:'space-between' }}>
                  <span>{p.user?.name || 'Joueur'}</span>
                  {isActive && <span style={{fontSize:'0.8em', color: CARD_COLORS.ACTIVE_BORDER}}>Refléchit...</span>}
              </div>
              <div className={styles.playerStats}>
                Score Total: {p.score ?? 0}
              </div>
              
              <div className={styles.roundStats}>
                 {currentRound.phase === 'PREDICTION' ? (
                   <div>
                     <div style={{marginBottom: 8}}>
                       Pari: {prediction ? (
                          isMe ? 
                            <span className={styles.successText}>Validé ({prediction.predicted})</span> :
                            <span className={styles.successText}>Prêt</span>
                        ) : <span className={styles.pendingText}>En attente...</span>
                       }
                     </div>
                     
                     {isMe && !prediction && (
                       <div className={styles.predictionInput}>
                         <strong>À toi de parier !</strong>
                         <div className={styles.predictionChoice}>
                            {Array.from({length: (currentRound.handSize || 0) + 1}).map((_, idx) => (
                                <button key={idx} 
                                  className={styles.predictionBtn}
                                  disabled={submitting} 
                                  onClick={() => submitPrediction(idx)}
                                >
                                  {idx}
                                </button>
                            ))}
                         </div>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div style={{display:'flex', flexDirection:'column', gap:8, alignItems:'center'}}>
                     <div>
                       Plis: {tricksWon} / {prediction?.predicted ?? '?'}
                       {prediction && tricksWon === prediction.predicted && <span style={{marginLeft: 6}}>✅</span>}
                     </div>
                     <div className={styles.cardSlot}>
                        {activeCard ? (
                             <div className={getCardClass(activeCard)}>
                                {activeCard.label}
                                {activePlay?.playChoice === 'PIRATE' && <div className={styles.cardIcon}>⚔️</div>}
                                {activePlay?.playChoice === 'ESCAPE' && <div className={styles.cardIcon}>🏳️</div>}
                             </div>
                        ) : (
                            <div className={styles.emptySlot}>
                                {isActive ? '...' : ''}
                            </div>
                        )}
                     </div>
                   </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Trick Modal */}
      {showLastTrick && lastTrick && (
         <div className={styles.modalOverlay} onClick={() => setShowLastTrick(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3 style={{marginBottom: 15, textAlign:'center'}}>Dernier Pli (Vainqueur: {players.find((p:any) => p.id === lastTrick.winnerId)?.user?.name || 'Personne / Détruit'})</h3>
                <div style={{display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center'}}>
                    {lastTrick.plays?.map((pl: any) => (
                        <div key={pl.id} style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                            <div className={getCardClass(pl.handCard.card)}>
                                {pl.handCard.card.label}
                                {pl.playChoice === 'PIRATE' && <span className={styles.cardIcon}>⚔️</span>}
                                {pl.playChoice === 'ESCAPE' && <span className={styles.cardIcon}>🏳️</span>}
                            </div>
                            <span style={{fontSize:'0.7em', marginTop:4}}>{players.find((p:any) => p.id === pl.playerId)?.user?.name}</span>
                        </div>
                    ))}
                </div>
                <div style={{marginTop: 20, textAlign:'center'}}>
                   <button onClick={() => setShowLastTrick(false)} className={styles.btnCancel} style={{textDecoration:'none', border:'1px solid var(--border)', width:'auto', padding:'4px 12px'}}>Fermer</button>
                </div>
            </div>
        </div>
      )}

      <div className={styles.myHand} style={{ borderColor: leadColorHex, borderTopColor: leadColorHex }}>
        <div className={styles.handHeader}>
            <h3>
                Ma main ({myHand?.cards?.filter((c:any) => !playedCardIds.has(c.id)).length || 0}) 
            </h3>
            {isMyTurn && <span style={{color: leadColorHex === CARD_COLORS.GREEN ? CARD_COLORS.ACTIVE_BORDER : leadColorHex, fontWeight:'bold', marginLeft: 10}}>À toi de jouer !</span>}
        </div>
        <div className={styles.handCards}>
          {myHand?.cards?.filter((c:any) => !playedCardIds.has(c.id)).map((hc: any) => (
             <div 
                 key={hc.id} 
                 className={`${getCardClass(hc.card)} ${isMyTurn && !submitting ? styles.handCardInteractive : styles.handCardInactive} ${isMyTurn ? styles.handCardActive : ''}`}
                 onClick={() => handleCardClick(hc.card, hc.id)}
             >
               {hc.card.label}
             </div>
          ))}
          {!myHand?.cards?.length && <div>Aucune carte en main</div>}
        </div>
      </div>
      
      {/* Tigress Modal */}
      {tigressModal.open && (
        <div className={styles.modalOverlay}>
           <div className={styles.modalContent} style={{minWidth: 300}}>
             <h3>Carte Tigresse jouée</h3>
             <p>Voulez-vous la jouer comme Pirate ou comme Fuite (Escape) ?</p>
             <div className={styles.tigressButtons}>
                <button 
                  onClick={() => tigressModal.cardId && submitPlayCard(tigressModal.cardId, 'PIRATE')}
                  className={styles.btnPirate}>
                  PIRATE
                </button>
                <button 
                  onClick={() => tigressModal.cardId && submitPlayCard(tigressModal.cardId, 'ESCAPE')}
                  className={styles.btnEscape}>
                  FUITE (ESCAPE)
                </button>
             </div>
             <button 
               onClick={() => setTigressModal({ open: false, cardId: null })}
               className={styles.btnCancel}>
               Annuler
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
