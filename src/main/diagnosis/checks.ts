// Diagnosis checks - the 11 mandatory high-impact checks
import type {
  HardwareProfile,
} from '../../shared/types/index.js';
import type {
  DiagnosisProblem,
  ImpactLevel,
  BottleneckResult,
} from '../../shared/types/diagnosis.js';
import type { InGameGameConfig } from '../../shared/types/diagnosis.js';
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';

export interface CheckContext {
  hardware: HardwareProfile;
  /** Active power plan GUID (from powercfg). */
  activePowerPlan: string;
  /** Windows build number. */
  build: number;
  /** Whether running on battery right now. */
  onBattery: boolean;
}

/** Build a problem object with safe defaults. */
function problem(p: Partial<DiagnosisProblem> & { id: string; title: string; impact: ImpactLevel }): DiagnosisProblem {
  return {
    checkId: p.id,
    category: 'software',
    description: '',
    expected: 'Mejora medible tras aplicar',
    fixable: false,
    ...p,
  } as DiagnosisProblem;
}

// ---------------------------------------------------------------------------
// 1. Monitor refresh rate (ALTO)
// ---------------------------------------------------------------------------
export async function checkRefreshRate(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  try {
    const { stdout } = await execPowerShell(`
      $v = Get-CimInstance Win32_VideoController | Select-Object -First 1
      @{ Current = $v.CurrentRefreshRate; Max = $v.MaxRefreshRate; Min = $v.MinRefreshRate; Name = $v.Name } | ConvertTo-Json
    `);
    const info = JSON.parse(stdout.trim());
    const current = info.Current ?? 60;
    const max = info.Max ?? current;
    if (current >= max || max <= 60) return null;

    return problem({
      id: 'display.refresh_rate',
      title: 'El monitor no está en su tasa de refresco máxima',
      description: `Tu monitor soporta ${max} Hz pero Windows está usando ${current} Hz. Forzar la tasa máxima mejora la fluidez y la latencia de entrada.`,
      impact: 'alto',
      expected: 'Más fluidez y menos latencia percibida (depende del juego)',
      category: 'display',
      fixable: true,
      fixAction: 'set_refresh_rate',
      fixParams: { current, target: max },
      evidence: { current, max, monitor: info.Name },
    });
  } catch (err) {
    logger.warn('refresh rate check failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. RAM speed / XMP-EXPO and channels (ALTO)
// ---------------------------------------------------------------------------
export async function checkMemory(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  try {
    const { stdout } = await execPowerShell(`
      $m = Get-CimInstance Win32_PhysicalMemory
      $grouped = ($m | Group-Object BankLabel).Count
      @{
        Speed = ($m | Select-Object -First 1).Speed
        Configured = ($m | Select-Object -First 1).ConfiguredClockSpeed
        ConfiguredVoltage = ($m | Select-Object -First 1).ConfiguredVoltage
        Count = $m.Count
        Channels = $grouped
        TotalGB = [math]::Round(($m | Measure-Object -Property Capacity -Sum).Sum / 1GB, 1)
      } | ConvertTo-Json
    `);
    const m = JSON.parse(stdout.trim());
    const configured = m.Configured ?? m.Speed;
    const speed = m.Speed ?? configured;
    const channels = m.Channels ?? 1;

    const xmpDisabled = configured > speed + 100; // nominal higher than actual
    const singleChannel = channels < 2;

    if (!xmpDisabled && !singleChannel) return null;

    const guides: { step: number; text: string }[] = [];
    if (xmpDisabled) {
      guides.push(
        { step: 1, text: 'Reinicia y entra en la BIOS/UEFI (tecla Supr o F2 durante el arranque).' },
        { step: 2, text: 'Busca la sección de memoria (Intel: XMP / Extreme Memory Profile; AMD: EXPO / DOCP / A-XMP).' },
        { step: 3, text: 'Activa el perfil XMP/EXPO (Profile 1) que corresponda a la velocidad de tus módulos.' },
        { step: 4, text: 'Guarda y reinicia (F10). Vuelve aquí y pulsa "Volver a diagnosticar".' },
      );
    }
    if (singleChannel) {
      guides.push(
        { step: guides.length + 1, text: 'Detectado un solo canal de memoria. Coloca los módulos en los slots recomendados del manual (normalmente A2/B2) para activar dual-channel.' },
      );
    }

    return problem({
      id: 'memory.xmp_channels',
      title: xmpDisabled ? 'XMP/EXPO está desactivado: la RAM va más lenta de lo que permite' : 'La RAM está en single-channel',
      description: xmpDisabled
        ? `Los módulos permiten ${configured} MHz pero Windows los está usando a ${speed} MHz. Activar XMP/EXPO en la BIOS los pondrá a su velocidad nominal.`
        : `Se detectó un solo canal de memoria. Dual-channel aumenta el ancho de banda y mejora los mínimos en juegos.`,
      impact: 'alto',
      expected: 'Mejora de ancho de banda; en juegos, mejoras de mínimos (1% lows) en muchos casos',
      category: 'memory',
      fixable: false,
      guide: guides,
      evidence: { configured, speed, channels, dimms: m.Count, totalGB: m.TotalGB },
    });
  } catch (err) {
    logger.warn('memory check failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. Laptop using iGPU instead of dGPU (ALTO)
// ---------------------------------------------------------------------------
export async function checkDedicatedGpu(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  if (!ctx.hardware.isLaptop) return null;
  try {
    const { stdout } = await execPowerShell(`
      $gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.PNPDeviceID -like 'PCI*' }
      @{ Count = $gpus.Count; Names = ($gpus.Name -join ' | '); HasDiscrete = (($gpus | Where-Object { $_.Name -match 'NVIDIA|AMD|Radeon|GeForce|RTX|RX' }).Count -gt 0) } | ConvertTo-Json
    `);
    const g = JSON.parse(stdout.trim());
    // No discrete GPU -> nothing to fix.
    if (!g.HasDiscrete) return null;

    // Check whether the user has forced high-performance GPU for any app.
    const { stdout: pref } = await execPowerShell(`
      try { (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences' -ErrorAction Stop | Out-String) } catch { 'NONE' }
    `);
    const configured = !pref.includes('NONE');

    if (configured) return null;

    return problem({
      id: 'gpu.dedicated_selection',
      title: 'El portátil puede estar usando la GPU integrada en lugar de la dedicada',
      description: `Se detectó una GPU dedicada (${g.Names}) pero no hay preferencia de GPU configurada por aplicación. Forzar la GPU de alto rendimiento evita que los juegos usen la integrada.`,
      impact: 'alto',
      expected: 'Salto grande de FPS si antes usaba la iGPU; ninguno si ya usaba la dedicada',
      category: 'gpu',
      fixable: true,
      fixAction: 'force_dedicated_gpu',
      fixParams: { gpuNames: g.Names },
      evidence: { adapters: g.Names, count: g.Count },
    });
  } catch (err) {
    logger.warn('dedicated gpu check failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 4. Power plan / Windows 11 power mode (MEDIO)
// ---------------------------------------------------------------------------
const ULTIMATE_GUID = 'e9a42b02-d5df-448d-aa00-03f14749eb61';
const HIGH_GUID = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
const BALANCED_GUID = '381b4222-f694-41f0-9685-ff5bb260df2e';

export async function checkPowerPlan(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  const plan = ctx.activePowerPlan.toLowerCase();
  const isUltimate = plan.includes(ULTIMATE_GUID);
  const isHigh = plan.includes(HIGH_GUID);

  if (isUltimate) return null;

  const batteryNote = ctx.onBattery
    ? ' Estás con batería: el plan de alto rendimiento reducirá la autonomía. Podrás revertirlo al cerrar el juego.'
    : '';

  return problem({
    id: 'power.plan',
    title: ctx.onBattery
      ? 'Plan de energía no óptimo para jugar (y estás con batería)'
      : 'Plan de energía no óptimo para máximo rendimiento',
    description: `El plan activo no es Ultimate Performance ni Alto rendimiento. Cambiarlo evita que el procesador reduzca su frecuencia durante el juego.${batteryNote}`,
    impact: 'medio',
    expected: 'Frecuencias de CPU más estables; mejora variable según el equipo',
    category: 'power',
    fixable: true,
    fixAction: 'set_power_plan',
    fixParams: { target: ctx.hardware.isLaptop ? 'high' : 'ultimate', onBattery: ctx.onBattery },
    relatedTweaks: ctx.hardware.isLaptop ? ['power.high_performance'] : ['power.ultimate_performance'],
    evidence: { active: ctx.activePowerPlan, onBattery: ctx.onBattery },
  });
}

// ---------------------------------------------------------------------------
// 5. Thermal throttling / temperatures (ALTO)
// ---------------------------------------------------------------------------
export async function checkThermal(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  try {
    const { stdout } = await execPowerShell(`
      $zones = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue
      if ($zones) {
        $temps = $zones | ForEach-Object { [math]::Round(($_.CurrentTemperature / 10) - 273.15, 1) }
        @{ Temps = $temps; Max = ($temps | Measure-Object -Maximum).Maximum } | ConvertTo-Json
      } else {
        @{ Temps = @(); Max = 0 } | ConvertTo-Json
      }
    `);
    const t = JSON.parse(stdout.trim());
    const max = t.Max ?? 0;

    // Proactively flag only when we have a reading above a safe threshold.
    if (max <= 0 || max < 85) return null;

    return problem({
      id: 'thermal.throttling',
      title: 'Temperaturas altas: riesgo de throttling térmico',
      description: `Se registraron hasta ${max} °C en zonas térmicas. Por encima de ~85-90 °C el procesador o la GPU reducen su frecuencia (throttling), perdiendo rendimiento.`,
      impact: 'alto',
      expected: 'Recuperar frecuencias plenas; la mejora depende de cuánto estaba throttling',
      category: 'thermal',
      fixable: false,
      guide: [
        { step: 1, text: 'Limpia el polvo de ventiladores y rejillas (aire comprimido, equipo apagado).' },
        { step: 2, text: 'Comprueba que los ventiladores giran y que el equipo tiene flujo de aire.' },
        { step: 3, text: 'En portátiles, usa una base de refrigeración y evita superficies blandas.' },
        { step: 4, text: 'Si las temperaturas siguen altas tras meses de uso, valora cambiar la pasta térmica.' },
        { step: 5, text: 'Vuelve a diagnosticar para confirmar la bajada de temperatura.' },
      ],
      evidence: { maxTemp: max },
    });
  } catch (err) {
    logger.warn('thermal check failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 6. Bottleneck (measured under a short load test)
// ---------------------------------------------------------------------------
export async function measureBottleneck(ctx: CheckContext, durationMs = 8000): Promise<BottleneckResult> {
  const samples = { cpu: [] as number[], gpu: [] as number[], ram: [] as number[], disk: [] as number[] };
  const perCore: number[][] = [];
  const start = Date.now();

  while (Date.now() - start < durationMs) {
    try {
      const { stdout } = await execPowerShell(`
        $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        $os = Get-CimInstance Win32_OperatingSystem
        $ram = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
        $cores = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -ne '_Total' } | Select-Object -ExpandProperty PercentProcessorTime
        "$cpu|$ram|$($cores -join ',')"
      `);
      const [cpuS, ramS, coresS] = stdout.trim().split('|');
      const cpu = parseFloat(cpuS) || 0;
      const ram = parseFloat(ramS) || 0;
      samples.cpu.push(cpu);
      samples.ram.push(ram);
      if (coresS) {
        const cores = coresS.split(',').map((x: string) => parseFloat(x) || 0);
        perCore.push(cores);
      }
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const cpuAvg = Math.min(avg(samples.cpu), 100);
  const ramAvg = Math.min(avg(samples.ram), 100);

  // GPU utilisation via the locale independent performance class (best-effort).
  let gpu = 0;
  try {
    const { stdout } = await execPowerShell(`
      $g = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue |
        Measure-Object -Property UtilizationPercentage -Maximum
      if ($null -ne $g.Maximum) { $g.Maximum } else { 0 }
    `);
    gpu = Math.min(parseFloat(stdout.trim()) || 0, 100);
  } catch {}

  const diskAvg = 0; // measured separately when needed
  const cpuPerCore = perCore.length
    ? Array.from({ length: Math.max(...perCore.map((c) => c.length)) }, (_, i) => avg(perCore.map((c) => c[i] ?? 0)))
    : [];

  let limiter: BottleneckResult['limiter'] = 'NONE';
  let explanation = 'No se detectó un cuello de botella claro en esta medición.';

  const maxCore = cpuPerCore.length ? Math.max(...cpuPerCore) : 0;
  const oneCoreMaxed = maxCore >= 95;
  const allCoresHigh = cpuAvg >= 90 && maxCore >= 85;
  const gpuMaxed = gpu >= 95;
  const ramHigh = ramAvg >= 92;

  if (gpuMaxed) {
    limiter = 'GPU';
    explanation = 'La GPU está al 100%: es tu límite. Bajar la carga gráfica (sombras, efectos, resolución) dará más FPS.';
  } else if (oneCoreMaxed || allCoresHigh) {
    limiter = 'CPU';
    explanation = oneCoreMaxed
      ? 'Un núcleo de la CPU está saturado: el juego depende de un solo hilo. No se soluciona con tweaks de GPU.'
      : 'Todos los núcleos de la CPU están muy cargados: la CPU limita el rendimiento.';
  } else if (ramHigh) {
    limiter = 'RAM';
    explanation = 'La RAM está casi llena: el sistema puede estar paginando a disco, causando tirones.';
  } else if (gpu >= 0 && gpu < 70 && cpuAvg > 80) {
    limiter = 'CPU';
    explanation = 'La CPU trabaja mucho mientras la GPU está holgada: la CPU es el límite.';
  }

  return {
    limiter,
    explanation,
    cpuPerCore,
    cpuAvg,
    gpu,
    vram: 0,
    ram: ramAvg,
    disk: diskAvg,
    measuredUnderLoad: samples.cpu.length > 0,
    durationMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 7. Network (MEDIO / BAJO)
// ---------------------------------------------------------------------------
export async function checkNetwork(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  try {
    const { stdout } = await execPowerShell(`
      $a = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true } | Select-Object -First 1
      $p = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -eq $a.Name } | Select-Object -First 1
      $sig = 0
      try { $sig = (Get-NetAdapterAdvancedProperty -Name $a.Name -RegistryKeyword 'SignalStrength' -ErrorAction Stop).RegistryValue } catch {}
      @{
        Name = $a.Name
        Description = $a.InterfaceDescription
        Speed = $a.LinkSpeed
        MediaType = $a.MediaType
        IsWiFi = ($a.InterfaceDescription -match 'Wi-Fi|Wireless|802.11')
        Category = $p.Name
      } | ConvertTo-Json
    `);
    const n = JSON.parse(stdout.trim());
    if (!n.Name) return null;

    const problems: string[] = [];
    if (n.IsWiFi) {
      problems.push('Estás en Wi-Fi: un cable Ethernet siempre da menos latencia y menos jitter.');
    }

    return problem({
      id: 'network.interface',
      title: n.IsWiFi ? 'Conexión Wi-Fi: posible fuente de latencia e inestabilidad' : 'Revisión de red',
      description:
        problems.length > 0
          ? problems.join(' ')
          : 'Tu conexión por cable es adecuada. Aun así revisa el ahorro de energía del adaptador.',
      impact: n.IsWiFi ? 'medio' : 'bajo',
      expected: 'Menos jitter y picos de ping si cambias a cable o mejoras la señal',
      category: 'network',
      fixable: true,
      fixAction: 'disable_adapter_power_save',
      fixParams: { adapter: n.Name },
      evidence: { adapter: n.Name, isWifi: n.IsWiFi, speed: n.Speed, mediaType: n.MediaType },
    });
  } catch (err) {
    logger.warn('network check failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 8. GPU driver version (MEDIO)
// ---------------------------------------------------------------------------
export async function checkGpuDriver(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  const vendor = ctx.hardware.gpu.vendor;
  const version = ctx.hardware.gpu.driverVersion;
  if (!version || vendor === 'Unknown') return null;

  const urls: Record<string, string> = {
    NVIDIA: 'https://www.nvidia.com/Download/index.aspx',
    AMD: 'https://www.amd.com/es/support',
    Intel: 'https://www.intel.com/content/www/es/es/download-center/home.html',
  };

  return problem({
    id: 'driver.gpu',
    title: `Driver de GPU ${vendor}: comprueba si está actualizado`,
    description: `Versión detectada: ${version}. Los controladores nuevos traen optimizaciones de juego y correcciones. Si tu versión es antigua, actualizar puede mejorar el rendimiento y la estabilidad.`,
    impact: 'medio',
    expected: 'Optimizaciones específicas del juego; mejora variable según la versión',
    category: 'driver',
    fixable: false,
    guide: [
      { step: 1, text: `Abre la web oficial de controladores de ${vendor} (botón de abajo).` },
      { step: 2, text: 'Descarga la última versión para tu modelo exacto.' },
      { step: 3, text: 'Instálala y reinicia. Evita instalarla encima si el instalador lo desaconseja.' },
      { step: 4, text: 'En casos problemáticos, usa DDU en modo seguro antes de instalar (opción avanzada).' },
    ],
    fixParams: { url: urls[vendor] },
    evidence: { vendor, version },
  });
}

// ---------------------------------------------------------------------------
// 9. Startup programs / overlays / background processes (MEDIO)
// ---------------------------------------------------------------------------
const OVERLAY_PROCESSES = [
  { name: 'Discord', exe: 'Discord.exe', note: 'Desactiva el overlay en Ajustes > Overlay en juego.' },
  { name: 'Xbox Game Bar', exe: 'GameBar.exe', note: 'Desactívala en Configuración > Juegos > Xbox Game Bar.' },
  { name: 'NVIDIA Overlay', exe: 'NVIDIA Overlay.exe', note: 'Desactívalo en GeForce Experience si no lo usas.' },
  { name: 'Steam', exe: 'steam.exe', note: 'Cierra el cliente si no lo necesitas mientras juegas.' },
  { name: 'Epic Games Launcher', exe: 'EpicGamesLauncher.exe', note: 'Ciérralo tras lanzar el juego.' },
  { name: 'Razer Cortex', exe: 'Razer Cortex.exe', note: 'Los "game boosters" a veces estorban más de lo que ayudan.' },
  { name: 'OneDrive', exe: 'OneDrive.exe', note: 'Sincroniza en segundo plano; puedes pausarlo.' },
  { name: 'Spotify', exe: 'Spotify.exe', note: 'Consume CPU y red en segundo plano.' },
];

export async function checkBackgroundProcesses(): Promise<DiagnosisProblem | null> {
  try {
    const { stdout } = await execPowerShell(`
      $running = Get-Process | Select-Object -ExpandProperty ProcessName
      $hits = @()
      $list = @(${OVERLAY_PROCESSES.map((p) => `'${p.exe.replace('.exe', '')}'`).join(',')})
      foreach ($name in $list) {
        if ($running -contains $name) { $hits += $name }
      }
      @{ Found = $hits; Count = $hits.Count } | ConvertTo-Json
    `);
    const r = JSON.parse(stdout.trim());
    if (!r.Found || r.Found.length === 0) return null;

    const found = OVERLAY_PROCESSES.filter((p) => r.Found.includes(p.exe.replace('.exe', '')));
    const notes = found.map((p) => `${p.name}: ${p.note}`);

    return problem({
      id: 'software.background_processes',
      title: `Detectados ${found.length} programas en segundo plano que pueden consumir recursos`,
      description: notes.join(' '),
      impact: 'medio',
      expected: 'Más CPU/RAM libre para el juego; mejora variable',
      category: 'software',
      fixable: true,
      fixAction: 'close_process',
      fixParams: { processes: r.Found },
      relatedTweaks: ['debloat.xbox_game_bar'],
      evidence: { found: r.Found },
    });
  } catch (err) {
    logger.warn('background process check failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 10. Free space and disk health (MEDIO)
// ---------------------------------------------------------------------------
export async function checkStorage(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  try {
    const { stdout } = await execPowerShell(`
      $v = Get-Volume -DriveLetter C -ErrorAction SilentlyContinue
      $d = Get-PhysicalDisk | Where-Object { $_.DeviceID -eq 0 } | Select-Object MediaType, HealthStatus
      @{
        FreeGB = if ($v) { [math]::Round($v.SizeRemaining / 1GB, 1) } else { 0 }
        SizeGB = if ($v) { [math]::Round($v.Size / 1GB, 1) } else { 0 }
        MediaType = if ($d) { $d.MediaType } else { 'Unknown' }
        Health = if ($d) { $d.HealthStatus } else { 'Unknown' }
      } | ConvertTo-Json
    `);
    const s = JSON.parse(stdout.trim());
    const freePct = s.SizeGB > 0 ? (s.FreeGB / s.SizeGB) * 100 : 100;
    const isHdd = s.MediaType === 'HDD';
    const lowSpace = freePct < 10;

    if (!lowSpace && !isHdd) return null;

    const reasons: string[] = [];
    if (lowSpace) reasons.push(`Queda menos del 10% libre en C: (${s.FreeGB} GB de ${s.SizeGB} GB).`);
    if (isHdd) reasons.push('La unidad del sistema es un HDD mecánico: los juegos cargan mucho más lento y pueden dar tirones.');

    return problem({
      id: 'storage.space_health',
      title: isHdd && lowSpace ? 'Disco casi lleno y tipo HDD' : isHdd ? 'El disco del sistema es un HDD' : 'Poco espacio libre en disco',
      description: `${reasons.join(' ')} Mover los juegos a un SSD y liberar espacio mejora los tiempos de carga y reduce tirones.`,
      impact: 'medio',
      expected: 'Cargas mucho más rápidas y menos tirones de streaming si pasas a SSD',
      category: 'storage',
      fixable: false,
      guide: [
        { step: 1, text: 'Libera espacio: vacía la papelera, borra %TEMP% y usa "Liberar espacio en disco".' },
        { step: 2, text: 'Instala un SSD si no tienes uno; mover Windows y los juegos a SSD es la mejora más grande.' },
        { step: 3, text: 'Mueve los juegos a otro SSD con el cliente correspondiente (Steam/Epic/Battle.net).' },
      ],
      evidence: { freeGB: s.FreeGB, sizeGB: s.SizeGB, mediaType: s.MediaType, health: s.Health },
    });
  } catch (err) {
    logger.warn('storage check failed', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 11. Resizable BAR / HAGS / Game Mode (MEDIO)
// ---------------------------------------------------------------------------
export async function checkFeatures(ctx: CheckContext): Promise<DiagnosisProblem | null> {
  const findings: string[] = [];
  let fixable = false;
  let fixAction: DiagnosisProblem['fixAction'];

  // HAGS
  const { stdout: hags } = await execPowerShell(`
    try { (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name HwSchMode -ErrorAction Stop).HwSchMode } catch { 0 }
  `).catch(() => ({ stdout: '0' }));
  const hagsMode = parseInt(hags.trim()) || 0;
  if (hagsMode !== 2 && ctx.hardware.gpu.supportsHAGS) {
    findings.push('HAGS está desactivado y tu GPU lo soporta. Activo puede reducir latencia.');
    fixable = true;
    fixAction = 'enable_hags';
  }

  // Game Mode
  const { stdout: gm } = await execPowerShell(`
    try { (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\GameBar' -Name AutoGameModeEnabled -ErrorAction Stop).AutoGameModeEnabled } catch { 0 }
  `).catch(() => ({ stdout: '0' }));
  if ((parseInt(gm.trim()) || 0) !== 1) {
    findings.push('Game Mode está desactivado.');
    fixable = true;
    fixAction = 'enable_game_mode';
  }

  if (findings.length === 0) return null;

  return problem({
    id: 'features.hags_gamemode',
    title: 'Hay características de rendimiento sin activar',
    description: findings.join(' '),
    impact: 'medio',
    expected: 'Mejora variable; HAGS puede reducir latencia de entrada',
    category: 'features',
    fixable,
    fixAction,
    relatedTweaks: ['gpu.hags', 'gaming.game_mode'],
  });
}

// ---------------------------------------------------------------------------
// All checks, in priority order
// ---------------------------------------------------------------------------
export interface CheckResult {
  problems: DiagnosisProblem[];
  bottleneck: BottleneckResult;
}

export async function runAllChecks(ctx: CheckContext): Promise<CheckResult> {
  const bottleneck = await measureBottleneck(ctx);
  const results = await Promise.all([
    checkRefreshRate(ctx),
    checkMemory(ctx),
    checkDedicatedGpu(ctx),
    checkPowerPlan(ctx),
    checkThermal(ctx),
    checkNetwork(ctx),
    checkGpuDriver(ctx),
    checkBackgroundProcesses(),
    checkStorage(ctx),
    checkFeatures(ctx),
  ]);

  const problems = results.filter((r: DiagnosisProblem | null): r is DiagnosisProblem => r !== null);

  // Bottleneck becomes a problem too when it's a real limiter.
  if (bottleneck.limiter !== 'NONE') {
    problems.push(
      problem({
        id: 'bottleneck.main',
        title: `Cuello de botella: ${bottleneck.limiter}`,
        description: bottleneck.explanation,
        impact: bottleneck.limiter === 'GPU' || bottleneck.limiter === 'CPU' ? 'alto' : 'medio',
        expected: 'Depende de qué recurso limita; ajusta ese recurso para mejorar',
        category: 'bottleneck',
        fixable: false,
        guide: [
          { step: 1, text: 'Revisa la tarjeta "Cuello de botella" para ver el uso por recurso.' },
          { step: 2, text: 'Ajusta los ajustes del juego o del sistema según el recurso limitante.' },
        ],
        evidence: { limiter: bottleneck.limiter },
      }),
    );
  }

  // Sort by impact priority.
  const order: Record<ImpactLevel, number> = { alto: 0, medio: 1, bajo: 2 };
  problems.sort((a: DiagnosisProblem, b: DiagnosisProblem) => order[a.impact] - order[b.impact]);

  return { problems, bottleneck };
}

// ---------------------------------------------------------------------------
// In-game config discovery (Fortnite first)
// ---------------------------------------------------------------------------
export function discoverGames(): InGameGameConfig[] {
  const games: InGameGameConfig[] = [
    {
      gameId: 'fortnite',
      name: 'Fortnite',
      executable: 'FortniteClient-Win64-Shipping.exe',
      configPath:
        '%LOCALAPPDATA%\\FortniteGame\\Saved\\Config\\WindowsClient\\GameUserSettings.ini',
      supported: true,
      writableKeys: {
        '/Script/Engine.GameUserSettings': [
          'bUseVSync',
          'bUseDynamicResolution',
          'FrameRateLimit',
          'PreferredRefreshRate',
        ],
        '/Script/Engine.Engine': ['t.MaxFPS'],
        'SystemSettings': [
          'r.ShadowQuality',
          'r.TextureQuality',
          'r.ViewDistanceQuality',
          'r.EffectsQuality',
          'r.AntiAliasingMethod',
          'r.PostProcessAAQuality',
          'r.ReflectionQuality',
          'r.FoliageQuality',
          'r.ShadingRate',
          'r.ScreenPercentage',
          'r.MotionBlurQuality',
          'r.DepthOfFieldQuality',
        ],
        'FortniteGame.FortPerformanceSettings': [],
      },
    },
    {
      gameId: 'valorant',
      name: 'Valorant',
      executable: 'VALORANT-Win64-Shipping.exe',
      configPath: '%LOCALAPPDATA%\\VALORANT\\Saved\\Config\\WindowsClient\\GameUserSettings.ini',
      supported: false,
    },
    {
      gameId: 'cs2',
      name: 'Counter-Strike 2',
      executable: 'cs2.exe',
      configPath: '%PROGRAMFILES(X86)%\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\cfg\\video.txt',
      supported: false,
    },
  ];
  return games;
}
