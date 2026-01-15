'use client';

import React, { useState } from 'react';
import styles from '../RoomPage.module.css';
import { apiFetchWithAuth } from '../../../lib/api';

import { CARD_COLORS, UI_COLORS } from '../../../lib/constants';

function getCardStyle(card: any) {
  const base: any = {
    display: 'inline-flex', 
    alignItems: 'center',
    justifyContent: 'center',
    width: 60, height: 90,
    border: `1px solid ${CARD_COLORS.DEFAULT_BORDER}`,
    borderRadius: 8,
    margin: 5,
    backgroundColor: '#fff',
    color: '#000',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    textAlign: 'center',
    padding: 4
  };

  if(!card) return base;

  switch(card.suit) {
    case 'BLACK': return { ...base, backgroundColor: CARD_COLORS.BLACK, color: '#fff' };
    case 'GREEN': return { ...base, backgroundColor: CARD_COLORS.GREEN, color: '#fff' };
    case 'PURPLE': return { ...base, backgroundColor: CARD_COLORS.PURPLE, color: '#fff' };
    case 'YELLOW': return { ...base, backgroundColor: CARD_COLORS.YELLOW, color: '#000' };
  }
  
  // Special cards
  if(card.cardType === 'PIRATE') return { ...base, backgroundColor: CARD_COLORS.PIRATE, color: '#fff' };
  if(card.cardType === 'SKULLKING') return { ...base, backgroundColor: CARD_COLORS.SKULLKING, color: '#fff', border: '2px solid gold' };
  if(card.cardType === 'ESCAPE') return { ...base, backgroundColor: CARD_COLORS.ESCAPE, color: '#333' };
  if(card.cardType === 'MERMAID') return { ...base, backgroundColor: CARD_COLORS.MERMAID, color: '#fff' };
  if(card.cardType === 'TIGRESS') return { ...base, backgroundColor: CARD_COLORS.TIGRESS, color: '#fff' };
  if(card.cardType === 'KRAKEN') return { ...base, backgroundColor: CARD_COLORS.KRAKEN, color: '#fff' };
  if(card.cardType === 'WHITEWHALE') return { ...base, backgroundColor: CARD_COLORS.WHITEWHALE, color: '#000' };
  if(card.cardType === 'LOOT') return { ...base, backgroundColor: CARD_COLORS.LOOT, color: '#000' };
  
  return base;
}

export default function GameTable({ room, game, userId }: { room: any; game: any; userId: string | null }) {
  const [submitting, setSubmitting] = useState(false);
  const [tigressModal, setTigressModal] = useState<{ open: boolean; cardId: string | null }>({ open: false, cardId: null });

  if (!game) return <div>Chargement de la partie...</div>;

  const currentRound = game.rounds?.[0];
  if (!currentRound) return <div>Erreur: pas de manche active</div>;

  // Map players to game data
  const players = room.players || [];
  players.sort((a: any, b: any) => (a.seat || 0) - (b.seat || 0));

  const myPlayer = players.find((p: any) => p.userId === userId);
  const myHand = currentRound.hands.find((h: any) => h.playerId === myPlayer?.id);

  // Identify active trick (the one being played)
  // Backend creates next trick immediately after previous one is full for non-last tricks.
  // If undefined, maybe round finished or just starting?
  // We sort tricks by index asc. Last one is current.
  const tricks = currentRound.tricks || [];
  // Sort properly by index
  tricks.sort((a:any, b:any) => a.index - b.index);
  
  const currentTrick = tricks[tricks.length - 1];
  
  // Show last COMPLETED trick (even if it is the current one waiting for collection)
  const completedTricks = tricks.filter((t: any) => t.plays && t.plays.length >= players.length);
  const lastTrick = completedTricks.length > 0 ? completedTricks[completedTricks.length - 1] : null;
  const [showLastTrick, setShowLastTrick] = useState(false);

  // Determine Lead Suit
  let leadSuit = null;
  let leadColorHex = CARD_COLORS.GREEN; // Default Green (or whatever accent)
  
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
  // If trick empty, starterId. Else next player after last played.
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

  // Collect played cards IDs to hide them from hand or disable them
  const playedCardIds = new Set<string>();
  if (currentRound.hands) {
      // Since backend doesn't return plays in hand, we scan tricks
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

  // Detect finished trick waiting for collection
  // If current trick has plays = players.length and winnerId is set.
  // Note: Backend won't create next trick until collected.
  // So currentTrick is the one to collect.
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
                    <button onClick={collectTrick} style={{
                        padding: '8px 16px', background: UI_COLORS.BUTTON_SUCCESS, color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer',
                        animation: 'pulse 1s infinite'
                    }}>
                        Remporter le pli !
                    </button>
                ) : (
                    <span style={{ color: UI_COLORS.TEXT_WARNING, fontWeight: 'bold' }}>En attente que le vainqueur ramasse...</span>
                )}
             </div>
        )}
        {lastTrick && (
            <button 
                onClick={() => setShowLastTrick(true)}
                style={{ marginLeft: 10, padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 4, cursor:'pointer' }}
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
          
          // Card played in current trick?
          const activePlay = currentTrick?.plays?.find((pl: any) => pl.playerId === p.id);
          const activeCard = activePlay?.handCard?.card;
          
          const isActive = activePlayerId === p.id;

          return (
            <div key={p.id} className={`${styles.playerBoard} ${isMe ? styles.me : ''}`} style={isActive ? {borderColor: CARD_COLORS.ACTIVE_BORDER, boxShadow:`0 0 0 2px ${CARD_COLORS.ACTIVE_BORDER}`} : {}}>
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
                            <span style={{color: UI_COLORS.TEXT_SUCCESS, fontWeight:'bold'}}>Validé ({prediction.predicted})</span> :
                            <span style={{color: UI_COLORS.TEXT_SUCCESS, fontWeight:'bold'}}>Prêt</span>
                        ) : <span style={{color:'var(--muted)', fontStyle:'italic'}}>En attente...</span>
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
                     {/* Show played card slot */}
                     <div style={{height: 100, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {activeCard ? (
                             <div style={getCardStyle(activeCard)}>
                                {activeCard.label}
                                {activePlay?.playChoice === 'PIRATE' && <div style={{fontSize:9, position:'absolute', bottom:2}}>⚔️</div>}
                                {activePlay?.playChoice === 'ESCAPE' && <div style={{fontSize:9, position:'absolute', bottom:2}}>🏳️</div>}
                             </div>
                        ) : (
                            <div style={{
                                width: 50, height: 75, border:'2px dashed var(--border)', borderRadius: 8, 
                                display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:'0.7em'
                            }}>
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
         <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setShowLastTrick(false)}>
            <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxWidth: '90%' }}>
                <h3 style={{marginBottom: 15, textAlign:'center'}}>Dernier Pli (Vainqueur: {players.find((p:any) => p.id === lastTrick.winnerId)?.user?.name || 'Personne / Détruit'})</h3>
                <div style={{display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center'}}>
                    {lastTrick.plays?.map((pl: any) => (
                        <div key={pl.id} style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                            <div style={getCardStyle(pl.handCard.card)}>
                                {pl.handCard.card.label}
                                {pl.playChoice === 'PIRATE' && <span style={{position:'absolute', bottom:2}}>⚔️</span>}
                                {pl.playChoice === 'ESCAPE' && <span style={{position:'absolute', bottom:2}}>🏳️</span>}
                            </div>
                            <span style={{fontSize:'0.7em', marginTop:4}}>{players.find((p:any) => p.id === pl.playerId)?.user?.name}</span>
                        </div>
                    ))}
                </div>
                <div style={{marginTop: 20, textAlign:'center'}}>
                   <button onClick={() => setShowLastTrick(false)} style={{padding:'8px 16px', borderRadius:6, border:'none', background:'var(--muted)', color:'white', cursor:'pointer'}}>Fermer</button>
                </div>
            </div>
        </div>
      )}

      <div className={styles.myHand} style={{ borderColor: leadColorHex, borderTopColor: leadColorHex }}>
        <h3>
            Ma main ({myHand?.cards?.filter((c:any) => !playedCardIds.has(c.id)).length || 0}) 
            {isMyTurn && <span style={{color: leadColorHex === CARD_COLORS.GREEN ? CARD_COLORS.ACTIVE_BORDER : leadColorHex, marginLeft: 10}}>À toi de jouer !</span>}
        </h3>
        <div className={styles.handCards}>
          {myHand?.cards?.filter((c:any) => !playedCardIds.has(c.id)).map((hc: any) => (
             <div 
                 key={hc.id} 
                 style={{
                     ...getCardStyle(hc.card), 
                     cursor: isMyTurn && !submitting ? 'pointer' : 'default',
                     opacity: isMyTurn ? 1 : 0.8,
                     transform: isMyTurn ? 'scale(1.05)' : 'none',
                     border: isMyTurn ? `2px solid ${CARD_COLORS.ACTIVE_BORDER}` : getCardStyle(hc.card).border
                 }}
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
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
           <div style={{ backgroundColor: 'var(--card)', padding: 20, borderRadius: 8, color: 'var(--fg)', minWidth: 300, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
             <h3>Carte Tigresse jouée</h3>
             <p>Voulez-vous la jouer comme Pirate ou comme Fuite (Escape) ?</p>
             <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
                <button 
                  onClick={() => tigressModal.cardId && submitPlayCard(tigressModal.cardId, 'PIRATE')}
                  style={{ padding: '10px 20px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                  PIRATE
                </button>
                <button 
                  onClick={() => tigressModal.cardId && submitPlayCard(tigressModal.cardId, 'ESCAPE')}
                  style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                  FUITE (ESCAPE)
                </button>
             </div>
             <button 
               onClick={() => setTigressModal({ open: false, cardId: null })}
               style={{ marginTop: 20, background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', width: '100%', color: 'var(--muted)' }}>
               Annuler
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
