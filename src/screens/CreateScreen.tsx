import { Header } from '../ui/Header';
import { HomeGenreRail } from '../ui/HomeGenreRail';
import { useI18n } from '../i18n/I18nProvider';

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
            <div className="code-card-header" aria-hidden>
              <div className="code-terminal-dots">
                <span className="dot dot--red" />
                <span className="dot dot--yellow" />
                <span className="dot dot--green" />
              </div>
              <div className="code-header-badge">
                <span className="code-chip">AI SYNTHESIS</span>
                <span className="code-engine">irishrap.core</span>
              </div>
              <span className="code-status-pill">● READY</span>
            </div>
            <pre className="code-block">
              <span className="tok-comment">// ⚡ Prompt'tan stüdyo miksine:</span>{'\n'}
              <span className="tok-kw">const</span> <span className="tok-var">track</span> = <span className="tok-kw">await</span> <span className="tok-fn">irishrap.compose</span>({'{'}{'\n'}
              {'  '}<span className="tok-key">vibe</span>: <span className="tok-str">'gece sürüşü • lofi & 808'</span>,{'\n'}
              {'  '}<span className="tok-key">pipeline</span>: [<span className="tok-val">'beat'</span>, <span className="tok-val">'autotune-vocal'</span>]{'\n'}
              {'}'});
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
