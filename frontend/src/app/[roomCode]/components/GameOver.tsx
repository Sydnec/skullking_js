'use client';
import React from 'react';
import styles from '../RoomPage.module.css';

export default function GameOver({ game, room, userId }: { game: any, room: any, userId: string | null }) {
    const players = room.players || [];
    // Sort by score desc
    const sortedPlayers = [...players].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    
    // Simple bar chart logic
    const maxScore = Math.max(...players.map((p:any) => p.score || 0), 100); 

    return (
        <div className={styles.singleColumnContainer}>
            <div className={styles.mainCard} style={{textAlign: 'center', padding: 40}}>
                <h1 style={{fontSize: '2.5rem', marginBottom: 20}}>PARTIE TERMINÉE !</h1>
                
                <div style={{display:'flex', justifyContent:'center', gap: 20, alignItems:'flex-end', height: 300, marginBottom: 40, paddingBottom: 20, borderBottom:'1px solid var(--border)'}}>
                    {sortedPlayers.map((p: any, idx: number) => {
                         const height = Math.max(20, ((p.score || 0) / maxScore) * 200);
                         const isWinner = idx === 0;
                         return (
                             <div key={p.id} style={{display:'flex', flexDirection:'column', alignItems:'center', width: 80}}>
                                 <div style={{
                                     height: `${height}px`, 
                                     width: '100%', 
                                     background: isWinner ? '#eab308' : 'var(--muted)',
                                     borderRadius: '8px 8px 0 0',
                                     position: 'relative',
                                     marginBottom: 10
                                 }}>
                                    <span style={{position:'absolute', top: -25, width:'100%', textAlign:'center', fontWeight:'bold', fontSize:'1.1rem'}}>{p.score}</span>
                                    {isWinner && <span style={{position:'absolute', top: '50%', left:'50%', transform:'translate(-50%, -50%)', fontSize:'2rem'}}>👑</span>}
                                 </div>
                                 <div style={{fontWeight: 'bold', fontSize:'0.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%'}}>
                                     {p.user?.name}
                                 </div>
                             </div>
                         )
                    })}
                </div>

                <div style={{textAlign:'left', maxWidth: 600, margin:'0 auto'}}>
                    <h3>Classement Final</h3>
                    <ul style={{listStyle:'none', padding:0}}>
                        {sortedPlayers.map((p:any, idx:number) => (
                            <li key={p.id} style={{padding:'10px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', fontSize:'1.1rem'}}>
                                <span>#{idx+1} <strong>{p.user?.name}</strong></span>
                                <span>{p.score} pts</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <button onClick={() => window.location.reload()} style={{marginTop: 30, padding:'12px 24px', background:'var(--muted)', color:'white', border:'none', borderRadius: 8, fontSize:'1rem', cursor:'pointer'}}>
                    Retour Salon
                </button>
            </div>
        </div>
    );
}
