// Full-screen loading state shown while the app detects hardware and tweaks.
import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground text-sm">Cargando configuración del sistema...</p>
    </div>
  );
}

export default LoadingScreen;
