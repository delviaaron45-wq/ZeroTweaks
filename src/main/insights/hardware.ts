// Hardware insights: CPU topology, display/input chain and memory/files.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import { getVendorDriverUrl } from './drivers.js';
import type {
  ChipsetDriverInfo,
  CpuCoreReport,
  DisplayInputReport,
  InsightFinding,
  MemoryFilesReport,
  PageFileInfo,
  ShaderCacheInfo,
  ThermalReport,
} from '../../shared/types/insights.js';

// ---------------------------------------------------------------------------
// 15.2b CPU and cores
// ---------------------------------------------------------------------------
export async function analyseCpuCores(): Promise<CpuCoreReport> {
  const guidance: string[] = [];

  try {
    const { stdout } = await execPowerShell(`
      $cpus = Get-CimInstance Win32_Processor
      $classes = @($cpus | ForEach-Object { $_.EfficiencyClass } | Where-Object { $null -ne $_ } | Sort-Object -Unique)
      $hybrid = $classes.Count -gt 1
      $effCores = 0; $perfCores = 0
      foreach ($c in $cpus) {
        if ($null -ne $c.EfficiencyClass -and $c.EfficiencyClass -gt 0) { $effCores += $c.NumberOfCores }
        else { $perfCores += $c.NumberOfCores }
      }
      $games = Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessName -match 'Fortnite|VALORANT|cs2|Game|Launcher' } |
        Select-Object ProcessName, Id, ProcessorAffinity
      $chipset = Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue |
        Where-Object { $_.DeviceName -match 'Chipset|PCI Express Root Port|System Management|AMD|Intel' -and $_.DriverVersion } |
        Select-Object -First 1 DeviceName, DriverVersion, DriverDate
      @{
        Hybrid = $hybrid
        PerfCores = $perfCores
        EffCores = $effCores
        Vendor = $cpus.Manufacturer
        Games = @($games)
        Chipset = $chipset
      } | ConvertTo-Json -Depth 4
    `, { timeout: 20000 });

    const parsed = JSON.parse(stdout.trim());
    const hybrid = parsed.Hybrid === true;
    const perfCores = Number(parsed.PerfCores ?? 0);
    const effCores = Number(parsed.EffCores ?? 0);
    const vendor = (parsed.Vendor ?? 'Unknown') as 'Intel' | 'AMD' | 'Unknown';

    const gameProcesses = (Array.isArray(parsed.Games) ? parsed.Games : parsed.Games ? [parsed.Games] : []).map(
      (g: { ProcessName: string; ProcessorAffinity: number }) => ({
        process: g.ProcessName,
        affinity: String(g.ProcessorAffinity ?? ''),
        // On hybrid CPUs the efficiency cores are the high numbered logical
        // processors; a mask that only contains the upper half points there.
        restrictedToEfficiencyCores:
          hybrid && typeof g.ProcessorAffinity === 'number' && g.ProcessorAffinity > 0 && g.ProcessorAffinity < 4096,
      })
    );

    let chipsetDriver: ChipsetDriverInfo | null = null;
    if (parsed.Chipset) {
      const date = parsed.Chipset.DriverDate ? new Date(parsed.Chipset.DriverDate) : null;
      const ageDays = date && !Number.isNaN(date.getTime()) ? (Date.now() - date.getTime()) / 86400000 : 9999;
      chipsetDriver = {
        version: parsed.Chipset.DriverVersion ?? '',
        date: parsed.Chipset.DriverDate ?? '',
        outdated: ageDays > 900,
        officialUrl: getVendorDriverUrl(vendor),
        present: true,
      };
    }

    if (hybrid) {
      guidance.push(
        'Esta CPU es híbrida (núcleos P + E). En Windows 11 el planificador coloca el juego en los núcleos P automáticamente.',
        'Si el juego va solo a los núcleos de bajo rendimiento, activa "Efficiency Class" en Configuración > Sistema > CPU > Kernel CPU Power Management > Asignación de afinidad de CPU.'
      );
    }
    if (chipsetDriver?.outdated) {
      guidance.push(
        `El driver del chipset (${chipsetDriver.version}) tiene más de dos años. Actualízalo desde la web oficial de ${vendor}.`
      );
    }
    const restricted = gameProcesses.filter((g: { restrictedToEfficiencyCores: boolean }) => g.restrictedToEfficiencyCores);
    if (restricted.length > 0) {
      guidance.push(
        `${restricted[0].process} tiene una máscara de afinidad que lo ata a los núcleos de bajo rendimiento. Quita la restricción o usa CPU Sets.`
      );
    }
    if (guidance.length === 0) {
      guidance.push('No se han detectado problemas de topología de CPU ni de driver del chipset.');
    }

    return {
      hybrid,
      performanceCores: perfCores,
      efficiencyCores: effCores,
      chipsetDriver,
      gameProcesses,
      summary: hybrid
        ? `CPU híbrida: ${perfCores} núcleos de rendimiento y ${effCores} de eficiencia.`
        : `CPU de ${perfCores} núcleos (sin diseño híbrido).`,
      guidance,
    };
  } catch (err) {
    logger.warn('cpu cores analysis failed', err);
    return {
      hybrid: false,
      performanceCores: 0,
      efficiencyCores: 0,
      chipsetDriver: null,
      gameProcesses: [],
      summary: 'No se ha podido analizar la topología de la CPU.',
      guidance: ['Ejecuta el diagnóstico con permisos de administrador para leer la eficiencia de los núcleos.'],
    };
  }
}

// ---------------------------------------------------------------------------
// 15.6 Display and input
// ---------------------------------------------------------------------------
export async function analyseDisplayAndInput(): Promise<DisplayInputReport> {
  const findings: InsightFinding[] = [];

  try {
    const { stdout } = await execPowerShell(`
      $video = Get-CimInstance Win32_VideoController | Select-Object -First 1
      $display = Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue | Select-Object -First 1
      $bpp = (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\Connectivity' -ErrorAction SilentlyContinue).DisplayResolution
      $colorDepth = 32
      try { $colorDepth = (Get-ItemProperty 'HKCU:\\Control Panel\\Desktop' -ErrorAction Stop).LogPixels }
      catch { $colorDepth = 32 }

      # Windowed optimizations are per executable (AppCompatFlags "~ DISABLEDXMAXIMIZEDWINDOWEDMODE").
      $windowedDisabled = @()
      $keys = Get-ChildItem 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers' -ErrorAction SilentlyContinue
      foreach ($k in $keys) {
        $v = (Get-ItemProperty $k.PSPath -ErrorAction SilentlyContinue).'(default)'
        if ($v -match 'DISABLEDXMAXIMIZEDWINDOWEDMODE') { $windowedDisabled += $k.PSChildName }
      }

      $mouse = Get-PnpDevice -Class Mouse -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' } | Select-Object -First 1
      $polling = $null
      if ($mouse) {
        $reg = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\HID' -Recurse -ErrorAction SilentlyContinue |
          Where-Object { $_.PSChildName -like "*$($mouse.FriendlyName)*" } | Select-Object -First 1
        if ($reg) {
          $p = Get-ItemProperty "$($reg.PSPath)\\Device Parameters" -ErrorAction SilentlyContinue
          if ($p.PollingRate) { $polling = [int]$p.PollingRate }
        }
      }

      $bt = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.Class -match 'Bluetooth' -and $_.FriendlyName -match 'Mouse|Keyboard|HID' } | Select-Object FriendlyName
      $audio = Get-CimInstance Win32_SoundDevice -ErrorAction SilentlyContinue | Where-Object { $_.Name } | Select-Object -First 1

      @{
        Current = $video.CurrentRefreshRate
        Max = $video.MaxRefreshRate
        ColorDepth = 32
        WindowedDisabled = @($windowedDisabled)
        MouseName = if ($mouse) { $mouse.FriendlyName } else { '' }
        Polling = $polling
        Bluetooth = @($bt | ForEach-Object { $_.FriendlyName })
        Audio = if ($audio) { $audio.Name } else { '' }
        HdrRegistry = (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\VideoSettings' -ErrorAction SilentlyContinue).EnableHDRForPlayback
      } | ConvertTo-Json -Depth 4
    `, { timeout: 25000 });

    const parsed = JSON.parse(stdout.trim());
    const current = Number(parsed.Current ?? 0);
    const max = Number(parsed.Max ?? current);
    const windowedDisabled: string[] = Array.isArray(parsed.WindowedDisabled)
      ? parsed.WindowedDisabled
      : parsed.WindowedDisabled
        ? [parsed.WindowedDisabled]
        : [];
    const bluetooth: string[] = Array.isArray(parsed.Bluetooth)
      ? parsed.Bluetooth
      : parsed.Bluetooth
        ? [parsed.Bluetooth]
        : [];

    if (current > 0 && max > current) {
      findings.push({
        id: 'display.refresh_rate',
        title: 'El monitor no va a su tasa máxima',
        detail: `Windows usa ${current} Hz y el monitor admite ${max} Hz.`,
        impact: 'alto',
        fixable: true,
        fixAction: 'set_refresh_rate',
        fixParams: { current, target: max },
      });
    }

    if (windowedDisabled.length > 0) {
      findings.push({
        id: 'display.windowed_optimizations',
        title: 'Hay juegos en modo ventana con optimizaciones desactivadas',
        detail: `${windowedDisabled.join(', ')} tienen "desactivar optimizaciones de ventana" marcado, lo que puede reducir el rendimiento o impedir el V-Sync.`,
        impact: 'medio',
        fixable: true,
        fixAction: 'enable_windowed_optimizations',
        fixParams: { executables: windowedDisabled },
      });
    }

    if (parsed.Polling && Number(parsed.Polling) < 500) {
      findings.push({
        id: 'input.polling_rate',
        title: `El ratón usa una tasa de sondeo baja (${parsed.Polling} Hz)`,
        detail: 'Por encima de 500 Hz la respuesta del ratón es notablemente más inmediata.',
        impact: 'medio',
        fixable: false,
      });
    }

    if (bluetooth.length > 0) {
      findings.push({
        id: 'input.bluetooth',
        title: 'Periféricos por Bluetooth',
        detail: `${bluetooth.join(', ')} usan radio Bluetooth, que añade latencia frente a un puerto USB directo de la placa base.`,
        impact: 'medio',
        fixable: false,
      });
    }

    return {
      refreshRate: current,
      maxRefreshRate: max,
      vrr: 'desconocido',
      fullscreenMode: 'desconocido',
      windowedOptimizations: windowedDisabled.length > 0 ? 'deshabilitadas' : 'habilitadas',
      hdrActive: parsed.HdrRegistry === 1 ? true : parsed.HdrRegistry === 0 ? false : null,
      colorDepth: 32,
      mouseName: parsed.MouseName ?? '',
      mousePollingRate: parsed.Polling ? Number(parsed.Polling) : null,
      bluetoothDevices: bluetooth,
      audioDevice: parsed.Audio ?? '',
      audioLatencyMode: 'desconocido',
      audioEnhancements: null,
      findings,
    };
  } catch (err) {
    logger.warn('display/input analysis failed', err);
    return {
      refreshRate: 0,
      maxRefreshRate: 0,
      vrr: 'desconocido',
      fullscreenMode: 'desconocido',
      windowedOptimizations: 'desconocido',
      hdrActive: null,
      colorDepth: 32,
      mouseName: '',
      mousePollingRate: null,
      bluetoothDevices: [],
      audioDevice: '',
      audioLatencyMode: 'desconocido',
      audioEnhancements: null,
      findings: [],
    };
  }
}

// ---------------------------------------------------------------------------
// 15.7 Memory and files
// ---------------------------------------------------------------------------
export async function analyseMemoryAndFiles(ramGB: number): Promise<MemoryFilesReport> {
  const findings: InsightFinding[] = [];

  try {
    const { stdout } = await execPowerShell(`
      $pf = Get-CimInstance Win32_PageFileUsage -ErrorAction SilentlyContinue | Select-Object -First 1
      $pfSetting = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue | Select-Object -First 1
      $systemDrive = $env:SystemDrive
      $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($systemDrive)'" -ErrorAction SilentlyContinue | Select-Object -First 1
      $ssd = $null
      try {
        $partition = Get-Partition -DriveLetter $systemDrive.Substring(0,1) -ErrorAction Stop
        $physical = Get-Disk -Number $partition.DiskNumber -ErrorAction Stop
        $ssd = [bool]($physical.MediaType -eq 'SSD' -or $physical.BusType -eq 'NVMe')
      } catch {}

      $cacheDirs = @(
        @{ Name = 'DirectX Shader Cache'; Path = "$env:LOCALAPPDATA\\D3DSCache" },
        @{ Name = 'NVIDIA DXCache'; Path = "$env:LOCALAPPDATA\\NVIDIA\\DXCache" },
        @{ Name = 'NVIDIA GLCache'; Path = "$env:LOCALAPPDATA\\NVIDIA\\GLCache" },
        @{ Name = 'Epic Games Derived Data'; Path = "$env:LOCALAPPDATA\\EpicGamesLauncher\\Saved\\DerivedDataCache" }
      )
      $caches = @()
      foreach ($c in $cacheDirs) {
        if (Test-Path $c.Path) {
          $files = Get-ChildItem $c.Path -Recurse -File -ErrorAction SilentlyContinue
          $size = [math]::Round((($files | Measure-Object -Property Length -Sum).Sum) / 1MB, 1)
          $oldest = ($files | Sort-Object LastWriteTime | Select-Object -First 1).LastWriteTime
          $age = if ($oldest) { [math]::Round(((Get-Date) - $oldest).TotalDays, 0) } else { 0 }
          $caches += @{ Name = $c.Name; Path = $c.Path; SizeMB = $size; AgeDays = $age }
        }
      }

      @{
        PageFileTotal = if ($pf) { [math]::Round($pf.AllocatedBaseSize / 1024, 0) } else { 0 }
        PageFileName = if ($pf) { $pf.Name } else { '' }
        PageFileAuto = if ($pfSetting) { [bool]$pfSetting.AutomaticManaged } else { $true }
        SystemDrive = $systemDrive
        SystemDriveOnSSD = $ssd
        FreeGB = if ($disk) { [math]::Round($disk.FreeSpace / 1GB, 1) } else { 0 }
        TotalGB = if ($disk) { [math]::Round($disk.Size / 1GB, 1) } else { 0 }
        Caches = @($caches)
      } | ConvertTo-Json -Depth 4
    `, { timeout: 30000 });

    const parsed = JSON.parse(stdout.trim());
    const pageFile: PageFileInfo | null = parsed.PageFileTotal
      ? {
          totalMB: Number(parsed.PageFileTotal),
          drive: parsed.PageFileName ?? '',
          onSSD: parsed.SystemDriveOnSSD === true,
          autoManaged: parsed.PageFileAuto !== false,
        }
      : null;

    const caches: ShaderCacheInfo[] = (Array.isArray(parsed.Caches) ? parsed.Caches : parsed.Caches ? [parsed.Caches] : []).map(
      (c: { Name: string; Path: string; SizeMB: number; AgeDays: number }) => ({
        name: c.Name,
        path: c.Path,
        sizeMB: Number(c.SizeMB ?? 0),
        ageDays: Number(c.AgeDays ?? 0),
      })
    );

    const freeGB = Number(parsed.FreeGB ?? 0);
    const totalGB = Number(parsed.TotalGB ?? 0);

    if (ramGB > 0 && ramGB <= 8) {
      if (!pageFile || pageFile.totalMB === 0) {
        findings.push({
          id: 'memory.no_pagefile',
          title: 'No hay archivo de paginación configurado',
          detail: `Con ${ramGB} GB de RAM y sin archivo de paginación, el sistema puede dejar de responder cuando se agota la memoria.`,
          impact: 'alto',
          fixable: true,
          fixAction: 'enable_pagefile',
        });
      } else if (!pageFile.onSSD) {
        findings.push({
          id: 'memory.pagefile_on_hdd',
          title: 'El archivo de paginación está en un disco que no es SSD',
          detail: 'Paginar a un disco lento provoca tirones muy visibles.',
          impact: 'medio',
          fixable: false,
        });
      }
    }

    const bigCache = caches.find(c => c.sizeMB > 2048);
    if (bigCache) {
      findings.push({
        id: 'files.shader_cache',
        title: `Caché de shaders grande (${Math.round(bigCache.sizeMB)} MB)`,
        detail: `${bigCache.name} ocupa ${Math.round(bigCache.sizeMB)} MB. Si el juego va mal, reconstruir la caché puede corregirlo.`,
        impact: 'medio',
        fixable: true,
        fixAction: 'rebuild_shader_cache',
        fixParams: { path: bigCache.path, name: bigCache.name },
      });
    }

    if (totalGB > 0 && freeGB / totalGB < 0.15) {
      findings.push({
        id: 'files.low_free_space',
        title: 'Poca espacio libre en la unidad del sistema',
        detail: `Quedan ${freeGB} GB de ${totalGB} GB (${Math.round((freeGB / totalGB) * 100)}%). Por debajo del 15% Windows y los juegos pierden rendimiento.`,
        impact: 'alto',
        fixable: false,
      });
    }

    return {
      ramGB,
      pageFile,
      shaderCaches: caches,
      systemDriveFreeGB: freeGB,
      systemDriveTotalGB: totalGB,
      findings,
    };
  } catch (err) {
    logger.warn('memory/files analysis failed', err);
    return {
      ramGB,
      pageFile: null,
      shaderCaches: [],
      systemDriveFreeGB: 0,
      systemDriveTotalGB: 0,
      findings: [],
    };
  }
}

// ---------------------------------------------------------------------------
// 15.9 Temperature and hardware
// ---------------------------------------------------------------------------
export async function analyseThermal(
  cpuTempC: number | null,
  gpuTempC: number | null,
  throttlingDetected: boolean
): Promise<ThermalReport> {
  const guidance: string[] = [];

  try {
    const { stdout } = await execPowerShell(`
      $battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
      $onBattery = $false
      $charging = $false
      $percent = $null
      if ($battery) {
        $onBattery = ($battery.BatteryStatus -eq 1)
        $charging = ($battery.BatteryStatus -eq 2 -or $battery.ChargeRemaining -lt 99)
        $percent = $battery.EstimatedChargeRemaining
      }
      @{ OnBattery = $onBattery; Charging = $charging; Percent = $percent } | ConvertTo-Json
    `, { timeout: 12000 });

    const battery = JSON.parse(stdout.trim());
    const onBattery = battery.OnBattery === true;
    const charging = battery.Charging === true;
    const percent = battery.Percent === null || battery.Percent === undefined ? null : Number(battery.Percent);

    const cpuHigh = cpuTempC !== null && cpuTempC >= 85;
    const gpuHigh = gpuTempC !== null && gpuTempC >= 83;
    const sustainedHigh = cpuHigh || gpuHigh;

    if (cpuHigh) {
      guidance.push('La CPU está por encima de 85 °C: está limitando la frecuencia. Limpia la ventilación de la caja y la disipador.');
    }
    if (gpuHigh) {
      guidance.push('La GPU está por encima de 83 °C: revisa la curva de ventiladores y la pasta térmica.');
    }
    if (throttlingDetected) {
      guidance.push('Windows ha detectado limitación térmica (throttling). El equipo reduce su rendimiento para no dañarse.');
    }
    if (onBattery) {
      guidance.push('El equipo está con batería: jugar con batería reduce el rendimiento y puede forzar el modo equilibrado. Conecta el cargador original.');
    }
    if (guidance.length === 0) {
      guidance.push('No se han detectado temperaturas elevadas ni limitación térmica.');
    }

    return {
      cpuTempC,
      gpuTempC,
      throttlingDetected,
      sustainedHigh,
      onBattery,
      charging,
      batteryChargePercent: percent,
      guidance,
      summary: sustainedHigh
        ? 'Hay temperaturas altas sostenidas: el equipo está limitando su rendimiento.'
        : 'Las temperaturas están dentro de lo normal.',
    };
  } catch (err) {
    logger.warn('thermal analysis failed', err);
    return {
      cpuTempC,
      gpuTempC,
      throttlingDetected,
      sustainedHigh: false,
      onBattery: false,
      charging: false,
      batteryChargePercent: null,
      guidance: ['No se han podido leer los sensores de temperatura.'],
      summary: 'No se han podido leer los sensores de temperatura.',
    };
  }
}
