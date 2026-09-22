import { useState } from 'react';
import type { LibraryRow } from '@agents';
import { IconPause, IconPlay, IconPlus, IconShuffle } from '../ui/Icons';
import { LangSwitch } from '../ui/LangSwitch';
import { useI18n } from '../i18n/I18nProvider';
import { SongDetailFeed } from './SongDetailFeed';

export function LibraryScreen({
  rows,
  playingId,
  onPlay,
  onAdd,
  onShuffle,
  onShare,
}: {
  rows: LibraryRow[];
  playingId: string | null;
  onPlay: (id: string) => void;
  onAdd: (id: string) => void;
  onShuffle: () => void;
  onShare: (message: string) => void;
}) {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const openAt = (index: number) => {
    setOpenIndex(index);
    const id = rows[index]?.song.id;
    if (id && playingId !== id) onPlay(id);
  };

  return (
    <section className="page page--flush">
      <div className="lang-dock">
        <LangSwitch />
      </div>
      <h1 className="library-title">
        {t('library.titleBefore')} <em>{t('library.titleEm')}</em>
        <br />
        {t('library.titleAfter')}
      </h1>

      <button
        className="play-hero"
        aria-label={playingId ? t('library.pause') : t('library.play')}
        onClick={() => rows[0] && onPlay(rows[0].song.id)}
      >
        {playingId ? <IconPause size={26} /> : <IconPlay size={26} />}
      </button>

      <div className="song-list">
        {rows.map((row, index) => {
          const active = playingId === row.song.id;
          return (
            <article key={row.id} className="song-row">
              <button type="button" className="song-row-main" onClick={() => openAt(index)}>
                <span className={`cover tone-${row.song.coverTone}`}>
                  <span className="cover-hit">
                    <b>{active ? <IconPause size={12} /> : <IconPlay size={12} />}</b>
                  </span>
                </span>
                <span className="song-meta">
                  <strong>{row.song.title}</strong>
                  <span>{row.song.artist}</span>
                </span>
              </button>
              <button className="add-circle" aria-label={t('library.add')} onClick={() => onAdd(row.song.id)}>
                <IconPlus size={16} />
              </button>
            </article>
          );
        })}
      </div>

      <div className="shuffle-wrap">
        <button className="shuffle" onClick={onShuffle}>
          <IconShuffle />
          {t('library.shuffle')}
        </button>
      </div>

      {openIndex !== null && rows[openIndex] && (
        <SongDetailFeed
          rows={rows}
          startIndex={openIndex}
          playingId={playingId}
          onPlay={onPlay}
          onAdd={onAdd}
          onShare={onShare}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
