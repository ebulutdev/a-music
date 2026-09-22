import { IconBrand, IconMenu } from './Icons';
import { LangSwitch } from './LangSwitch';
import { useI18n } from '../i18n/I18nProvider';

export function Header() {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label={t('header.menu')}>
        <IconMenu />
      </button>
      <div className="brand">
        <IconBrand />
        {t('brand.name')}
      </div>
      <div className="topbar-spacer" />
      <LangSwitch />
    </header>
  );
}
