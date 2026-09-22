import type { View } from '../lib/nav';
import { IconFolder, IconGrid, IconHome, IconInspire, IconSpark } from './Icons';
import { useI18n } from '../i18n/I18nProvider';

const ITEMS: Array<{ view: View; labelKey: 'nav.home' | 'nav.inspire' | 'nav.create' | 'nav.tools' | 'nav.assets'; icon: 'home' | 'inspire' | 'create' | 'tools' | 'assets' }> = [
  { view: 'create', labelKey: 'nav.home', icon: 'home' },
  { view: 'inspire', labelKey: 'nav.inspire', icon: 'inspire' },
  { view: 'vocal', labelKey: 'nav.create', icon: 'create' },
  { view: 'tools', labelKey: 'nav.tools', icon: 'tools' },
  { view: 'library', labelKey: 'nav.assets', icon: 'assets' },
];

export function BottomNav({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label={t('nav.main')}>
      {ITEMS.map((item) => {
        const active =
          item.icon === 'create'
            ? view === 'vocal'
            : item.icon === 'home'
              ? view === 'create'
              : view === item.view ||
                (item.icon === 'tools' && ['tools', 'mashup', 'cover', 'sample'].includes(view)) ||
                (item.icon === 'assets' && view === 'library');
        if (item.icon === 'create') {
          return (
            <button
              key="create"
              className="nav-item nav-item--create"
              onClick={() => onChange('vocal')}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`nav-create${active ? ' is-active' : ''}`}>
                <IconSpark />
              </span>
              <span>{t('nav.create')}</span>
            </button>
          );
        }
        return (
          <button
            key={item.labelKey}
            className={`nav-item${active ? ' is-active' : ''}`}
            onClick={() => onChange(item.view)}
          >
            {item.icon === 'home' && <IconHome />}
            {item.icon === 'inspire' && <IconInspire />}
            {item.icon === 'tools' && <IconGrid />}
            {item.icon === 'assets' && <IconFolder />}
            <span>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
