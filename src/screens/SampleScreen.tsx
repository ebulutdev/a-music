import { useEffect, useState } from 'react';
import { createSample } from '@agents';
import { LangSwitch } from '../ui/LangSwitch';
import { useI18n } from '../i18n/I18nProvider';

export function SampleScreen({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (message: string) => void;
}) {
  const { t, te, locale } = useI18n();
  const [prompt, setPrompt] = useState(t('sample.defaultPrompt'));
  const [startMs, setStartMs] = useState(400);
  const [endMs, setEndMs] = useState(2400);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrompt(t('sample.defaultPrompt'));
  }, [locale, t]);

  return (
    <section className="page">
      <div className="lang-dock">
        <LangSwitch />
      </div>
      <h1 className="library-title">{t('sample.title')}</h1>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await createSample({
              userId,
              sourceClipId: 'clip_source_demo',
              uploadUrl: 'https://cdn.local/sample.mp3',
              startMs,
              endMs,
              prompt,
            });
            onDone(t('sample.ready', { id: result.sampleId }));
          } catch (error) {
            onDone(te(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea className="field" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <input
          className="field"
          type="number"
          value={startMs}
          onChange={(e) => setStartMs(Number(e.target.value))}
          aria-label={t('sample.start')}
        />
        <input
          className="field"
          type="number"
          value={endMs}
          onChange={(e) => setEndMs(Number(e.target.value))}
          aria-label={t('sample.end')}
        />
        <button className="pill pill--cta" disabled={busy}>
          {busy ? t('sample.busy') : t('sample.submit')}
        </button>
      </form>
    </section>
  );
}
