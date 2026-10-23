// Header Component
import React from 'react';
import { Sun, Moon, Monitor, Bell, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import { cn } from '../utils/cn';

/** Mirrors of the sidebar paths, so the header can name the current section. */
const SECTION_PATHS = [
  { path: '/', labelKey: 'nav.dashboard' },
  { path: '/diagnosis', labelKey: 'nav.diagnosis' },
  { path: '/game-mode', labelKey: 'nav.gameMode' },
  { path: '/performance', labelKey: 'nav.performance' },
  { path: '/gpu', labelKey: 'nav.gpu' },
  { path: '/network', labelKey: 'nav.network' },
  { path: '/peripherals', labelKey: 'nav.peripherals' },
  { path: '/power', labelKey: 'nav.power' },
  { path: '/debloat', labelKey: 'nav.debloat' },
  { path: '/storage', labelKey: 'nav.storage' },
  { path: '/benchmark', labelKey: 'nav.benchmark' },
  { path: '/pro', labelKey: 'nav.pro' },
  { path: '/profiles', labelKey: 'nav.profiles' },
  { path: '/restore', labelKey: 'nav.restore' },
  { path: '/settings', labelKey: 'nav.settings' },
];

export function Header() {
  const { theme, setTheme } = useSettingsStore();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const sectionKey =
    SECTION_PATHS.find(
      (s) => pathname === s.path || (s.path !== '/' && pathname.startsWith(s.path))
    )?.labelKey ?? 'nav.dashboard';

  return (
    // The window uses `titleBarStyle: 'hidden'`, so the native minimise /
    // maximise / close buttons are drawn by the OS on the top right corner.
    // The header leaves that space free and the rest acts as the drag handle.
    <header className="app-drag h-16 bg-card/70 backdrop-blur-xl border-b border-border/70 flex items-center justify-between pl-6 pr-[150px] sticky top-0 z-30 select-none after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-blue-500/40 after:to-transparent after:content-['']">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="font-space text-xl font-bold tracking-tight gradient-text hidden sm:block">
          ZeroTweaks
        </h1>
        <ChevronRight className="w-4 h-4 text-muted-foreground/60 hidden sm:block" aria-hidden="true" />
        <span className="text-sm text-muted-foreground truncate">{t(sectionKey)}</span>
      </div>

      <div className="app-no-drag flex items-center gap-3">
        {/* Theme Toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-accent/60 p-1 backdrop-blur">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                theme === t
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_-4px_rgb(59_130_246/0.8),inset_0_1px_0_rgb(255_255_255/0.3)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
              )}
              aria-label={`Set theme to ${t}`}
              aria-pressed={theme === t}
            >
              {t === 'light' && <Sun className="w-4 h-4" />}
              {t === 'dark' && <Moon className="w-4 h-4" />}
              {t === 'system' && <Monitor className="w-4 h-4" />}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl border border-border/70 bg-accent/60 hover:border-blue-500/40 hover:bg-white/[0.06] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center ring-2 ring-black/40">
            3
          </span>
        </button>

        {/* Help */}
        <button
          className="p-2 rounded-xl border border-border/70 bg-accent/60 hover:border-blue-500/40 hover:bg-white/[0.06] transition-colors"
          aria-label="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-border/70 bg-accent/60 hover:border-blue-500/40 hover:bg-white/[0.06] transition-colors" aria-label="User menu">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]">
              ZT
            </span>
            <span className="hidden md:block font-medium text-sm">User</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}