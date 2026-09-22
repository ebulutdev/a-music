import { useEffect, useState } from 'react';
import { createCover } from '@agents';
import { LangSwitch } from '../ui/LangSwitch';
import { useI18n } from '../i18n/I18nProvider';

export function CoverScreen({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (message: string) => void;
}) {
  const { t, te, locale } = useI18n();
  const [title, setTitle] = useState(t('cover.defaultTitle'));
  const [style, setStyle] = useState(t('cover.defaultStyle'));
  const [prompt, setPrompt] = useState(t('cover.defaultPrompt'));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(t('cover.defaultTitle'));
    setStyle(t('cover.defaultStyle'));
    setPrompt(t('cover.defaultPrompt'));
  }, [locale, t]);

  return (
    <section className="page">
      <div className="lang-dock">
        <LangSwitch />
      </div>
      <h1 className="library-title">{t('cover.title')}</h1>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await createCover({
              userId,
              uploadUrl: 'https://cdn.local/source.mp3',
              sourceClipId: 'clip_source_demo',
              customMode: false,
              instrumental: false,
              prompt,
              style,
              title,
            });
            onDone(t('cover.ready', { id: result.coverId }));
          } catch (error) {
            onDone(te(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('cover.placeholderTitle')} />
        <input className="field" value={style} onChange={(e) => setStyle(e.target.value)} placeholder={t('cover.placeholderStyle')} />
        <textarea className="field" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <button className="pill pill--cta" disabled={busy}>
          {busy ? t('cover.busy') : t('cover.submit')}
        </button>
      </form>
    </section>
  );
}
