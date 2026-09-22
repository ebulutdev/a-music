import { useEffect, useState } from 'react';
import { createMashup } from '@agents';
import type { VocalMode } from '@agents';
import { FIREBASE_SEED_IDS } from '@db/firebase-collections';
import { LangSwitch } from '../ui/LangSwitch';
import { useI18n } from '../i18n/I18nProvider';

export function MashupScreen({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (message: string) => void;
}) {
  const { t, te, locale } = useI18n();
  const [title, setTitle] = useState(t('mashup.defaultTitle'));
  const [mode, setMode] = useState<VocalMode>('auto_lyrics');
  const [prompt, setPrompt] = useState(t('mashup.defaultPrompt'));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(t('mashup.defaultTitle'));
    setPrompt(t('mashup.defaultPrompt'));
  }, [locale, t]);

  return (
    <section className="page">
      <div className="lang-dock">
        <LangSwitch />
      </div>
      <h1 className="library-title">{t('mashup.title')}</h1>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await createMashup({
              userId,
              leftUrl: 'https://cdn.local/left.mp3',
              rightUrl: 'https://cdn.local/right.mp3',
              leftRef: FIREBASE_SEED_IDS.songs.nightDrive,
              rightRef: FIREBASE_SEED_IDS.songs.harborLights,
              vocalMode: mode,
              prompt,
              title,
            });
            onDone(t('mashup.ready', { id: result.mashupId }));
          } catch (error) {
            onDone(te(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('mashup.placeholderTitle')} />
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value as VocalMode)}>
          <option value="auto_lyrics">{t('mashup.modeAuto')}</option>
          <option value="exact_lyrics">{t('mashup.modeExact')}</option>
          <option value="instrumental">{t('mashup.modeInstrumental')}</option>
        </select>
        <textarea className="field" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <button className="pill pill--cta" disabled={busy}>
          {busy ? t('mashup.busy') : t('mashup.submit')}
        </button>
      </form>
    </section>
  );
}
