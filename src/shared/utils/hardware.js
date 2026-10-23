"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHardware = detectHardware;
// Hardware detection utilities
const process_1 = require("./process");
async function detectHardware() {
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
        network,
        windowsVersion,
        isLaptop,
        hasBitLocker,
    };
}
async function detectCpu() {
    const { stdout } = await (0, process_1.execPowerShell)(`
    $cpu = Get-CimInstance Win32_Processor
    $vendor = if ($cpu.Manufacturer -like '*Intel*') { 'Intel' } elseif ($cpu.Manufacturer -like '*AMD*') { 'AMD' } else { 'Unknown' }
    @{
      Vendor = $vendor
      Model = $cpu.Name.Trim()
      Cores = $cpu.NumberOfCores
      Threads = $cpu.NumberOfLogicalProcessors
      BaseClock = [math]::Round($cpu.MaxClockSpeed)
      MaxClock = [math]::Round($cpu.MaxClockSpeed * 1.2) // Approximate turbo
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
async function detectGpu() {
    const { stdout } = await (0, process_1.execPowerShell)(`
    $gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.PNPDeviceID -like 'PCI*' }
    $primary = $gpus | Select-Object -First 1
    $vendor = if ($primary.AdapterCompatibility -like '*NVIDIA*') { 'NVIDIA' }
      elseif ($primary.AdapterCompatibility -like '*AMD*' -or $primary.AdapterCompatibility -like '*ATI*') { 'AMD' }
      elseif ($primary.AdapterCompatibility -like '*Intel*') { 'Intel' }
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
async function checkHAGSSupport(vendor, driverVersion) {
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
async function detectMemory() {
    const { stdout } = await (0, process_1.execPowerShell)(`
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
async function detectStorage() {
    const { stdout } = await (0, process_1.execPowerShell)(`
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
        SmartStatus = 'Unknown' // Would need WMI MSStorageDriver_FailurePredictStatus
      }
    } | ConvertTo-Json
  `);
    const disks = JSON.parse(stdout.trim());
    return Array.isArray(disks) ? disks : [disks].filter(Boolean);
}
async function detectNetwork() {
    const { stdout } = await (0, process_1.execPowerShell)(`
    Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
      @{
        AdapterName = $_.Name
        MacAddress = $_.MacAddress
        SpeedMbps = $_.LinkSpeed / 1Mbps
        DriverVersion = (Get-PnpDevice -Class Net | Where-Object { $_.FriendlyName -eq $_.Name } | Select-Object -First 1).DriverVersion
      }
    } | ConvertTo-Json
  `);
    const adapters = JSON.parse(stdout.trim());
    return Array.isArray(adapters) ? adapters : [adapters].filter(Boolean);
}
async function detectWindowsVersion() {
    const { stdout } = await (0, process_1.execPowerShell)(`
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
async function detectIsLaptop() {
    const { stdout } = await (0, process_1.execPowerShell)(`
    $cs = Get-CimInstance Win32_ComputerSystem
    $pcType = $cs.PCSystemType
    # 1=Unspecified, 2=Desktop, 3=Mobile, 4=Workstation, 5=Enterprise Server, 6=SOHO Server, 7=Appliance PC, 8=Performance Server, 9=Maximum
    $pcType -in @(3, 7)
  `);
    return stdout.trim().toLowerCase() === 'true';
}
async function detectBitLocker() {
    const { stdout } = await (0, process_1.execPowerShell)(`
    $volumes = Get-BitLockerVolume -MountPoint C: -ErrorAction SilentlyContinue
    $volumes.ProtectionStatus -eq 'On'
  `);
    return stdout.trim().toLowerCase() === 'true';
}
//# sourceMappingURL=hardware.js.map