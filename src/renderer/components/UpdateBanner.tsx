// Update banner.
//
// Shows a slim bar when a newer version is published. The download and the
// installation are handled by the main process; this component only shows the
// state and forwards the click.
import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from './Toast';
import type { UpdateStatus } from '../../shared/types/index';

export function UpdateBanner() {
  const { error } = useToastActions();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // The main process pushes the state; the first value arrives immediately.
    const unsubscribe = zerotweaks.update.onStatus(next => setStatus(next));
    void zerotweaks.update.check().catch(() => {
      /* a failed check must not break the app */
    });
    return unsubscribe;
  }, []);

  const info = status?.info;
  const available = status?.phase === 'available' && info?.available;
  const downloading = status?.phase === 'downloading' || status?.phase === 'verifying';
  const installing = status?.phase === 'installing' || status?.phase === 'ready';

  if (!available && !downloading && !installing) return null;
  if (dismissed && !info?.mandatory) return null;

  const startDownload = async () => {
    const result = await zerotweaks.update.download().catch(err => ({ ok: false, error: err.message }));
    if (!result.ok && result.error) {
      error('No se pudo actualizar', result.error);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-6 py-2 text-sm border-b',
        installing
          ? 'bg-green-500/10 border-green-500/20 text-green-300'
          : 'bg-primary/10 border-primary/20 text-foreground'
      )}
      role="status"
    >
      {installing ? (
        <>
          <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span className="flex-1">
            {status?.phase === 'ready'
              ? 'Actualización lista. Reiniciando la aplicación...'
              : 'Instalando la actualización y reiniciando...'}
          </span>
        </>
      ) : downloading ? (
        <>
          <Download className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span className="flex-1">
            Descargando la actualización… {Math.round(status?.percent ?? 0)}%
            {status?.totalBytes ? ` (${formatBytes(status.downloadedBytes)} / ${formatBytes(status.totalBytes)})` : ''}
          </span>
          <div className="w-32 h-1.5 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round(status?.percent ?? 0)}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="flex-1">
            Nueva versión disponible{' '}
            <span className="font-mono font-medium">[v{info?.latestVersion}]</span>
            {info?.notes ? ` — ${info.notes}` : ''}
          </span>
          <button
            onClick={startDownload}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Actualizar
          </button>
          {!info?.mandatory && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Descartar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
