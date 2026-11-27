import { Clock, Images, Library, MonitorSmartphone, Settings, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';

import { strings } from '@menouchat/shared';

import { ADMIN_SECTIONS, sectionLabel, sectionPath, type AdminSection } from './sections.ts';

const icons: Record<AdminSection, LucideIcon> = {
  times: Clock,
  slides: Images,
  library: Library,
  layout: MonitorSmartphone,
  settings: Settings,
};

/**
 * Tabs along the bottom on a phone, where the thumb reaches; a side menu on wider screens.
 * `settings` carries a dot while an update waits there, since nothing else announces it.
 */
export function AdminNav({ updatePending }: { updatePending: boolean }) {
  return (
    <nav
      aria-label={strings.admin.menu.label}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border/70 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:w-52 md:shrink-0 md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
    >
      <ul className="grid grid-cols-5 md:sticky md:top-24 md:flex md:flex-col md:gap-1">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = icons[section];
          const label = sectionLabel(section);
          const dot = section === 'settings' && updatePending;
          return (
            <li key={section}>
              <NavLink
                to={sectionPath(section)}
                className="relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-text-muted transition-colors hover:text-text focus-visible:outline-3 focus-visible:outline-focus aria-[current=page]:font-semibold aria-[current=page]:text-accent md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-base md:hover:bg-surface md:aria-[current=page]:bg-accent-soft"
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span>{label}</span>
                {dot && (
                  <span className="absolute top-2 left-1/2 size-2.5 -translate-x-3 rounded-full bg-danger md:static md:translate-x-0">
                    <span className="sr-only">{strings.admin.menu.updatePending}</span>
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
