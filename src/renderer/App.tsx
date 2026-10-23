// Main App Component
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, SIDEBAR_WIDTH } from './components/Sidebar';
import { UpdateBanner } from './components/UpdateBanner';
import { ParticleField, GlobalRipple } from './components/Effects';
import { Header } from './components/Header';
import { BentoGrid } from './components/BentoGrid';
import { SpiderCanvas } from './components/SpiderCanvas';
import { OverlayProvider } from './components/OverlayProvider';
import { ToastProvider } from './components/Toast';
import { useSettingsStore } from './stores/settingsStore';
import { useHardwareStore } from './stores/hardwareStore';
import { LoadingScreen } from './components/LoadingScreen';
import { useTweaksStore } from './stores/tweaksStore';

// Pages are code-split: each route becomes its own chunk so the first paint
// only downloads the shell + the landing dashboard instead of the whole app.
// The Suspense fallback mirrors the loading screen for a seamless transition.
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const GameModePage = React.lazy(() => import('./pages/GameMode').then(m => ({ default: m.GameModePage })));
const PerformancePage = React.lazy(() => import('./pages/Performance').then(m => ({ default: m.PerformancePage })));
const GPUPage = React.lazy(() => import('./pages/GPU').then(m => ({ default: m.GPUPage })));
const NetworkPage = React.lazy(() => import('./pages/Network').then(m => ({ default: m.NetworkPage })));
const PowerPage = React.lazy(() => import('./pages/Power').then(m => ({ default: m.PowerPage })));
const DebloatPage = React.lazy(() => import('./pages/Debloat').then(m => ({ default: m.DebloatPage })));
const PeripheralsInputPage = React.lazy(() => import('./pages/PeripheralsInput').then(m => ({ default: m.PeripheralsInputPage })));
const StoragePage = React.lazy(() => import('./pages/Storage').then(m => ({ default: m.StoragePage })));
const BenchmarkPage = React.lazy(() => import('./pages/Benchmark').then(m => ({ default: m.BenchmarkPage })));
const ProfilesPage = React.lazy(() => import('./pages/Profiles').then(m => ({ default: m.ProfilesPage })));
const RestorePage = React.lazy(() => import('./pages/Restore').then(m => ({ default: m.RestorePage })));
const SettingsPage = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));
const DiagnosisPage = React.lazy(() => import('./pages/Diagnosis').then(m => ({ default: m.DiagnosisPage })));
const ProPage = React.lazy(() => import('./pages/Pro').then(m => ({ default: m.ProPage })));

const PAGES = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard', component: Dashboard },
  { path: '/diagnosis', label: 'Diagnóstico', icon: 'Activity', component: DiagnosisPage },
  { path: '/game-mode', label: 'Game Mode', icon: 'Gamepad2', component: GameModePage },
  { path: '/performance', label: 'Performance', icon: 'Zap', component: PerformancePage },
  { path: '/gpu', label: 'GPU', icon: 'Cpu', component: GPUPage },
  { path: '/network', label: 'Network', icon: 'Wifi', component: NetworkPage },
  { path: '/peripherals', label: 'Peripherals', icon: 'Mouse', component: PeripheralsInputPage },
  { path: '/power', label: 'Power', icon: 'Battery', component: PowerPage },
  { path: '/debloat', label: 'Debloat', icon: 'Trash2', component: DebloatPage },
  { path: '/storage', label: 'Storage', icon: 'HardDrive', component: StoragePage },
  { path: '/benchmark', label: 'Benchmark', icon: 'Activity', component: BenchmarkPage },
  { path: '/profiles', label: 'Profiles', icon: 'UserCog', component: ProfilesPage },
  { path: '/restore', label: 'Restore', icon: 'RotateCcw', component: RestorePage },
  { path: '/settings', label: 'Settings', icon: 'Settings', component: SettingsPage },
];

function MainLayout() {
  const { theme, cinematicEffects } = useSettingsStore();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = cinematicEffects === false ? 'off' : 'on';
  }, [cinematicEffects]);

  return (
    // The height is fixed so the content column becomes a real scroll
    // container: without a bounded height the content just grows, the root
    // clips it and the lower part of every page becomes unreachable.
    // `relative isolate` makes the shell a stacking context so the ambient
    // background layer (painted at z-index -1) sits above the base black but
    // below every piece of content, without ever escaping to the page root.
    <div className="app-shell h-screen bg-background overflow-hidden relative isolate">
      {/* The sidebar is fixed and always expanded: the content column is
          offset by its width so nothing ends up underneath it. */}
      <Sidebar />
      <div className="h-screen flex flex-col min-w-0" style={{ paddingLeft: SIDEBAR_WIDTH }}>
        <Header />
        <UpdateBanner />
        <main className="flex-1 min-h-0 p-6 overflow-y-auto overflow-x-hidden relative z-10">
          {/* Keyed by the pathname so every navigation plays the fade/scale
              transition instead of swapping the content abruptly. */}
          <div key={location.pathname} className="route-enter">
            {/* Each page is a lazy chunk; Suspense covers the brief moment the
                route's code is still being fetched on first visit. */}
            <React.Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>
      <ParticleField />
      <GlobalRipple />
      <SpiderCanvas />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {  const { hardware, isLoading } = useHardwareStore();
  const { tweaks, isLoading: tweaksLoading } = useTweaksStore();

  if (isLoading || tweaksLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

/**
 * Onboarding: the first time the hardware is detected we offer the high impact
 * diagnostic. It is shown only once - the choice is remembered locally.
 */
function FirstRunDiagnosisPrompt({ hardwareDetected }: { hardwareDetected: boolean }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hardwareDetected) return;
    const dismissed = localStorage.getItem('zt:diagnosis-onboarding-dismissed');
    if (!dismissed) setVisible(true);
  }, [hardwareDetected]);

  if (!visible) return null;

  const close = () => {
    localStorage.setItem('zt:diagnosis-onboarding-dismissed', '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-lg max-h-[90vh] overflow-auto w-full max-w-xl">
        <div className="p-6">
          <h2 className="font-space text-xl font-semibold text-foreground mb-2">
            Diagnóstico de primer arranque
          </h2>
          <p className="text-sm text-muted-foreground">
            Hemos detectado tu hardware. Podemos comprobar los 11 problemas que más afectan al
            rendimiento (tasa de refresco, XMP/EXPO, GPU dedicada, plan de energía, temperaturas,
            red, drivers, procesos en segundo plano, disco, HAGS/Game Mode y cuello de botella)
            y mostrarte una lista priorizada con lo que puedes arreglar.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Tarda unos 30 segundos. No modifica nada por sí solo: solo te dice qué está mal y qué
            puedes corregir.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={close}
              className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors"
            >
              Ahora no
            </button>
            <button
              onClick={() => {
                close();
                navigate('/diagnosis');
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Ejecutar diagnóstico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const fetchHardware = useHardwareStore(state => state.fetchHardware);
  const fetchTweaks = useTweaksStore(state => state.fetchTweaks);
  const hardware = useHardwareStore(state => state.hardware);

  // Load hardware + tweak catalogue once at startup.
  useEffect(() => {
    fetchHardware();
    fetchTweaks();
  }, [fetchHardware, fetchTweaks]);

  return (
    <OverlayProvider>
      <ToastProvider>
        <div className="app h-screen w-screen overflow-hidden" data-theme="dark">
          <FirstRunDiagnosisPrompt hardwareDetected={hardware !== null} />
          <Routes>
            <Route path="/*" element={<MainLayout />}>
              <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="diagnosis" element={<ProtectedRoute><DiagnosisPage /></ProtectedRoute>} />
              <Route path="game-mode" element={<ProtectedRoute><GameModePage /></ProtectedRoute>} />
              <Route path="performance" element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />
              <Route path="gpu" element={<ProtectedRoute><GPUPage /></ProtectedRoute>} />
              <Route path="network" element={<ProtectedRoute><NetworkPage /></ProtectedRoute>} />
              <Route path="peripherals" element={<ProtectedRoute><PeripheralsInputPage /></ProtectedRoute>} />
              <Route path="power" element={<ProtectedRoute><PowerPage /></ProtectedRoute>} />
              <Route path="debloat" element={<ProtectedRoute><DebloatPage /></ProtectedRoute>} />
              <Route path="storage" element={<ProtectedRoute><StoragePage /></ProtectedRoute>} />
              <Route path="benchmark" element={<ProtectedRoute><BenchmarkPage /></ProtectedRoute>} />
              <Route path="pro" element={<ProtectedRoute><ProPage /></ProtectedRoute>} />
              <Route path="profiles" element={<ProtectedRoute><ProfilesPage /></ProtectedRoute>} />
              <Route path="restore" element={<ProtectedRoute><RestorePage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </div>
      </ToastProvider>
    </OverlayProvider>
  );
}