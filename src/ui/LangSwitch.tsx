import { useI18n } from '../i18n/I18nProvider';

export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('lang.switch')}>
      <button
        type="button"
        className={locale === 'tr' ? 'is-on' : ''}
        aria-pressed={locale === 'tr'}
        onClick={() => setLocale('tr')}
      >
        {t('lang.tr')}
      </button>
      <button
        type="button"
        className={locale === 'en' ? 'is-on' : ''}
        aria-pressed={locale === 'en'}
        onClick={() => setLocale('en')}
      >
        {t('lang.en')}
      </button>
    </div>
  );
}
