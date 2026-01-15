'use client'

import React from 'react';
import styles from './SettingsPanel.module.css';
import Dropdown from '../../components/Dropdown';
import ToggleSwitch from '../../components/ToggleSwitch';
import Tooltip from '../../components/Tooltip';
import scoreMethods from '../options/scoreMethods';
import gameFormats from '../options/gameFormats';

export default function SettingsPanel({ room, userId, onUpdateSetting, onUpdateMax }: { room: any; userId: string | null; onUpdateSetting: (k: string, v: any) => Promise<void>; onUpdateMax: (n: number) => Promise<void>; }) {
  const s = room?.settings || {};
  const kraken = !!s.kraken;
  const whale = !!s.whale;
  const loot = !!s.loot;
  const piratePowers = !!s.piratePowers;
  const scoreMethod = s.scoreMethod || 'SKULLKING';
  const gameFormat = s.gameFormat || 'CLASSIC';
  const maxPlayers = room?.maxPlayers || 8;

  return (
    <div className={styles.card}>
      <h4>Paramètres de la partie</h4>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className={styles.smallMuted}>Nombre maximal de joueurs</div>
          <div>
            {userId === room.ownerId ? (
              <Dropdown
                ariaLabel="Nombre maximal de joueurs"
                value={String(maxPlayers)}
                options={Array.from({ length: 7 }, (_, i) => ({ value: String(2 + i), label: `${2 + i} joueurs`, description: `Autorise jusqu'à ${2 + i} joueurs` }))}
                onChange={async (v: string) => {
                  const n = parseInt(v || '2');
                  const currentCount = (room?.players || []).length;
                  if (n < currentCount) { alert(`Impossible : maxPlayers (${n}) inférieur au nombre actuel de joueurs (${currentCount})`); return; }
                  await onUpdateMax(n);
                }}
                className={styles.selectSmall}
              />
            ) : (
              <Tooltip title={room?.settings?.maxPlayersDescription || ''}><strong style={{ color: 'var(--fg)' }}>{maxPlayers}</strong></Tooltip>
            )}
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className={styles.smallMuted}>Score selon</div>
          <div>
            {userId === room.ownerId ? (
              <Dropdown
                ariaLabel="Score selon"
                value={String(scoreMethod)}
                options={scoreMethods}
                onChange={(v: string) => onUpdateSetting('scoreMethod', v)}
                className={styles.selectSmall}
              />
            ) : (
              <Tooltip title={(scoreMethods.find(s=>s.value===scoreMethod)?.description) || ''}><strong style={{ color: 'var(--fg)' }}>{scoreMethods.find(s=>s.value===scoreMethod)?.label}</strong></Tooltip>
            )}
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className={styles.smallMuted}>Format de la partie</div>
          <div>
            {userId === room.ownerId ? (
              <Dropdown
                ariaLabel="Format de la partie"
                value={String(gameFormat)}
                options={gameFormats}
                onChange={(v: string) => onUpdateSetting('gameFormat', v)}
                className={styles.selectSmall}
              />
            ) : (
              <Tooltip title={(gameFormats.find(s=>s.value===gameFormat)?.description) || ''}><strong style={{ color: 'var(--fg)' }}>{gameFormats.find(s=>s.value===gameFormat)?.label}</strong></Tooltip>
            )}
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className={styles.smallMuted}>Activer les pouvoirs des pirates</div>
          <div>
            {userId === room.ownerId ? (
              <ToggleSwitch checked={piratePowers} onChange={() => onUpdateSetting('piratePowers', !piratePowers)} ariaLabel="Activer les pouvoirs des pirates" />
            ) : (
              <strong style={{ color: 'var(--fg)' }}>{piratePowers ? 'Oui' : 'Non'}</strong>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Cartes additionnelles</div>

          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <div className={styles.smallMuted}>Kraken</div>
            <div>
              {userId === room.ownerId ? (
                <ToggleSwitch checked={kraken} onChange={() => onUpdateSetting('kraken', !kraken)} ariaLabel="Activer la carte Kraken" />
              ) : (
                <strong style={{ color: 'var(--fg)' }}>{kraken ? 'Oui' : 'Non'}</strong>
              )}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <div className={styles.smallMuted}>Baleine Blanche</div>
            <div>
              {userId === room.ownerId ? (
                <ToggleSwitch checked={whale} onChange={() => onUpdateSetting('whale', !whale)} ariaLabel="Activer la carte Baleine Blanche" />
              ) : (
                <strong style={{ color: 'var(--fg)' }}>{whale ? 'Oui' : 'Non'}</strong>
              )}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className={styles.smallMuted}>Butins</div>
            <div>
              {userId === room.ownerId ? (
                <ToggleSwitch checked={loot} onChange={() => onUpdateSetting('loot', !loot)} ariaLabel="Activer la carte Butin" />
              ) : (
                <strong style={{ color: 'var(--fg)' }}>{loot ? 'Oui' : 'Non'}</strong>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
