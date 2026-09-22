import { useMemo, useState } from 'react';
import type { ProcessStep, SavedBeat } from '@agents';
import { IconBack, IconMic, IconWave, IconX } from '../ui/Icons';
import { LangSwitch } from '../ui/LangSwitch';
import { useI18n } from '../i18n/I18nProvider';

function Pad({ tone }: { tone: string }) {
  return (
    <div className={`voice-face beat-pad pad-${tone}`}>
      <span className="pad-core" />
    </div>
  );
}

const STEP_KEY: Record<ProcessStep, 'beat.step.record' | 'beat.step.process' | 'beat.step.autotone' | 'beat.step.spectrum'> = {
  record: 'beat.step.record',
  process: 'beat.step.process',
  autotone: 'beat.step.autotone',
  spectrum: 'beat.step.spectrum',
};

export function BeatScreen({
  takes,
  live,
  peaks,
  step,
  onToggle,
  onBack,
  onDiscard,
  onRecord,
}: {
  takes: SavedBeat[];
  live: boolean;
  peaks: number[];
  step: ProcessStep;
  onToggle: (clipId: string) => void;
  onBack: () => void;
  onDiscard: () => void;
  onRecord: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selectedCount = useMemo(() => takes.filter((row) => row.clip.selected).length, [takes]);

  return (
    <section className="vocal-page" aria-label={t('beat.region')}>
      <div className="lang-dock">
        <LangSwitch />
      </div>

      <div className="vocal-chrome">
        <button type="button" className="back-btn" aria-label={t('beat.back')} onClick={onBack}>
          <IconBack />
        </button>
        <button
          type="button"
          className={`saved-btn${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-label={t('beat.library')}
          onClick={() => setOpen((v) => !v)}
        >
          <IconWave size={16} />
          <span>{t('beat.libraryCount', { count: takes.length })}</span>
        </button>
      </div>

      {open && (
        <div className="saved-tray" role="listbox" aria-label={t('beat.library')}>
          {takes.map((row) => (
            <button
              key={row.clip.id}
              type="button"
              role="option"
              aria-selected={row.clip.selected}
              className={`voice-chip${row.clip.selected ? ' is-selected' : ''}`}
              onClick={() => onToggle(row.clip.id)}
              aria-label={t('beat.select', { handle: row.profile.handle })}
            >
              <Pad tone={row.profile.avatarTone} />
              <span className="voice-handle">@{row.profile.handle}</span>
            </button>
          ))}
        </div>
      )}

      <div className="speak-block">
        <p className="speak-text">{t('beat.speak')}</p>
        <div className={`beat-wave${live ? ' is-live' : ''}`} aria-hidden>
          {peaks.map((h, i) => (
            <i
              key={i}
              style={{ height: `${10 + h * 122}px` }}
            />
          ))}
        </div>
        <p className={`vocal-status${live ? ' is-live' : ''}`} aria-live="polite">
          <span className="vocal-status-dot" />
          <span key={live ? step : 'ready'} className="vocal-status-copy">
            {live ? t(STEP_KEY[step]) : t('beat.step.ready')}
          </span>
        </p>
        {selectedCount > 0 && !open && (
          <p className="vocal-selected-hint">@{takes.filter((row) => row.clip.selected).map((row) => row.profile.handle).join('  @')}</p>
        )}
        <div className="wave-actions">
          <button className="act act--x" aria-label={t('beat.discard')} onClick={onDiscard}>
            <IconX />
          </button>
          <button
            className={`act act--ok${live ? ' is-recording' : ''}`}
            aria-label={t('beat.record')}
            aria-pressed={live}
            onClick={onRecord}
          >
            <IconMic size={22} />
          </button>
        </div>
      </div>
    </section>
  );
}
