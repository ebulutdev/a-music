import { type CSSProperties } from 'react';
import { IconNote } from '../ui/Icons';
import { Header } from '../ui/Header';
import { HomeGenreRail } from '../ui/HomeGenreRail';
import { useI18n } from '../i18n/I18nProvider';

const WAVE = Array.from({ length: 52 }, (_, i) => {
  const n = 0.42 + Math.sin(i * 0.48) * 0.32 + Math.sin(i * 1.21) * 0.18;
  return Math.min(0.98, Math.max(0.2, n));
});

export function CreateScreen({
  onMic,
  onBeat,
  onOpen,
}: {
  onMic: () => void;
  onBeat: () => void;
  onOpen: (view: 'inspire') => void;
}) {
  const { t } = useI18n();

  return (
    <section className="page home-page">
      <div className="home-topo" aria-hidden />
      <div className="home-body">
        <Header />

        <div className="hero">
          <h1>
            {t('create.heroTitle1')}
            <br />
            {t('create.heroTitle2')}
          </h1>
          <p>{t('create.heroSub')}</p>
        </div>

        <div className="code-stage">
          <article className="code-card" aria-label={t('create.codeAria')}>
            <div className="code-wave" aria-hidden>
              <span className="code-note">
                <IconNote size={14} />
              </span>
              {WAVE.map((h, i) => (
                <i key={i} style={{ '--i': i, '--h': h } as CSSProperties} />
              ))}
            </div>
            <pre className="code-block">
              <span className="tok-kw">await</span> <span className="tok-fn">vibe.music.compose</span>
              {'({\n  '}
              <span className="tok-key">prompt</span>
              {': '}
              <span className="tok-str">'{t('create.codeSample')}'</span>
              {',\n});'}
              <span className="code-caret" aria-hidden />
            </pre>
          </article>
        </div>

        <div className="section-head">
          <h2>{t('create.quickStart')}</h2>
          <button className="more" onClick={() => onOpen('inspire')}>
            {t('create.more')}
          </button>
        </div>
        <div className="quick-grid">
          <button className="studio-card studio-card--beat" onClick={onBeat}>
            <img className="studio-art" src="/beat-art.png?v=2" alt="" />
            <span className="studio-kicker">{t('create.beatKicker')}</span>
            <strong>{t('create.beatCard')}</strong>
            <p>{t('create.beatCopy')}</p>
          </button>
          <button className="studio-card studio-card--vocal" onClick={onMic}>
            <img className="studio-art" src="/vocal-art.png?v=2" alt="" />
            <span className="studio-kicker">{t('create.vocalKicker')}</span>
            <strong>{t('create.vocalCard')}</strong>
            <p>{t('create.vocalCopy')}</p>
          </button>
        </div>

        <HomeGenreRail onOpen={() => onOpen('inspire')} />
      </div>
    </section>
  );
}
