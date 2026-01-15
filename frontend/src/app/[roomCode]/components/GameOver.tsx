'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './GameOver.module.css';

export default function GameOver({ game, room, userId }: { game: any, room: any, userId: string | null }) {
    const router = useRouter();
    const players = room.players || [];
    const sortedPlayers = [...players].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    
    // History & Chart Data
    const history = game.scoreHistory || [];
    // Colors for lines
    const colors = ['#eab308', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#f97316', '#64748b'];

    // Determine bounds
    let maxVal = 100;
    let minVal = 0;
    
    // Prepare Data: Map<playerId, Points[]>
    const playerPoints: Record<string, {x: number, y: number}[]> = {};
    players.forEach((p:any) => playerPoints[p.id] = [{x: 0, y: 0}]);

    history.forEach((h: any) => {
        h.roundScores.forEach((rs: any) => {
             if (playerPoints[rs.playerId]) {
                 playerPoints[rs.playerId].push({ x: h.number, y: rs.totalScore });
                 if (rs.totalScore > maxVal) maxVal = rs.totalScore;
                 if (rs.totalScore < minVal) minVal = rs.totalScore;
             }
        });
    });
    
    // Add margin to bounds
    maxVal += 50;
    minVal -= 50;
    if (minVal > 0) minVal = 0; // Always anchor at least 0

    const roundsCount = game.totalRounds || 10;
    
    // SVG Config
    const W = 600;
    const H = 300;
    const P = 40; // padding

    // Scale functions
    const getX = (roundNum: number) => P + (roundNum / roundsCount) * (W - 2*P);
    const getY = (score: number) => H - P - ((score - minVal) / (maxVal - minVal)) * (H - 2*P);

    return (
        <div className={styles.singleColumnContainer}>
            <div className={styles.mainCard} style={{textAlign: 'center', padding: 20}}>
                <h1 className={styles.gameOverTitle}>PARTIE TERMINÉE !</h1>
                
                {/* Resultats Resumés (Top 3 Bar Chart) */}
                <div className={styles.podiumContainer}>
                    {sortedPlayers.slice(0, 3).map((p: any, idx: number) => {
                         // Relative height for bar chart
                         const maxP = Math.max(...players.map((pl:any) => pl.score || 0), 10);
                         // Prevent division by zero if everyone has 0
                         const safeMaxP = maxP === 0 ? 100 : maxP;
                         const barH = Math.max(10, ((p.score || 0) / safeMaxP) * 100); 
                         const isWinner = idx === 0;
                         
                         return (
                             <div key={p.id} className={styles.podiumItem}>
                                 <div className={`${styles.podiumBar} ${isWinner ? styles.winner : ''}`} style={{ height: `${barH}px` }}>
                                    <span className={styles.podiumScore}>{p.score}</span>
                                    {isWinner && <span className={styles.podiumCrown}>👑</span>}
                                 </div>
                                 <div className={styles.podiumName}>
                                     {p.user?.name}
                                 </div>
                             </div>
                         )
                    })}
                </div>

                {/* Score Evolution Chart */}
                <div className={styles.chartContainer}>
                    <h3>Évolution des scores</h3>
                    <div style={{overflowX: 'auto'}}>
                        <svg width={W} height={H} className={styles.chartSvg}>
                             {/* Grid Lines Y */}
                             {[0, 0.25, 0.5, 0.75, 1].map(t => {
                                 const val = minVal + t * (maxVal - minVal);
                                 const y = getY(val);
                                 return (
                                     <g key={t}>
                                         <line x1={P} y1={y} x2={W-P} y2={y} stroke="var(--border)" strokeDasharray="4" />
                                         <text x={P-5} y={y+4} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(val)}</text>
                                     </g>
                                 )
                             })}
                             
                             {/* Zero Line */}
                             {minVal < 0 && maxVal > 0 && (
                                 <line x1={P} y1={getY(0)} x2={W-P} y2={getY(0)} stroke="var(--fg)" strokeWidth="1" opacity="0.3"/>
                             )}

                             {/* X Axis Labels */}
                             {Array.from({length: roundsCount + 1}).map((_, i) => (
                                 <text key={i} x={getX(i)} y={H - P + 15} textAnchor="middle" fontSize="10" fill="var(--muted)">{i}</text>
                             ))}

                             {/* Lines */}
                             {players.map((p: any, i: number) => {
                                 const pts = playerPoints[p.id] || [];
                                 if (pts.length < 1) return null;
                                 const d = pts.map((pt, idx) => `${idx===0?'M':'L'} ${getX(pt.x)} ${getY(pt.y)}`).join(' ');
                                 const color = colors[i % colors.length];
                                 return (
                                     <g key={p.id}>
                                        <path d={d} fill="none" stroke={color} strokeWidth="2" />
                                        {pts.map((pt, idx) => (
                                            <circle key={idx} cx={getX(pt.x)} cy={getY(pt.y)} r="3" fill={color} />
                                        ))}
                                     </g>
                                 )
                             })}
                        </svg>
                    </div>
                    {/* Legend */}
                    <div className={styles.legendContainer}>
                        {players.map((p: any, i: number) => (
                            <div key={p.id} className={styles.legendItem}>
                                <div style={{width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length]}}></div>
                                <span>{p.user?.name} : {p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.rankingList}>
                    <ul style={{listStyle:'none', padding:0}}>
                        {sortedPlayers.map((p:any, idx:number) => {
                            const isWinner = idx === 0;
                            return (
                                <li key={p.id} className={`${styles.rankingItem} ${isWinner ? styles.rankingItemWinner : ''}`}>
                                    <span>#{idx+1} <strong>{p.user?.name}</strong></span>
                                    <span>{p.score ?? 0} pts</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <button onClick={() => router.push('/')} className={styles.backBtn}>
                    Retour Salon
                </button>
            </div>
        </div>
    );
}
