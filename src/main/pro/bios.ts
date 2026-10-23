// BIOS / board diagnostics.
//
// Detects, with the information Windows really exposes, whether the memory
// profile (XMP/EXPO) is active, whether Resizable BAR is supported/enabled,
// whether the CPU virtualisation is on and whether C-States are enabled.
//
// Every finding states how confident it is and which evidence supports it:
// nothing is presented as certain when Windows cannot prove it.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import type { BiosDiagnostics, Confidence, ProFinding } from '../../shared/types/pro.js';

/** JEDEC base speeds per memory generation (MHz). */
const JEDEC_BASE = [800, 1066, 1333, 1600, 2133, 2400, 2666, 2933, 3200, 4800];

/** Maximum memory speed per CPU platform (reference values). */
const PLATFORM_MAX_MHZ: { match: RegExp; max: number }[] = [
  { match: /i[3579]-1[1-4]\d{3}/i, max: 5600 }, // Intel 11th-14th gen DDR5
  { match: /i[3579]-\d{4,5}/i, max: 3200 }, // Intel older, DDR4
  { match: /ryzen\s*[3579]|epyc/i, max: 5200 }, // AMD Zen 3/4
  { match: /ryzen\s*[12]\d{3}/i, max: 3200 }, // AMD Zen 1/2
];

/** CPUs that support Resizable BAR. */
const REBAR_CPU = /i[3579]-1[1-4]\d{3}|ryzen\s*[3579]|epyc\s*[3-9]|core\s*i[579]-1[12]\d{3}/i;

/** GPUs that support Resizable BAR (needs 2 GB of VRAM or more). */
function gpuSupportsResizableBar(model: string, vramMB: number): boolean {
  if (vramMB < 2000) return false;
  return /rtx\s*(20|30|40|50)|rx\s*(5|6|7)|arc\s*a/i.test(model);
}

export async function analyseBios(): Promise<BiosDiagnostics> {
  const notes = [
    'Windows no expone la configuración de la BIOS: el estado de XMP/EXPO y de Resizable BAR se deduce de lo que el sistema reporta.',
    'El estado de C-States solo es verificable si el Fabricante del BIOS publica el registro correspondiente.',
  ];

  try {
    const { stdout } = await execPowerShell(`
      $board = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1
      $bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
      $cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
      $mem = Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue
      $video = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue |
        Where-Object { $_.AdapterRAM } | Sort-Object -Property AdapterRAM -Descending | Select-Object -First 1
      $cpuInfo = Get-ItemProperty 'HKLM:\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0' -ErrorAction SilentlyContinue
      $virt = Get-ComputerInfo -ErrorAction SilentlyContinue
      $hstate = (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\Hibernate' -ErrorAction SilentlyContinue)
      $cstate = Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\*\\*' -ErrorAction SilentlyContinue

      @{
        BoardVendor = $board.Manufacturer
        BoardModel = $board.Product
        BiosVersion = ($bios.SMBIOSBIOSVersion + ' / ' + $bios.ReleaseDate)
        CpuModel = $cpu.Name
        CpuVendor = $cpu.Manufacturer
        LogicalProcessors = $cpu.NumberOfLogicalProcessors
        Dimms = @($mem).Count
        Channels = ($mem | Group-Object BankLabel).Count
        ConfiguredMHz = ($mem | Select-Object -First 1).ConfiguredClockSpeed
        SpdMHz = ($mem | Select-Object -First 1).Speed
        MemoryType = ($mem | Select-Object -First 1).SMBIOSMemoryType
        TotalGB = [math]::Round((($mem | Measure-Object -Property Capacity -Sum).Sum) / 1GB, 1)
        VideoName = $video.Name
        VideoRamMB = [math]::Round($video.AdapterRAM / 1MB, 0)
        HypervisorPresent = $virt.HyperVisorPresent
        VirtualizationFirmwareEnabled = $cpuInfo.VirtualizationFirmwareEnabled
        SecondLevelAddressTranslation = $cpuInfo.SecondLevelAddressTranslationExtensions
        CStatesKey = if ($hstate) { 'present' } else { 'absent' }
      } | ConvertTo-Json -Depth 4
    `, { timeout: 25000 });

    const raw = JSON.parse(stdout.trim());

    const boardVendor = String(raw.BoardVendor ?? 'Desconocida').trim();
    const boardModel = String(raw.BoardModel ?? 'Desconocida').trim();
    const cpuModel = String(raw.CpuModel ?? 'Desconocida').trim();
    const dimms = Number(raw.Dimms ?? 0);
    const channels = Number(raw.Channels ?? 1);
    const configuredMHz = Number(raw.ConfiguredMHz ?? 0);
    const spdMHz = Number(raw.SpdMHz ?? 0);
    const totalGB = Number(raw.TotalGB ?? 0);
    const videoName = String(raw.VideoName ?? '');
    const videoRamMB = Number(raw.VideoRamMB ?? 0);

    // --- Memory profile (XMP / EXPO) -------------------------------------
    const memoryEvidence: string[] = [];
    const jedecBase = [...JEDEC_BASE].reverse().find(base => base <= (configuredMHz || spdMHz)) ?? 0;
    const aboveJedec = configuredMHz > 0 && jedecBase > 0 && configuredMHz >= jedecBase * 1.25;
    const aboveSpd = spdMHz > 0 && configuredMHz > spdMHz;
    const xmpLikelyEnabled = aboveJedec || aboveSpd;

    if (configuredMHz > 0) memoryEvidence.push(`Frecuencia configurada: ${configuredMHz} MHz`);
    if (spdMHz > 0) memoryEvidence.push(`Velocidad SPD declarada: ${spdMHz} MHz`);
    if (jedecBase > 0) memoryEvidence.push(`Base JEDEC estimada para esta frecuencia: ${jedecBase} MHz`);

    let platformMax = 0;
    for (const entry of PLATFORM_MAX_MHZ) {
      if (entry.match.test(cpuModel)) {
        platformMax = entry.max;
        break;
      }
    }
    if (platformMax > 0) {
      memoryEvidence.push(`Límite de la plataforma (referencia): ${platformMax} MHz`);
    }

    const memoryFinding: ProFinding | null =
      configuredMHz > 0 && platformMax > 0 && configuredMHz < platformMax * 0.85
        ? {
            id: 'bios.memory_below_platform_max',
            title: 'La memoria no llega a la velocidad máxima de la plataforma',
            detail: `La memoria corre a ${configuredMHz} MHz cuando esta CPU admite hasta ${platformMax} MHz (referencia). Es el síntoma habitual de XMP/EXPO desactivado.`,
            impact: 'alto',
            confidence: 'probable',
            evidence: memoryEvidence,
            guideId: 'xmp_expo',
          }
        : configuredMHz > 0 && jedecBase > 0 && configuredMHz <= jedecBase * 1.05
          ? {
              id: 'bios.memory_at_jedec',
              title: 'La memoria está en la frecuencia base (JEDEC)',
              detail: `La memoria corre a ${configuredMHz} MHz, la misma que la base JEDEC estimada. Sin XMP/EXPO el equipo funciona por debajo de lo que pagan los módulos.`,
              impact: 'alto',
              confidence: 'probable',
              evidence: memoryEvidence,
              guideId: 'xmp_expo',
            }
          : null;

    // --- Resizable BAR ----------------------------------------------------
    const cpuSupports = REBAR_CPU.test(cpuModel);
    const gpuSupports = gpuSupportsResizableBar(videoName, videoRamMB);
    const barEvidence: string[] = [`CPU: ${cpuModel}`, `GPU: ${videoName}`];
    if (videoRamMB > 0) barEvidence.push(`VRAM reportada por el driver: ${videoRamMB} MB`);

    // Windows only exposes Resizable BAR indirectly: with the large BAR mapped
    // the driver usually reports the whole VRAM instead of the legacy 4 GB.
    const barLooksEnabled = videoRamMB > 4096;
    if (barLooksEnabled) {
      barEvidence.push('El driver reporta más de 4 GB de VRAM mapped, señal habitual de Resizable BAR activo.');
    }

    const resizableBar = {
      cpuSupported: cpuSupports,
      gpuSupported: gpuSupports,
      enabled: barLooksEnabled ? true : null,
      confidence: (barLooksEnabled ? 'probable' : 'no_verificable') as Confidence,
      evidence: barEvidence,
    };

    const barFinding: ProFinding | null =
      cpuSupports && gpuSupports && !barLooksEnabled
        ? {
            id: 'bios.resizable_bar_off',
            title: 'Resizable BAR probablemente desactivado',
            detail: 'CPU y GPU lo soportan, pero el driver sigue reportando el límite clásico de 4 GB. Actívalo en la BIOS para mejorar el frametime enGPU-resident.',
            impact: 'medio',
            confidence: 'probable',
            evidence: barEvidence,
            guideId: 'resizable_bar',
          }
        : null;

    // --- Virtualisation (SVM / VT-x) --------------------------------------
    const virtualization = {
      svmOrVtxEnabled: raw.VirtualizationFirmwareEnabled === true || raw.SecondLevelAddressTranslation === true,
      hypervisorPresent: raw.HypervisorPresent === true,
    };
    const virtEvidence = [
      `VirtualizationFirmwareEnabled: ${raw.VirtualizationFirmwareEnabled ?? 'desconocido'}`,
      `HypervisorPresent: ${raw.HypervisorPresent ?? 'desconocido'}`,
    ];
    const virtFinding: ProFinding | null = !virtualization.svmOrVtxEnabled
      ? {
          id: 'bios.virtualization_off',
          title: 'La virtualización por hardware está desactivada',
          detail: 'Sin SVM (AMD) o VT-x (Intel) no funcionan WSL2, Hyper-V, las máquinas virtuales ni la comprobación de BattleEye/EAC en algunos juegos.',
          impact: 'medio',
          confidence: 'confirmado',
          evidence: virtEvidence,
          guideId: 'virtualization',
        }
      : null;

    // --- C-States ---------------------------------------------------------
    const cStateEvidence: string[] = [];
    let cStatesEnabled: boolean | null = null;
    try {
      const { stdout: cstateOut } = await execPowerShell(`
        $key = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings' -ErrorAction SilentlyContinue |
          Where-Object { $_.PSChildName -eq '54533251-82be-4824-96c1-47b6b0ff8b13' } | Select-Object -First 1
        if ($key) {
          $value = (Get-ItemProperty $key.PSPath -Name 'ACSettingIndex' -ErrorAction SilentlyContinue).ACSettingIndex
          if ($null -ne $value) { $value } else { 'unknown' }
        } else { 'unknown' }
      `, { timeout: 10000 });
      const parsed = cstateOut.trim();
      if (parsed === '0' || parsed === '1') {
        cStatesEnabled = parsed === '1';
        cStateEvidence.push(`ACSettingIndex de C-States: ${parsed}`);
      } else {
        cStateEvidence.push('El registro de C-States no expone un valor legible en este equipo.');
      }
    } catch {
      cStateEvidence.push('No se ha podido leer el registro de C-States.');
    }

    const cStateFinding: ProFinding | null =
      cStatesEnabled === true
        ? {
            id: 'bios.c_states_on',
            title: 'C-States están activados',
            detail: 'Desactivar los C-States (C6/C7) reduce el تعitre de energía de la CPU, pero en muchos equipos provoca tirones y una latencia peor. Piénsalo dos veces antes de tocarlo.',
            impact: 'bajo',
            confidence: 'confirmado',
            evidence: cStateEvidence,
            guideId: 'c_states',
          }
        : null;

    const findings = [memoryFinding, barFinding, virtFinding, cStateFinding].filter(Boolean) as ProFinding[];

    if (channels < 2 && dimms > 0) {
      findings.push({
        id: 'bios.single_channel',
        title: 'La memoria está en un solo canal',
        detail: `Se detectan ${dimms} módulos en ${channels} canal(es). Colocarlos en los slots A2/B2 activa el dual channel.`,
        impact: 'alto',
        confidence: 'confirmado',
        evidence: [`Módulos: ${dimms}`, `Canales: ${channels}`, `Memoria total: ${totalGB} GB`],
        guideId: 'memory',
      });
    }

    return {
      boardVendor,
      boardModel,
      biosVersion: String(raw.BiosVersion ?? '').trim(),
      cpuModel,
      memory: {
        type: String(raw.MemoryType ?? 'Desconocido'),
        dimms,
        channels,
        configuredMHz,
        spdMHz,
        xmpLikelyEnabled,
        maxSupportedMHz: platformMax,
      },
      resizableBar,
      virtualization,
      cStates: { enabled: cStatesEnabled, evidence: cStateEvidence },
      findings,
      notes,
    };
  } catch (err) {
    logger.warn('BIOS analysis failed', err);
    return {
      boardVendor: 'Desconocida',
      boardModel: 'Desconocida',
      biosVersion: '',
      cpuModel: 'Desconocida',
      memory: { type: 'Desconocido', dimms: 0, channels: 0, configuredMHz: 0, spdMHz: 0, xmpLikelyEnabled: false, maxSupportedMHz: 0 },
      resizableBar: { cpuSupported: false, gpuSupported: false, enabled: null, confidence: 'no_verificable', evidence: [] },
      virtualization: { svmOrVtxEnabled: false, hypervisorPresent: false },
      cStates: { enabled: null, evidence: [] },
      findings: [],
      notes: [...notes, 'No se ha podido leer la información del sistema.'],
    };
  }
}
