import { FIREBASE_GENRE_SEEDS, FIREBASE_STORAGE_PATHS } from '@db/firebase-collections';
import { useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '@agents';

const PAGES = 3;

export function HomeGenreRail({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  const rail = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  return (
    <section className="genre-discover" aria-label={t('home.genreTitle')}>
      <h2>{t('home.genreTitle')}</h2>
      <div className="genre-dots" role="tablist" aria-label={t('home.genreSwipe')}>
        {Array.from({ length: PAGES }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={page === i}
            className={page === i ? 'is-on' : undefined}
            onClick={() => {
              const el = rail.current;
              if (!el) return;
              const max = el.scrollWidth - el.clientWidth;
              el.scrollTo({ left: (max / (PAGES - 1)) * i, behavior: 'smooth' });
            }}
          />
        ))}
      </div>
      <div
        className="genre-rail"
        ref={rail}
        onScroll={() => {
          const el = rail.current;
          if (!el) return;
          const max = el.scrollWidth - el.clientWidth;
          if (max <= 0) return;
          setPage(Math.round((el.scrollLeft / max) * (PAGES - 1)));
        }}
      >
        {FIREBASE_GENRE_SEEDS.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={`genre-tile${tile.hero ? ' genre-tile--hero' : ''}`}
            onClick={onOpen}
          >
            <img src={FIREBASE_STORAGE_PATHS.genrePublic(tile.slug)} alt="" draggable={false} />
            <span>{t(tile.tagKey as MessageKey)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
