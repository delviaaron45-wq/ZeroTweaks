// Sidebar Component
//
// The sidebar is always visible and always expanded: a fixed 260px column with
// both the icon and the label of every section. There is no collapse state on
// purpose, so the labels can never be hidden or overlap the content.
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Gamepad2, Zap, Cpu, Wifi, Mouse, Battery, Trash2, HardDrive, Activity, UserCog, RotateCcw, Settings, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';

/** Width of the navigation column, in pixels. Shared with the main layout. */
export const SIDEBAR_WIDTH = 260;

const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/diagnosis', labelKey: 'nav.diagnosis', icon: Activity },
  { path: '/game-mode', labelKey: 'nav.gameMode', icon: Gamepad2 },
  { path: '/performance', labelKey: 'nav.performance', icon: Zap },
  { path: '/gpu', labelKey: 'nav.gpu', icon: Cpu },
  { path: '/network', labelKey: 'nav.network', icon: Wifi },
  { path: '/peripherals', labelKey: 'nav.peripherals', icon: Mouse },
  { path: '/power', labelKey: 'nav.power', icon: Battery },
  { path: '/debloat', labelKey: 'nav.debloat', icon: Trash2 },
  { path: '/storage', labelKey: 'nav.storage', icon: HardDrive },
  { path: '/benchmark', labelKey: 'nav.benchmark', icon: Activity },
  { path: '/pro', labelKey: 'nav.pro', icon: Sparkles },
  { path: '/profiles', labelKey: 'nav.profiles', icon: UserCog },
  { path: '/restore', labelKey: 'nav.restore', icon: RotateCcw },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <aside
      className={cn(
        // The width is written literally on purpose: Tailwind only generates
        // the classes it can find in the source, so a dynamic `w-[${n}px]`
        // would not exist in the CSS and the sidebar would collapse.
        'fixed left-0 top-0 z-40 h-screen w-[260px] shrink-0 bg-card border-r border-border'
      )}
      aria-label={t('nav.mainNavigation')}
    >
      <div className="flex flex-col h-full">
        {/* Logo / Brand - draggable so the window can be moved from here */}
        <div className="app-drag flex items-center gap-3 h-16 px-5 border-b border-border/70 flex-shrink-0 select-none">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_20px_-8px_rgb(59_130_246/0.9),inset_0_1px_0_rgb(255_255_255/0.35)]">
            <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="font-space text-[15px] font-bold tracking-tight truncate">
            <span className="text-blue-300">Zero</span>
            <span className="text-foreground">Tweaks</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="app-no-drag flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 px-3" aria-label={t('nav.mainNavigation')}>
          <ul className="space-y-0.5" role="list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const label = t(item.labelKey);
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300',
                      isActive
                        ? 'text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                    )}
                    title={label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <>
                        {/* Gradient pill + glowing indicator bar on the left edge */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/60 via-blue-500/25 to-transparent shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(147,197,253,0.9)]"
                        />
                      </>
                    )}
                    <Icon className="relative w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span className="relative font-medium">{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 flex-shrink-0">
          <div className="text-[11px] text-muted-foreground text-center font-mono tracking-wide truncate">
            ZeroTweaks v1.0.0-alpha
          </div>
        </div>
      </div>
    </aside>
  );
}
