// Hardware detection utilities
import { execPowerShell } from './process';
import type { HardwareProfile } from '../types/index';

export interface HardwareInfo {
  cpu: CpuInfo;
  gpu: GpuInfo;
  memory: MemoryInfo;
  storage: StorageInfo[];
  network: NetworkInfo[];
  windowsVersion: WindowsVersion;
  isLaptop: boolean;
  hasBitLocker: boolean;
}

export interface CpuInfo {
  vendor: 'Intel' | 'AMD' | 'Unknown';
  model: string;
  cores: number;
  threads: number;
  baseClock: number; // MHz
  maxClock: number; // MHz
  architecture: string;
}

export interface GpuInfo {
  vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
  model: string;
  driverVersion: string;
  vram: number; // MB
  supportsHAGS: boolean;
  supportsResizableBAR: boolean;
}

export interface MemoryInfo {
  total: number; // GB
  speed: number; // MHz
  type: string;
  channels: number;
}

export interface StorageInfo {
  deviceId: string;
  model: string;
  type: 'SSD' | 'HDD' | 'NVMe';
  size: number; // GB
  smartStatus: string;
}

export interface NetworkInfo {
  adapterName: string;
  macAddress: string;
  speed: number; // Mbps
  driverVersion: string;
}

export interface WindowsVersion {
  version: string;
  build: number;
  edition: 'Home' | 'Pro' | 'Enterprise' | 'Education' | 'Unknown';
  isInsider: boolean;
}

/**
 * Normalizes the PascalCase JSON produced by the PowerShell probes into the
 * camelCase shape used across the app (`HardwareProfile`).
 */
export function normalizeHardwareProfile(raw: any): HardwareProfile {
  const cpu = raw?.Cpu ?? {};
  const gpu = raw?.Gpu ?? {};
  const mem = raw?.Memory ?? {};
  const win = raw?.Windows ?? {};
  const net = raw?.Network ?? {};
  const storageRaw: any[] = Array.isArray(raw?.Storage) ? raw.Storage : raw?.Storage ? [raw.Storage] : [];

  return {
    cpu: {
      vendor: cpu.Vendor ?? 'Unknown',
      model: cpu.Model ?? 'CPU desconocido',
      cores: Number(cpu.Cores) || 0,
      threads: Number(cpu.Threads) || 0,
      baseClock: Number(cpu.BaseClock) || 0,
      maxClock: Number(cpu.MaxClock) || 0,
      architecture: cpu.Architecture ? String(cpu.Architecture) : '64-bit',
    },
    gpu: {
      vendor: gpu.Vendor ?? 'Unknown',
      model: gpu.Model ?? 'GPU desconocida',
      driverVersion: gpu.DriverVersion ?? '',
      vram: Number(gpu.VRAM) || 0,
      supportsHAGS: gpu.SupportsHAGS !== false,
      supportsResizableBAR: gpu.SupportsResizableBAR === true,
    },
    memory: {
      total: Number(mem.Total) || 0,
      speed: Number(mem.Speed) || 0,
      type: mem.Type ?? 'Unknown',
      channels: Number(mem.Channels) || 0,
    },
    storage: storageRaw.map(d => ({
      deviceId: d.DeviceId ?? '',
      model: d.Model ?? 'Disco desconocido',
      type: d.Type ?? 'HDD',
      size: Number(d.SizeGB) || 0,
      smartStatus: d.SmartStatus ?? 'Unknown',
    })),
    network: {
      adapterName: net.AdapterName ?? '',
      macAddress: net.MacAddress ?? '',
      speed: Number(net.SpeedMbps) || 0,
      driverVersion: net.DriverVersion ?? '',
    },
    windowsVersion: {
      version: win.Version ?? '',
      build: Number(win.Build) || 0,
      edition: win.Edition ?? 'Unknown',
      isInsider: win.IsInsider === true,
    },
    isLaptop: raw?.IsLaptop === true,
    hasBitLocker: raw?.HasBitLocker === true,
  };
}

/**
 * Detects the whole hardware profile. The primary network adapter is the one
 * reported, matching the shape used across the app.
 */
export async function detectHardware(): Promise<HardwareProfile> {
  const [cpu, gpu, memory, storage, network, windowsVersion, isLaptop, hasBitLocker] = await Promise.all([
    detectCpu(),
    detectGpu(),
    detectMemory(),
    detectStorage(),
    detectNetwork(),
    detectWindowsVersion(),
    detectIsLaptop(),
    detectBitLocker(),
  ]);

  return {
    cpu,
    gpu,
    memory,
    storage,
    network: network[0] ?? {
      adapterName: '',
      macAddress: '',
      speed: 0,
      driverVersion: '',
    },
    windowsVersion,
    isLaptop,
    hasBitLocker,
  };
}

async function detectCpu(): Promise<CpuInfo> {
  const { stdout } = await execPowerShell(`
    $cpu = Get-CimInstance Win32_Processor
    $vendor = if ($cpu.Manufacturer -like '*Intel*') { 'Intel' } elseif ($cpu.Manufacturer -like '*AMD*') { 'AMD' } else { 'Unknown' }
    @{
      Vendor = $vendor
      Model = $cpu.Name.Trim()
      Cores = $cpu.NumberOfCores
      Threads = $cpu.NumberOfLogicalProcessors
      BaseClock = [math]::Round($cpu.MaxClockSpeed)
      MaxClock = [math]::Round($cpu.MaxClockSpeed * 1.2) # Approximate turbo
      Architecture = $cpu.AddressWidth
    } | ConvertTo-Json
  `);
  const info = JSON.parse(stdout.trim());
  return {
    vendor: info.Vendor,
    model: info.Model,
    cores: info.Cores,
    threads: info.Threads,
    baseClock: info.BaseClock,
    maxClock: info.MaxClock,
    architecture: `${info.Architecture}-bit`,
  };
}

async function detectGpu(): Promise<GpuInfo> {
  const { stdout } = await execPowerShell(`
    $gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.PNPDeviceID -like 'PCI*' }
    # Prefer the dedicated GPU (discrete) over the integrated one.
    $primary = $gpus | Where-Object { $_.Name -match 'NVIDIA|AMD|Radeon|GeForce|RTX|RX ' } | Select-Object -First 1
    if (-not $primary) { $primary = $gpus | Select-Object -First 1 }
    $vendor = if ($primary.AdapterCompatibility -like '*NVIDIA*' -or $primary.Name -like '*NVIDIA*') { 'NVIDIA' }
      elseif ($primary.AdapterCompatibility -like '*AMD*' -or $primary.AdapterCompatibility -like '*ATI*' -or $primary.Name -match 'AMD|Radeon') { 'AMD' }
      elseif ($primary.AdapterCompatibility -like '*Intel*' -or $primary.Name -like '*Intel*') { 'Intel' }
      else { 'Unknown' }
    @{
      Vendor = $vendor
      Model = $primary.Name.Trim()
      DriverVersion = $primary.DriverVersion
      VRAM = [math]::Round($primary.AdapterRAM / 1MB)
    } | ConvertTo-Json
  `);
  const info = JSON.parse(stdout.trim());
  return {
    vendor: info.Vendor,
    model: info.Model,
    driverVersion: info.DriverVersion,
    vram: info.VRAM,
    supportsHAGS: await checkHAGSSupport(info.Vendor, info.DriverVersion),
    supportsResizableBAR: false, // Would need more complex detection
  };
}

async function checkHAGSSupport(vendor: string, driverVersion: string): Promise<boolean> {
  // Simplified check based on vendor and driver version
  const versionParts = driverVersion.split('.').map(Number);
  const major = versionParts[0] || 0;
  const minor = versionParts[1] || 0;

  switch (vendor) {
    case 'NVIDIA':
      return major > 451 || (major === 451 && minor >= 48); // 451.48+
    case 'AMD':
      return major > 20 || (major === 20 && minor >= 5); // 20.5+
    case 'Intel':
      return major > 27 || (major === 27 && minor >= 20); // 27.20+
    default:
      return false;
  }
}

async function detectMemory(): Promise<MemoryInfo> {
  const { stdout } = await execPowerShell(`
    $mem = Get-CimInstance Win32_PhysicalMemory
    $totalGB = [math]::Round(($mem | Measure-Object -Property Capacity -Sum).Sum / 1GB, 1)
    $speed = ($mem | Select-Object -First 1).Speed
    $type = switch (($mem | Select-Object -First 1).MemoryType) {
      24 { 'DDR3' } 26 { 'DDR4' } 34 { 'DDR5' } default { 'Unknown' }
    }
    $channels = ($mem | Group-Object BankLabel).Count
    @{
      Total = $totalGB
      Speed = $speed
      Type = $type
      Channels = $channels
    } | ConvertTo-Json
  `);
  const info = JSON.parse(stdout.trim());
  return {
    total: info.Total,
    speed: info.Speed,
    type: info.Type,
    channels: info.Channels,
  };
}

async function detectStorage(): Promise<StorageInfo[]> {
  const { stdout } = await execPowerShell(`
    $disks = Get-CimInstance Win32_DiskDrive | Where-Object { $_.MediaType -eq 'Fixed hard disk media' }
    $disks | ForEach-Object {
      $model = $_.Model.Trim()
      $type = if ($model -like '*NVMe*' -or $model -like '*SSD*' -or $_.InterfaceType -eq 'NVMe') { 'NVMe' }
        elseif ($model -like '*SSD*') { 'SSD' }
        else { 'HDD' }
      @{
        DeviceId = $_.DeviceID
        Model = $model
        Type = $type
        SizeGB = [math]::Round($_.Size / 1GB)
        SmartStatus = 'Unknown' # Would need WMI MSStorageDriver_FailurePredictStatus
      }
    } | ConvertTo-Json
  `);
  const disks = JSON.parse(stdout.trim());
  const list: any[] = (Array.isArray(disks) ? disks : [disks]).filter(Boolean);
  return list.map((d: any): StorageInfo => ({
    deviceId: d.DeviceId,
    model: d.Model,
    type: d.Type,
    size: d.SizeGB,
    smartStatus: d.SmartStatus,
  }));
}

async function detectNetwork(): Promise<NetworkInfo[]> {
  const { stdout } = await execPowerShell(`
    Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
      @{
        AdapterName = $_.Name
        MacAddress = $_.MacAddress
        SpeedMbps = if (("$($_.LinkSpeed)" -match '([\\d.]+)\\s*Gbps')) { [double]$Matches[1] * 1000 } elseif (("$($_.LinkSpeed)" -match '([\\d.]+)\\s*Mbps')) { [double]$Matches[1] } else { 0 }
        DriverVersion = (Get-PnpDevice -Class Net | Where-Object { $_.FriendlyName -eq $_.Name } | Select-Object -First 1).DriverVersion
      }
    } | ConvertTo-Json
  `);
  const adapters = JSON.parse(stdout.trim());
  const list: any[] = (Array.isArray(adapters) ? adapters : [adapters]).filter(Boolean);
  return list.map((a: any): NetworkInfo => ({
    adapterName: a.AdapterName,
    macAddress: a.MacAddress,
    speed: a.SpeedMbps,
    driverVersion: a.DriverVersion,
  }));
}

async function detectWindowsVersion(): Promise<WindowsVersion> {
  const { stdout } = await execPowerShell(`
    $os = Get-CimInstance Win32_OperatingSystem
    $version = $os.Version
    $build = [int]$version.Split('.')[2]
    $edition = switch -Regex ($os.Caption) {
      'Home' { 'Home' }
      'Pro(?!fessional)' { 'Pro' }
      'Enterprise' { 'Enterprise' }
      'Education' { 'Education' }
      default { 'Unknown' }
    }
    @{
      Version = $version
      Build = $build
      Edition = $edition
      IsInsider = $os.BuildLabEx -match '\\.rs[0-9]+_release' -or $os.BuildLabEx -match 'co_release'
    } | ConvertTo-Json
  `);
  const info = JSON.parse(stdout.trim());
  return {
    version: info.Version,
    build: info.Build,
    edition: info.Edition,
    isInsider: info.IsInsider,
  };
}

async function detectIsLaptop(): Promise<boolean> {
  const { stdout } = await execPowerShell(`
    $cs = Get-CimInstance Win32_ComputerSystem
    $pcType = $cs.PCSystemType
    # 1=Unspecified, 2=Desktop, 3=Mobile, 4=Workstation, 5=Enterprise Server, 6=SOHO Server, 7=Appliance PC, 8=Performance Server, 9=Maximum
    $pcType -in @(3, 7)
  `);
  return stdout.trim().toLowerCase() === 'true';
}

async function detectBitLocker(): Promise<boolean> {
  try {
    // BitLocker enumeration can be slow (TPM handshake), so cap it.
    const { stdout } = await execPowerShell(
      `
      $volumes = Get-BitLockerVolume -MountPoint C: -ErrorAction SilentlyContinue
      $volumes.ProtectionStatus -eq 'On'
    `,
      { timeout: 6000 }
    );
    return stdout.trim().toLowerCase() === 'true';
  } catch {
    return false;
  }
}