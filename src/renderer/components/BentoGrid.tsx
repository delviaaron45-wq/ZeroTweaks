// BentoGrid Component - Cyberpunk Bento Grid Layout
import React, { useCallback, useRef } from 'react';
import { cn } from '../utils/cn';
import { useRipple } from './Effects';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: { base: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
}

export function BentoGrid({
  children,
  className,
  columns = { base: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 4
}: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid',
        `gap-${gap}`,
        `grid-cols-${columns.base}`,
        columns.sm ? `sm:grid-cols-${columns.sm}` : null,
        columns.md ? `md:grid-cols-${columns.md}` : null,
        columns.lg ? `lg:grid-cols-${columns.lg}` : null,
        columns.xl ? `xl:grid-cols-${columns.xl}` : null,
        className
      )}
      role="list"
      aria-label="Bento grid"
    >
      {children}
    </div>
  );
}

// BentoCard - Individual card component
interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  span?: { colStart?: number; colEnd?: number; rowStart?: number; rowEnd?: number };
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  onClick?: () => void;
  /** Status label rendered as a floating tag (e.g. "ACTIVO", "3 PROBLEMAS"). */
  status?: { label: string; tone?: 'cyan' | 'pink' | 'green' | 'amber' | 'muted' };
  /** Where the floating status tag sits. */
  statusPosition?: 'top' | 'bottom';
  /** Index used to stagger the entrance animation. */
  stagger?: number;
}

const STATUS_TONES: Record<string, string> = {
  cyan: 'text-primary border-primary/30 bg-primary/10',
  pink: 'text-accent-pink border-accent-pink/30 bg-accent-pink/10',
  green: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  amber: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  muted: 'text-muted-foreground border-border bg-accent/40',
};

export function BentoCard({
  children,
  className,
  span,
  hover = true,
  padding = 'md',
  variant = 'default',
  onClick,
  status,
  statusPosition = 'top',
  stagger,
}: BentoCardProps) {
  const { containerRef, ripplesLayer } = useRipple<HTMLElement>();
  const cardRef = useRef<HTMLElement | null>(null);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    node.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }, []);

  const style = span ? {
    gridColumn: span.colStart && span.colEnd ? `${span.colStart} / ${span.colEnd}` : undefined,
    gridRow: span.rowStart && span.rowEnd ? `${span.rowStart} / ${span.rowEnd}` : undefined,
  } : undefined;

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  const variantClasses = {
    default: 'bg-card/70 border-border/70',
    elevated: 'bg-card/85 border-border/80 shadow-lg shadow-primary/5',
    outlined: 'bg-transparent border-2 border-border/80',
    glass: 'bg-card/40 backdrop-blur-xl border-white/10',
  };

  return (
    <article
      ref={node => {
        cardRef.current = node;
        containerRef.current = node;
      }}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      style={{
        ...(style as React.CSSProperties),
        animationDelay: stagger !== undefined ? `${stagger * 60}ms` : undefined,
      }}
      className={cn(
        'glass-surface spotlight overflow-hidden',
        'stagger-in',
        paddingClasses[padding],
        variantClasses[variant],
        hover && 'hover:-translate-y-[3px]',
        onClick && 'cursor-pointer',
        className
      )}
      role="listitem"
    >
      {status && (
        <span
          className={cn(
            'status-tag absolute z-10',
            statusPosition === 'top' ? 'right-4 top-4' : 'right-4 bottom-4'
          )}
        >
          <span className="status-tag-dot" />
          {status.label}
        </span>
      )}
      {children}
      {ripplesLayer}
    </article>
  );
}

// BentoCardHeader
export function BentoCardHeader({
  title,
  subtitle,
  icon,
  action,
  className
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 ring-1 ring-inset ring-primary/20">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-space text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// BentoCardContent
export function BentoCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

// BentoCardFooter
export function BentoCardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border/60', className)}>{children}</div>;
}
