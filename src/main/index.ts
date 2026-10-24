// Main process entry point
import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, protocol } from 'electron';
import { join } from 'path';
import fs from 'fs';
import { isDev } from './utils/env';
import { createMainWindow } from './windows/mainWindow';
import { setupIpcHandlers } from './ipc/handlers';
import { initializeNative } from './native/bridge';
import { logger } from './utils/logger';
import { PreflightChecks } from './system/preflight';
import { BackupManager } from './system/backup';
import { JournalManager } from './system/journal';
import { GameModeManager } from './gaming/gameMode';
import { OverlayManager } from './overlay/manager';
import { SpiderManager } from './spider/manager';
import { DiagnosisManager } from './diagnosis/manager';
import { InsightsManager } from './insights/manager';
import { BenchmarkManager } from './benchmark/manager';
import { UpdateManager } from './updater';
import { ProManager } from './pro/manager';
import { readJson } from '../shared/utils/files.js';
import { getAppDataPath } from '../shared/utils/files.js';
import type { Settings } from '../shared/types/index.js';

/** Default manifest checked at start-up. It can be changed in Ajustes. */
const DEFAULT_UPDATE_URL = 'https://zerotweaks.github.io/updates/version.json';

const updateManager = new UpdateManager();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let diagnosisManager: DiagnosisManager;

  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App initialization
  const initializeApp = async () => {
    // Security: prevent navigation to external URLs
    app.on('web-contents-created', (_event, contents) => {
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
          event.preventDefault();
        }
      });

      contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:')) {
          shell.openExternal(url);
          return { action: 'deny' };
        }
        return { action: 'allow' };
      });
    });

    // Initialize logger
    logger.info('ZeroTweaks starting...');
    logger.info(`Electron ${process.versions.electron}, Chrome ${process.versions.chrome}, Node ${process.versions.node}`);

    // Initialize native module
    await initializeNative();

    // Run preflight checks
    const preflight = await PreflightChecks.run();
    if (!preflight.ok) {
      logger.error('Preflight checks failed:', preflight.errors);
    }

    // Initialize managers
    const backupManager = new BackupManager();
    const journalManager = new JournalManager();
    const gameModeManager = new GameModeManager();
    const overlayManager = new OverlayManager();
    const spiderManager = new SpiderManager();
    diagnosisManager = new DiagnosisManager();
    const insightsManager = new InsightsManager();
    const benchmarkManager = new BenchmarkManager();
    const proManager = new ProManager();
    await benchmarkManager.initialize();

    // Setup IPC handlers
    setupIpcHandlers({
      backupManager,
      journalManager,
      gameModeManager,
      overlayManager,
      spiderManager,
      benchmarkManager,
      diagnosisManager,
      insightsManager,
      updateManager,
      proManager,
    });

    // Background version check
    void checkForUpdatesInBackground();

    // Create main window. A failure here must never kill the process without
    // telling the user why, otherwise the app just "does not open".
    let mainWindow: BrowserWindow;
    try {
      mainWindow = await createMainWindow();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error('Could not create the main window:', reason);
      dialog.showErrorBox(
        'ZeroTweaks',
        `No se ha podido abrir la ventana principal.\n\n${reason}\n\nRevisa el registro en %APPDATA%\\ZeroTweaks\\logs`
      );
      app.quit();
      return;
    }

    // Headless verification hook (ZT_SMOKE=1): renders the UI, runs the diagnostic
    // and prints a summary so the module can be verified without a display.
    if (process.env.ZT_SMOKE) {
      const smokeFile = getAppDataPath('logs', 'zt-smoke.log');
      const smokeLog = (message: string) => {
        console.log(message);
        try {
          fs.appendFileSync(smokeFile, `${message}\n`);
        } catch {
          /* ignore */
        }
      };

      setTimeout(async () => {
        try {
          smokeLog(`[ZT_SMOKE] DEBUG: Smoke test started, ZT_SMOKE_APPLY=${process.env.ZT_SMOKE_APPLY}, ZT_SMOKE_ROUTES=${process.env.ZT_SMOKE_ROUTES}`);
          const wc = mainWindow.webContents;
          const report = await wc.executeJavaScript(
            `window.zerotweaks.diagnosis.run().then(r => JSON.stringify({ score: r.score, summary: r.summary, bottleneck: r.bottleneck.limiter, fineTune: r.fineTune.length, games: r.games.map(g => g.gameId), problems: r.problems.map(p => p.checkId + ':' + p.impact + (p.fixable ? ':fixable' : '')) })).catch(e => 'ERROR: ' + e.message)`
          );
          smokeLog(`[ZT_SMOKE] diagnosis -> ${String(report)}`);

          if (process.env.ZT_SMOKE_INSIGHTS) {
            const insights = await wc.executeJavaScript(
              `Promise.all([
                 window.zerotweaks.insights.drivers().then(r => 'drivers:' + r.verdict + ':' + r.suspects.length).catch(e => 'drivers-ERR:' + e.message),
                 window.zerotweaks.insights.cpu().then(r => 'cpu:' + r.hybrid + ':' + r.performanceCores).catch(e => 'cpu-ERR:' + e.message),
                 window.zerotweaks.insights.display().then(r => 'display:' + r.refreshRate + ':' + r.findings.length).catch(e => 'display-ERR:' + e.message),
                 window.zerotweaks.insights.memoryFiles().then(r => 'memfiles:' + r.shaderCaches.length + ':' + r.findings.length).catch(e => 'memfiles-ERR:' + e.message),
                 window.zerotweaks.insights.heavySoftware().then(r => 'heavy:' + r.apps.filter(a => a.running).length).catch(e => 'heavy-ERR:' + e.message),
                 window.zerotweaks.insights.checklist().then(r => 'checklist:' + r.length).catch(e => 'checklist-ERR:' + e.message),
                 window.zerotweaks.insights.fpsLimiter().then(r => 'fps:' + r.suggestedCap + ':' + r.gpuUtilization).catch(e => 'fps-ERR:' + e.message),
                 window.zerotweaks.insights.thermal(null, null, false).then(r => 'thermal:' + r.onBattery).catch(e => 'thermal-ERR:' + e.message),
                 window.zerotweaks.insights.pausable().then(r => 'pausable:' + r.length).catch(e => 'pausable-ERR:' + e.message),
                 window.zerotweaks.insights.biosGuides().then(r => 'bios:' + r.length).catch(e => 'bios-ERR:' + e.message),
                 window.zerotweaks.insights.gameProfiles().then(r => 'games:' + r.length).catch(e => 'games-ERR:' + e.message),
                 window.zerotweaks.insights.comparison(true).then(r => 'cmp:' + r.percentile).catch(e => 'cmp-ERR:' + e.message),
                 window.zerotweaks.insights.repairActions().then(r => 'repair:' + r.length).catch(e => 'repair-ERR:' + e.message),
                 window.zerotweaks.insights.isElevated().then(r => 'elevated:' + r).catch(e => 'elevated-ERR:' + e.message)
               ]).then(r => r.join(' | '))`
            );
            smokeLog(`[ZT_SMOKE] insights -> ${String(insights)}`);

            const stutter = await wc.executeJavaScript(
              `window.zerotweaks.insights.stutter(8000).then(r => 'stutter:' + r.sampleCount + ':' + r.dominantCause + ':' + r.peaks.length).catch(e => 'stutter-ERR:' + e.message)`
            );
            smokeLog(`[ZT_SMOKE] stutter -> ${String(stutter)}`);
          }

          if (process.env.ZT_SMOKE_LANG) {
            const navBefore = await wc.executeJavaScript(
              `[...document.querySelectorAll('nav a')].map(a => a.textContent.trim()).join(',')`
            );
            smokeLog(`[ZT_SMOKE] nav (initial) -> ${navBefore}`);

            // Go to the settings page first.
            await wc.executeJavaScript(
              `(() => { const link = [...document.querySelectorAll('nav a')].find(a => (a.getAttribute('href') || '').includes('settings')); if (link) { link.click(); return 'ok'; } return 'not-found'; })()`
            );
            await new Promise(r => setTimeout(r, 1200));

            const clickLanguage = async (needle: string) => {
              return wc.executeJavaScript(`(function(){
                const buttons = [...document.querySelectorAll('button')];
                const target = buttons.find(b => b.textContent.includes(${JSON.stringify(needle)}));
                if (!target) return 'not-found';
                target.click();
                return 'clicked';
              })()`);
            };
            const navNow = () =>
              wc.executeJavaScript(
                `[...document.querySelectorAll('nav a')].map(a => a.textContent.trim()).join(',')`
              );

            smokeLog(`[ZT_SMOKE] click español -> ${await clickLanguage('Español')}`);
            await new Promise(r => setTimeout(r, 800));
            smokeLog(`[ZT_SMOKE] nav (es) -> ${await navNow()} | lang=${await wc.executeJavaScript('document.documentElement.lang')}`);

            smokeLog(`[ZT_SMOKE] click english -> ${await clickLanguage('English')}`);
            await new Promise(r => setTimeout(r, 800));
            const navAfter = await navNow();
            const htmlLang = await wc.executeJavaScript('document.documentElement.lang');
            const stored = await wc.executeJavaScript(
              `JSON.parse(localStorage.getItem('zerotweaks-settings') || '{}').state?.language`
            );
            smokeLog(`[ZT_SMOKE] nav (en) -> ${navAfter} | html.lang=${htmlLang} | stored=${stored}`);

            // Leave the app in the language of the system.
            await clickLanguage('Español');
            await new Promise(r => setTimeout(r, 500));
            smokeLog(`[ZT_SMOKE] final -> ${await wc.executeJavaScript('document.documentElement.lang')}`);
          }

          if (process.env.ZT_SMOKE_LAYOUT) {
            const layout = await wc.executeJavaScript(`(function(){
              const aside = document.querySelector('aside');
              const main = document.querySelector('main');
              const links = [...document.querySelectorAll('aside nav a')];
              const labels = links.map(a => a.textContent.trim());
              const hidden = links.filter(a => {
                const span = a.querySelector('span');
                if (!span) return true;
                const r = span.getBoundingClientRect();
                return r.width < 10 || r.height < 8 || getComputedStyle(span).display === 'none';
              }).length;
              const collapseButtons = [...document.querySelectorAll('aside button')].length;
              return JSON.stringify({
                asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
                asideLeft: aside ? Math.round(aside.getBoundingClientRect().left) : null,
                mainLeft: main ? Math.round(main.getBoundingClientRect().left) : null,
                linkCount: links.length,
                labelsWithText: labels.filter(l => l.length > 0).length,
                labels: labels.join('|'),
                hiddenLabels: hidden,
                collapseButtons
              });
            })()`);
            smokeLog(`[ZT_SMOKE] layout -> ${layout}`);
          }

          if (process.env.ZT_SMOKE_LAYOUT) {
            const scroll = await wc.executeJavaScript(`(function(){
              const main = document.querySelector('main');
              const header = document.querySelector('header');
              const nav = document.querySelector('aside nav');
              const before = main ? main.scrollTop : -1;
              if (main) main.scrollTop = 400;
              const after = main ? main.scrollTop : -1;
              if (main) main.scrollTop = before;
              return JSON.stringify({
                mainClientHeight: main ? main.clientHeight : null,
                mainScrollHeight: main ? main.scrollHeight : null,
                mainScrollable: after > before,
                mainOverflowY: main ? getComputedStyle(main).overflowY : null,
                navOverflowY: nav ? getComputedStyle(nav).overflowY : null,
                headerAppRegion: header ? getComputedStyle(header).webkitAppRegion : null,
                asideAppRegion: getComputedStyle(document.querySelector('aside')).webkitAppRegion
              });
            })()`);
            smokeLog(`[ZT_SMOKE] scroll -> ${scroll}`);
          }

          if (process.env.ZT_SMOKE_PRO) {
            const pro = await wc.executeJavaScript(
              `Promise.all([
                 window.zerotweaks.pro.bios().then(r => 'bios:' + r.boardVendor + '/' + r.memory.configuredMHz + 'MHz/' + r.memory.channels + 'ch/' + r.findings.length + 'hallazgos').catch(e => 'bios-ERR:' + e.message),
                 window.zerotweaks.pro.scanCaches().then(r => 'cache:' + r.entries.length + 'carpetas/' + r.totalSizeMB + 'MB').catch(e => 'cache-ERR:' + e.message),
                 window.zerotweaks.pro.battery().then(r => 'battery:' + r.hasBattery + '/' + r.onBattery + '/' + r.activePlanName).catch(e => 'battery-ERR:' + e.message),
                 window.zerotweaks.pro.buildBundle().then(r => 'bundle:' + r.format + '/' + Object.keys(r.settings).length + 'ajustes').catch(e => 'bundle-ERR:' + e.message),
                 window.zerotweaks.pro.syncConfig().then(r => 'sync:' + r.enabled).catch(e => 'sync-ERR:' + e.message),
                 window.zerotweaks.pro.latencyPing().then(r => 'ping:ok').catch(e => 'ping-ERR:' + e.message),
                 window.zerotweaks.insights.biosGuides().then(r => 'guides:' + r.length).catch(e => 'guides-ERR:' + e.message)
               ]).then(r => r.join(' | '))`
            );
            smokeLog(`[ZT_SMOKE] pro -> ${pro}`);

            // Navigate to the PRO page and capture it.
            await wc.executeJavaScript(
              `(() => { const link = [...document.querySelectorAll('nav a')].find(a => (a.getAttribute('href') || '').includes('/pro')); if (link) { link.click(); return 'ok'; } return 'not-found'; })()`
            );
            await new Promise(r => setTimeout(r, 6000));
            await wc.executeJavaScript(
              `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('BIOS y placa')); if (b) { b.click(); return 'ok'; } return 'not-found'; })()`
            );
            await new Promise(r => setTimeout(r, 4000));
            const biosText = await wc.executeJavaScript(
              'document.querySelector("main").innerText.replace(/\\s+/g, " ").slice(0, 700)'
            );
            smokeLog(`[ZT_SMOKE] bios card -> ${biosText}`);
            const proPage = await wc.executeJavaScript(
              `(() => { const tabs = [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Latencia') || b.textContent.includes('BIOS') || b.textContent.includes('Cach') || b.textContent.includes('Ahorro') || b.textContent.includes('Perfiles')); return JSON.stringify({ title: document.querySelector('h1')?.textContent, tabs: tabs.length, body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 200) }); })()`
            );
            smokeLog(`[ZT_SMOKE] pro page -> ${proPage}`);
          }

          // Ripple check: click a harmless button and capture the shock wave.
          if (process.env.ZT_SMOKE_RIPPLE) {
            await wc.executeJavaScript(
              '(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Alto"); if (b) { b.click(); return "clicked"; } return "not-found"; })()'
            );
            await new Promise(r => setTimeout(r, 120));
            const waves = await wc.executeJavaScript(
              'document.querySelectorAll(".ripple-wave").length'
            );
            const reduced = await wc.executeJavaScript(
              "window.matchMedia('(prefers-reduced-motion: reduce)').matches"
            );
            smokeLog(`[ZT_SMOKE] ripples en el DOM -> ${waves} | reduced-motion=${reduced}`);
            const ripple = await mainWindow.webContents.capturePage();
            fs.writeFileSync(process.env.ZT_SMOKE_RIPPLE, ripple.toPNG());
          }

          if (process.env.ZT_SMOKE_SHOT) {
            await wc.executeJavaScript(
              '(() => { const m = document.querySelector("main"); if (m) m.scrollTop = 0; return 0; })()'
            );
            await new Promise(r => setTimeout(r, 600));
            const shot = await mainWindow.webContents.capturePage();
            fs.writeFileSync(process.env.ZT_SMOKE_SHOT, shot.toPNG());
            smokeLog(`[ZT_SMOKE] screenshot -> ${process.env.ZT_SMOKE_SHOT}`);
          }

          // Dashboard check: the module cards had two real "nothing shows" bugs
          // (an invalid CSS gradient on the progress bar and a dynamically built
          // icon class Tailwind could never emit), plus the nav active state.
          if (process.env.ZT_SMOKE_DASH) {
            await wc.executeJavaScript(
              `(() => { const link = [...document.querySelectorAll('nav a')].find(a => (a.getAttribute('href') || '') === '#/' || (a.getAttribute('href') || '') === '/'); if (link) { link.click(); return 'clicked'; } return 'not-found'; })()`
            );
            let attempts = 0;
            for (; attempts < 10; attempts++) {
              await new Promise(r => setTimeout(r, 2000));
              const probe = await wc.executeJavaScript(
                `JSON.stringify({ tiles: document.querySelectorAll('main .btn-action, main .group').length, loading: document.body.innerText.includes('Cargando configuración') })`
              );
              if (!JSON.parse(String(probe)).loading) break;
            }
            await new Promise(r => setTimeout(r, 800));
            const report = await wc.executeJavaScript(
              `(() => {
                const navActive = [...document.querySelectorAll('nav a[aria-current="page"]')].map(a => a.textContent.trim());
                const bar = [...document.querySelectorAll('main div')].find(d => getComputedStyle(d).backgroundImage.includes('linear-gradient') && d.style.width);
                const icon = [...document.querySelectorAll('main svg')].find(s => s.closest('.group') && getComputedStyle(s).color !== 'rgb(245, 245, 245)');
                const tiles = [...document.querySelectorAll('main .group')].length;
                return JSON.stringify({
                  hash: location.hash,
                  loading: document.body.innerText.includes('Cargando configuración'),
                  navActive,
                  tiles,
                  barPainted: bar ? getComputedStyle(bar).backgroundImage.slice(0, 60) : 'none-found',
                  barWidth: bar ? bar.style.width : null,
                  iconColor: icon ? getComputedStyle(icon).color : 'n/a',
                });
              })()`
            );
            smokeLog(`[ZT_SMOKE] dash report -> ${report}`);

            // Diagnostic only: force a width on one progress bar to prove the
            // gradient now renders. The real value stays 0% while nothing is
            // applied; this is reverted immediately after measuring.
            const barProbe = await wc.executeJavaScript(
              `(() => {
                const bar = [...document.querySelectorAll('main div')].find(d => d.style.width && getComputedStyle(d).backgroundImage.includes('linear-gradient'));
                if (!bar) return 'no-bar';
                const parentW = bar.parentElement ? bar.parentElement.getBoundingClientRect().width : 0;
                bar.style.transition = 'none';
                bar.dataset.ztPrevWidth = bar.style.width;
                bar.style.width = '60%';
                return JSON.stringify({ parentW, gradient: getComputedStyle(bar).backgroundImage.slice(0, 48) });
              })()`
            );
            await new Promise(r => setTimeout(r, 400));
            const barForced = await wc.executeJavaScript(
              `(() => {
                const bar = [...document.querySelectorAll('main div')].find(d => d.style.width === '60%' && getComputedStyle(d).backgroundImage.includes('linear-gradient'));
                const forcedW = bar ? bar.getBoundingClientRect().width : -1;
                // Restore the exact inline width captured before forcing 60%.
                // Clearing it would make the div a full-width block (and the
                // 500ms transition would animate it open) until React re-renders.
                if (bar) { bar.style.transition = ''; bar.style.width = bar.dataset.ztPrevWidth || ''; delete bar.dataset.ztPrevWidth; }
                return JSON.stringify({ forcedW, reverted: bar ? bar.style.width !== '60%' : false });
              })()`
            );
            smokeLog(`[ZT_SMOKE] dash bar probe -> ${barProbe} | forced -> ${barForced}`);
            smokeLog(`[ZT_SMOKE] dash bar probe -> ${barProbe}`);
            await wc.executeJavaScript(
              '(() => { const m = document.querySelector("main"); if (m) m.scrollTop = 0; return 0; })()'
            );
            mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.invalidate();
            await new Promise(r => setTimeout(r, 700));
            const dashShot = await mainWindow.webContents.capturePage();
            fs.writeFileSync(process.env.ZT_SMOKE_DASH, dashShot.toPNG());
            mainWindow.setAlwaysOnTop(false);
            smokeLog(`[ZT_SMOKE] dash screenshot -> ${process.env.ZT_SMOKE_DASH}`);
          }

          // Premium TweakCard check: navigate to the tweak catalogue and poll
          // until the full cards are mounted (the route is gated while the
          // stores settle), then bring one into view and capture it.
          if (process.env.ZT_SMOKE_CARD) {
            await wc.executeJavaScript(
              `(() => { const link = [...document.querySelectorAll('nav a')].find(a => (a.getAttribute('href') || '').includes('performance')); if (link) { link.click(); return 'clicked'; } return 'not-found'; })()`
            );
            let found = 0;
            let attempts = 0;
            for (; attempts < 13; attempts++) {
              await new Promise(r => setTimeout(r, 2000));
              const probe = await wc.executeJavaScript(
                `JSON.stringify({ actions: document.querySelectorAll('main .btn-action').length, loading: document.body.innerText.includes('Cargando configuración') })`
              );
              const parsed = JSON.parse(String(probe)) as { actions: number; loading: boolean };
              found = parsed.actions;
              if (found > 0) break;
            }
            await wc.executeJavaScript(
              `(() => {
                const action = document.querySelector('main .btn-action');
                const card = action ? action.closest('.glass-surface') : null;
                if (card) card.scrollIntoView({ block: 'center' });
                return 0;
              })()`
            );
            await new Promise(r => setTimeout(r, 900));
            // Report the computed styles actually applied to a tweak card:
            // this is live DOM truth, unlike a screenshot of an occluded window.
            const report = await wc.executeJavaScript(
              `(() => {
                const action = document.querySelector('main .btn-action');
                const card = action ? action.closest('.glass-surface') : null;
                if (card) card.scrollIntoView({ block: 'center' });
                const tag = document.querySelector('main .status-tag');
                const cs = card ? getComputedStyle(card) : null;
                const tagCs = tag ? getComputedStyle(tag) : null;
                const h1 = document.querySelector('main h1');
                const wm = h1 ? getComputedStyle(h1, '::before') : null;
                return JSON.stringify({
                  hash: location.hash,
                  loading: document.body.innerText.includes('Cargando configuración'),
                  cardRadius: cs ? cs.borderRadius : null,
                  cardBackdrop: cs ? cs.backdropFilter : null,
                  cardBorder: cs ? cs.borderTopColor : null,
                  tagText: tag ? tag.textContent.trim() : null,
                  tagRadius: tagCs ? tagCs.borderRadius : null,
                  actionShadow: action ? getComputedStyle(action).boxShadow.slice(0, 70) : null,
                  watermarkSize: wm ? wm.fontSize : null,
                  watermarkStroke: wm ? wm.webkitTextStrokeWidth : null,
                  bodyBg: getComputedStyle(document.body).backgroundColor,
                  actions: document.querySelectorAll('main .btn-action').length,
                  tags: document.querySelectorAll('main .status-tag').length,
                  spotlights: document.querySelectorAll('main .spotlight').length,
                });
              })()`
            );
            smokeLog(`[ZT_SMOKE] card report -> ${report}`);

            // Raise the window and paint a marker so the captured frame cannot
            // be a stale composite from before the navigation.
            mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
            mainWindow.focus();
            await wc.executeJavaScript(
              `(() => { document.documentElement.style.setProperty('--zt-probe', '1'); return 0; })()`
            );
            mainWindow.webContents.invalidate();
            await new Promise(r => setTimeout(r, 900));
            const cardShot = await mainWindow.webContents.capturePage();
            fs.writeFileSync(process.env.ZT_SMOKE_CARD, cardShot.toPNG());
            mainWindow.setAlwaysOnTop(false);
            smokeLog(`[ZT_SMOKE] card screenshot -> ${process.env.ZT_SMOKE_CARD}`);
          }

          if (process.env.ZT_SMOKE_SETTINGS) {
            await wc.executeJavaScript(
              `(() => { const link = [...document.querySelectorAll('nav a')].find(a => (a.getAttribute('href') || '').includes('settings')); if (link) { link.click(); return 'ok'; } return 'not-found'; })()`
            );
            await new Promise(r => setTimeout(r, 1500));
            await wc.executeJavaScript(
              `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Avanzado')); if (b) { b.click(); return 'ok'; } return 'not-found'; })()`
            );
            await new Promise(r => setTimeout(r, 900));
            const shot = await mainWindow.webContents.capturePage();
            fs.writeFileSync(process.env.ZT_SMOKE_SETTINGS, shot.toPNG());
            smokeLog(`[ZT_SMOKE] settings screenshot -> ${process.env.ZT_SMOKE_SETTINGS}`);
          }

          if (process.env.ZT_SMOKE_UPDATE) {
            const banner = await wc.executeJavaScript(`(function(){
              const el = [...document.querySelectorAll('div')].find(d =>
                d.textContent.includes('Nueva versión disponible') &&
                getComputedStyle(d).display !== 'none' &&
                d.getBoundingClientRect().height > 0
              );
              const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Actualizar');
              return JSON.stringify({
                visible: !!el,
                text: el ? el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 120) : null,
                hasUpdateButton: !!btn,
                bannerHeight: el ? Math.round(el.getBoundingClientRect().height) : 0
              });
            })()`);
            smokeLog(`[ZT_SMOKE] update banner -> ${banner}`);

            // Screenshot the banner before installing.
            if (process.env.ZT_SMOKE_SHOT) {
              const shot = await mainWindow.webContents.capturePage();
              fs.writeFileSync(process.env.ZT_SMOKE_SHOT, shot.toPNG());
            }

            // Click "Actualizar" and follow the phases of the download.
            await wc.executeJavaScript(
              `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Actualizar'); if (b) { b.click(); return 'clicked'; } return 'not-found'; })()`
            );
            const phases: string[] = [];
            for (let i = 0; i < 20; i++) {
              const phase = await wc.executeJavaScript(
                `window.zerotweaks.update.status().then(s => s.phase + ':' + Math.round(s.percent))`
              ).catch(() => 'gone');
              if (!phases.includes(String(phase))) phases.push(String(phase));
              if (String(phase).startsWith('installing') || String(phase) === 'gone') break;
              await new Promise(r => setTimeout(r, 250));
            }
            smokeLog(`[ZT_SMOKE] update phases -> ${phases.join(' > ')}`);
          }

          if (process.env.ZT_SMOKE_APPLY) {
            // Test actual Apply/Revert via IPC directly (no UI click needed)
            const applyTweaks = [
              'debloat.remove_apps',
              'privacy.telemetry_minimum',
              'privacy.advertising_id',
              'debloat.startup_apps',
            ];
            
            smokeLog(`[ZT_SMOKE_APPLY] DEBUG: env var set, starting tests...`);
            smokeLog(`[ZT_SMOKE_APPLY] Starting apply tests for ${applyTweaks.length} tweaks...`);
            
            for (const tweakId of applyTweaks) {
              try {
                smokeLog(`[ZT_SMOKE_APPLY] Testing ${tweakId}...`);
                
                // Test detect first
                const detectResult = await wc.executeJavaScript(
                  `window.zerotweaks.tweaks['tweak:detect']('${tweakId}').then(r => JSON.stringify({ ok: true, value: r })).catch(e => JSON.stringify({ ok: false, error: e.message }))`
                );
                smokeLog(`[ZT_SMOKE_APPLY] ${tweakId} detect -> ${detectResult}`);
                
                // Test apply (dryRun)
                const applyResult = await wc.executeJavaScript(
                  `window.zerotweaks.tweaks['tweak:apply']('${tweakId}', { dryRun: true }).then(r => JSON.stringify({ ok: true, data: r })).catch(e => JSON.stringify({ ok: false, error: e.message }))`
                );
                smokeLog(`[ZT_SMOKE_APPLY] ${tweakId} apply dryRun -> ${applyResult}`);
                
                // Test verify
                const verifyResult = await wc.executeJavaScript(
                  `window.zerotweaks.tweaks['tweak:verify']('${tweakId}', ${detectResult}).then(r => JSON.stringify({ ok: true, verified: r })).catch(e => JSON.stringify({ ok: false, error: e.message }))`
                );
                smokeLog(`[ZT_SMOKE_APPLY] ${tweakId} verify -> ${verifyResult}`);
                
              } catch (e: any) {
                smokeLog(`[ZT_SMOKE_APPLY] ${tweakId} FAILED: ${e.message}`);
              }
            }
          }
          
          if (process.env.ZT_SMOKE_ROUTES) {
            // Walk every route to prove each lazy chunk loads over file:// and
            // nothing throws while rendering. A collector is injected once and
            // reset before each navigation so errors are attributed per route.
            await wc.executeJavaScript(`
              (() => {
                const w = window;
                w.__ztRouteErrors = [];
                const record = (kind) => (...args) => {
                  const msg = args.map(a => (a && a.message) || String(a)).join(' ');
                  w.__ztRouteErrors.push(kind + ': ' + msg);
                };
                w.addEventListener('error', record('error'), true);
                w.addEventListener('unhandledrejection', record('rejection'));
                const origError = console.error.bind(console);
                console.error = (...args) => { record('console.error')(...args); origError(...args); };
                return 'installed';
              })()
            `);

            const routes = [
              ['/', 'Dashboard'],
              ['/diagnosis', 'Diagnosis'],
              ['/game-mode', 'GameMode'],
              ['/performance', 'Performance'],
              ['/gpu', 'GPU'],
              ['/network', 'Network'],
              ['/peripherals', 'Peripherals'],
              ['/power', 'Power'],
              ['/debloat', 'Debloat'],
              ['/storage', 'Storage'],
              ['/benchmark', 'Benchmark'],
              ['/pro', 'Pro'],
              ['/profiles', 'Profiles'],
              ['/restore', 'Restore'],
              ['/settings', 'Settings'],
            ] as const;

            const routeResults: string[] = [];
            let routeFailures = 0;
            for (const [route, name] of routes) {
              await wc.executeJavaScript(
                `(() => { window.__ztRouteErrors = []; location.hash = '#${route}'; return location.hash; })()`
              );
              // Poll until the lazy chunk resolved: the Suspense/ProtectedRoute
              // spinner is gone and real content sits inside <main>.
              let rendered = false;
              for (let i = 0; i < 40 && !rendered; i++) {
                await new Promise(r => setTimeout(r, 250));
                rendered = await wc.executeJavaScript(
                  `(() => {
                    const m = document.querySelector('main');
                    if (!m) return false;
                    if (m.querySelector('.animate-spin')) return false;
                    return m.innerText.trim().length > 60;
                  })()`
                );
              }
              // Give async effects a moment to surface late errors.
              await new Promise(r => setTimeout(r, 500));
              const errs: string[] = await wc.executeJavaScript('window.__ztRouteErrors.slice()');
              const ok = rendered && errs.length === 0;
              if (!ok) routeFailures++;
              // Compact DOM diagnosis to make failures actionable from the log.
              const dom = await wc.executeJavaScript(
                `(() => { const m = document.querySelector('main'); return JSON.stringify({ hash: location.hash, main: !!m, spin: m ? m.querySelectorAll('.animate-spin').length : -1, text: m ? m.innerText.trim().length : -1 }); })()`
              );
              routeResults.push(
                `${ok ? 'PASS' : 'FAIL'} ${name} ${dom}${errs.length ? ' [' + errs.join(' || ') + ']' : ''}`
              );
            }
            for (const line of routeResults) smokeLog(`[ZT_SMOKE_ROUTES] ${line}`);
            smokeLog(`[ZT_SMOKE_ROUTES] summary -> ${routes.length - routeFailures}/${routes.length} rutas OK`);
          }

          if (process.env.ZT_SMOKE_SHOT) {
            await wc.executeJavaScript(
              `(() => { const link = [...document.querySelectorAll('nav a')].find(a => a.getAttribute('href') === '/'); if (link) { link.click(); return 'ok'; } return 'not-found'; })()`
            );
            await new Promise(r => setTimeout(r, 16000));
            // Scroll to the bottom to prove the lower content is reachable.
            await wc.executeJavaScript(
              `(() => { const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight; return m ? m.scrollTop : -1; })()`
            );
            await new Promise(r => setTimeout(r, 600));
            await wc.executeJavaScript('(() => { const m = document.querySelector("main"); if (m) m.scrollTop = 0; return 0; })()');
            await new Promise(r => setTimeout(r, 700));
            const image = await mainWindow.webContents.capturePage();
            const shotPath = process.env.ZT_SMOKE_SHOT;
            fs.writeFileSync(shotPath, image.toPNG());
            smokeLog(`[ZT_SMOKE] screenshot -> ${shotPath}`);
          }
        } catch (err) {
          smokeLog(`[ZT_SMOKE] failed -> ${(err as Error).message}`);
        } finally {
          app.quit();
        }
      }, 25000);
    }

    // Handle app ready
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
      }
    });

    // Handle window-all-closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle before-quit for cleanup
    app.on('before-quit', async () => {
      logger.info('ZeroTweaks shutting down...');
      await overlayManager.hide();
      await journalManager.flush();
    });

    logger.info('ZeroTweaks initialized successfully');
  };

  // Start app when ready
  app.whenReady().then(initializeApp).catch(err => {
    logger.error('Failed to initialize app:', err);
    app.quit();
  });
}

/**
 * Background version check. It runs a few seconds after start-up so it never
 * delays the launch, and a failure is only logged.
 */
async function checkForUpdatesInBackground(): Promise<void> {
  try {
    const settings = await readJson<Settings>(getAppDataPath('settings.json'));
    const url = process.env.ZT_UPDATE_URL || settings?.updateUrl || DEFAULT_UPDATE_URL;
    if (!url) return;
    await updateManager.checkForUpdate(url);
  } catch (err) {
    logger.warn('Background update check failed', err);
  }
}

// Handle certificate errors (for self-signed dev certs)
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});