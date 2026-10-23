// Driver latency detection (DPC / ISR) - LatencyMon style.
//
// ETW/xperf is not available from the app, so we measure the aggregated DPC and
// interrupt time that Windows exposes through performance counters and we
// cross-reference it with the installed drivers to build a list of suspects.
// We never claim a driver is guilty without evidence: every suspect states the
// reason it was flagged.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import type { DriverLatencyReport, DriverSuspect } from '../../shared/types/insights.js';

interface DriverRow {
  DeviceName: string;
  Class: string;
  DriverVersion: string;
  DriverDate: string;
  DriverProvider: string;
  InfName: string;
}

/** Device classes that are known to generate high DPC/ISR times. */
const NOISY_CLASSES: Record<string, { reason: string; action: DriverSuspect['action'] }> = {
  Net: {
    reason: 'Los drivers de red generan DPC cuando la conexión.loss o el adaptador cambia de velocidad.',
    action: 'update_driver',
  },
  AudioEndpoint: {
    reason: 'Los drivers de audio son una fuente habitual de interrupciones cuando hay efectos activos.',
    action: 'update_driver',
  },
  MEDIA: {
    reason: 'Los dispositivos multimedia (capturas, audio USB) interrumpen con frecuencia.',
    action: 'update_driver',
  },
  USB: {
    reason: 'Los hubs USB y los dispositivos conectados a través de hubs generan latencia.',
    action: 'change_usb_port',
  },
  HIDClass: {
    reason: 'Los periféricos por USB (teclado, ratón, dongles) pueden dejar el CPU en DPC.',
    action: 'change_usb_port',
  },
  DiskDrive: {
    reason: 'Los drivers de almacenamiento pueden provocar picos al acceder al disco.',
    action: 'update_driver',
  },
  Display: {
    reason: 'Los drivers de la GPU generan DPC en los cambios de modo y sincronización vertical.',
    action: 'update_driver',
  },
  Bluetooth: {
    reason: 'Los periféricos Bluetooth usan radios que interrumpen con mucha frecuencia.',
    action: 'change_usb_port',
  },
};

/** Drivers older than this are flagged as outdated. */
const OUTDATED_DAYS = 900;

export async function analyseDriverLatency(): Promise<DriverLatencyReport> {
  const limitations = [
    'El desglose por controlador requiere ETW (xperf/WPA), que no está disponible: la medición es agregada por sistema.',
    'Los sospechosos se marcan por clase de dispositivo y antigüedad del driver, no por medición directa del driver.',
  ];

  try {
    const { stdout } = await execPowerShell(`
      $dpc = 0.0; $irq = 0.0; $ok = $false
      try {
        # Locale independent performance classes (Get-Counter names are localized).
        $p = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -ErrorAction Stop
        $dpc = [math]::Round([double]$p.PercentDPCTime, 2)
        $irq = [math]::Round([double]$p.PercentInterruptTime, 2)
        $ok = $true
      } catch {}
      $drivers = Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue |
        Where-Object { $_.DeviceName -and $_.DriverVersion } |
        Select-Object DeviceName, Class, DriverVersion, DriverDate, DriverProvider, InfName
      @{ Dpc = $dpc; Irq = $irq; Ok = $ok; Drivers = @($drivers) } | ConvertTo-Json -Depth 4
    `, { timeout: 20000 });

    const parsed = JSON.parse(stdout.trim());
    const dpc = Number(parsed.Dpc ?? 0);
    const irq = Number(parsed.Irq ?? 0);
    const readable = parsed.Ok === true;
    const drivers: DriverRow[] = Array.isArray(parsed.Drivers) ? parsed.Drivers : parsed.Drivers ? [parsed.Drivers] : [];

    const now = Date.now();
    const suspects: DriverSuspect[] = [];

    for (const driver of drivers) {
      const classInfo = NOISY_CLASSES[driver.Class];
      if (!classInfo) continue;

      const date = driver.DriverDate ? new Date(driver.DriverDate) : null;
      const ageDays = date && !Number.isNaN(date.getTime()) ? Math.round((now - date.getTime()) / 86400000) : 9999;
      const outdated = ageDays > OUTDATED_DAYS;

      const reasons: string[] = [];
      if (outdated) reasons.push(`Driver con ${Math.round(ageDays / 30)} meses (${driver.DriverVersion})`);
      if (dpc >= 1.5) reasons.push('El sistema spends tiempo en DPC');

      if (reasons.length === 0) continue;

      suspects.push({
        deviceName: driver.DeviceName,
        deviceClass: driver.Class,
        driverVersion: driver.DriverVersion,
        driverDate: driver.DriverDate ?? '',
        reason: `${classInfo.reason} ${reasons.join('. ')}.`,
        outdated,
        action: classInfo.action,
      });
    }

    suspects.sort((a, b) => Number(b.outdated) - Number(a.outdated));

    const verdict: DriverLatencyReport['verdict'] = !readable ? 'indeterminado' : dpc + irq >= 3 ? 'alto' : 'ok';

    const summary =
      verdict === 'indeterminado'
        ? 'No se han podido leer los contadores de DPC/interrupción en este equipo.'
        : verdict === 'alto'
          ? `El sistema spends ${(dpc + irq).toFixed(1)}% de su tiempo en DPC e interrupciones (${dpc.toFixed(2)}% DPC, ${irq.toFixed(2)}% IRQ). Por encima del 1-2% es habitual notar tirones.`
          : `El sistema spends ${(dpc + irq).toFixed(2)}% en DPC e interrupciones, dentro de lo normal.`;

    const recommendation =
      suspects.length === 0
        ? 'No se han encontrado drivers sospechosos. Si notas tirones, revisa la temperatura y el uso de disco.'
        : `Empieza por ${suspects[0].deviceName}: ${suspects[0].action === 'change_usb_port' ? 'conéctalo a un puerto USB directo de la placa base' : 'actualiza su driver a la última versión'}.`;

    return { dpcPercent: dpc, irqPercent: irq, verdict, suspects, summary, recommendation, limitations };
  } catch (err) {
    logger.warn('driver latency analysis failed', err);
    return {
      dpcPercent: 0,
      irqPercent: 0,
      verdict: 'indeterminado',
      suspects: [],
      summary: 'No se ha podido medir el tiempo de DPC/interrupción.',
      recommendation: 'Intenta de nuevo con el sistema en reposo.',
      limitations,
    };
  }
}

/** Returns the official download page for the chipset/driver of the current CPU vendor. */
export function getVendorDriverUrl(vendor: 'Intel' | 'AMD' | 'Unknown'): string {
  if (vendor === 'Intel') return 'https://www.intel.com/content/www/us/en/download/785597/intel-chipset-software-installation-instructions.html';
  if (vendor === 'AMD') return 'https://www.amd.com/en/resources/support.html';
  return 'https://www.catalog.update.microsoft.com/';
}
