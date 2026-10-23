// Static knowledge base: BIOS guides per vendor and per game recommendations.
//
// Everything here is text shown to the user. It is intentionally conservative:
// no step changes a setting that we cannot explain, and every guide explains
// how to go back.
import type { BiosGuide, GameProfileRecommendation } from '../../shared/types/insights.js';

export const BIOS_GUIDES: BiosGuide[] = [
  {
    id: 'asus-xmp',
    vendor: 'ASUS',
    topic: 'xmp_expo',
    title: 'ASUS: activar XMP / EXPO en la placa',
    steps: [
      'Reinicia el equipo y entra en la BIOS pulsando Supr o F2 repetidamente al arrancar.',
      'Entra en "Advanced Mode" (F7) y ve a "AI Tweaker".',
      'En "AI Overclock Tuner" selecciona "XMP Profile 1" (Intel) o "EXPO Profile 1" (AMD).',
      'Comprueba en "Memory Frequency" que la velocidad sube al valor de tus módulos.',
      'Guarda con F10 y reinicia.',
    ],
    risk: 'Si la memoria no es estable a esa velocidad, el equipo puede reiniciar al arrancar. Si ocurre, vuelve a Disabled.',
    revert: [
      'Reinicia y entra en la BIOS otra vez.',
      'En "AI Overclock Tuner" vuelve a poner "Disabled" (o "Auto") en XMP/EXPO.',
      'Guarda con F10. La RAM volverá a la velocidad JEDEC por defecto.',
    ],
  },
  {
    id: 'msi-xmp',
    vendor: 'MSI',
    topic: 'xmp_expo',
    title: 'MSI: activar XMP / EXPO (A-XMP)',
    steps: [
      'Entra en la BIOS con Supr o Del.',
      'Activa el "EZ Mode" y luego cambia a "Advanced Mode" (F7).',
      'En "OC" > "A-XMP Profile" elige "Profile 1" (Intel) o "EXPO" (AMD).',
      'Verifica en "OC Explore" que la frecuencia de memoria es la nominal de tus módulos.',
      'Guarda y reinicia con F10.',
    ],
    risk: 'Una memoria inestable puede fallar al arrancar. Mantén el CMOS/Reset button a mano.',
    revert: ['Reinicia y entra en la BIOS.', 'En "OC" > "A-XMP Profile" selecciona "Disabled".', 'Guarda con F10.'],
  },
  {
    id: 'gigabyte-xmp',
    vendor: 'Gigabyte',
    topic: 'xmp_expo',
    title: 'Gigabyte: activar XMP / EXPO',
    steps: [
      'Entra en la BIOS con Supr o F2.',
      'En "Favorites" o "Tweaker" busca "Extreme Memory Profile" (XMP) o "EXPO".',
      'Selecciona "Profile 1" / "Enable" y guarda con F10.',
      'Vuelve a entrar y confirma que "Memory Clock" muestra la velocidad nominal.',
    ],
    risk: 'Si el equipo no arranca de forma estable, el BIOS puede entrar en modo de rescate: reinicia o usa el Clear CMOS.',
    revert: ['Entra en la BIOS.', 'Pon "Extreme Memory Profile (X.M.P.)" en "Disabled".', 'Guarda con F10.'],
  },
  {
    id: 'asrock-xmp',
    vendor: 'ASRock',
    topic: 'xmp_expo',
    title: 'ASRock: activar XMP / EXPO',
    steps: [
      'Entra en la BIOS con Supr o F2.',
      'En "Advanced Settings" > "CPU Configuration" busca "Load XMP Setting" (Intel) o "EXPO" (AMD).',
      'Selecciona "Profile 1" y guarda.',
      'Comprueba que la memoria aparece a la velocidad nominal en la pantalla principal.',
    ],
    risk: 'Una configuración demasiado agresiva puede impedir arrancar; el BIOS ofrece "Fail-Safe" para volver atrás.',
    revert: ['Entra en la BIOS.', 'Pon "Load XMP Setting" en "Auto" o "Disabled".', 'Guarda.'],
  },
  {
    id: 'laptop-xmp',
    vendor: 'Portátiles',
    topic: 'xmp_expo',
    title: 'Portátiles: activar el perfil de memoria',
    steps: [
      'Entra en la BIOS (F2, F10 o Del según el fabricante).',
      'Busca "Memory Profile", "XMP" o "EXPO" dentro de "Advanced" o "Overclocking".',
      'Activa "Profile 1" y guarda. En algunos portátiles la opción se llama "Maximum Performance" o "Memory Training".',
      'Reinicia y comprueba en Task Manager > Rendimiento > Memoria la velocidad.',
    ],
    risk: 'Muchos portátiles de fábrica bloquean la memoria a velocidad JEDEC por diseño (BIOS "Memory Lock"). Si no aparece la opción, no es un fallo.',
    revert: ['Reinicia y entra en la BIOS.', 'Desactiva el perfil de memoria y guarda.'],
  },
  {
    id: 'asus-resizable-bar',
    vendor: 'ASUS',
    topic: 'resizable_bar',
    title: 'ASUS: activar Resizable BAR',
    steps: [
      'Entra en la BIOS (F7 para el modo avanzado).',
      'Ve a "Advanced" > "PCI Subsystem Settings".',
      'Pon "Resize BAR" en "Enabled".',
      'Guarda con F10. En Windows, activa también "Hardware-accelerated GPU scheduling" en Configuración > Pantalla > Gráficos.',
    ],
    risk: 'Requerido para el modo "Above 4G Decoding" y una GPU compatible. Si el equipo no arranca, desactiva "Above 4G Decoding" primero.',
    revert: ['Reinicia y entra en la BIOS.', 'Pon "Resize BAR" en "Disabled" y guarda.'],
  },
  {
    id: 'msi-resizable-bar',
    vendor: 'MSI',
    topic: 'resizable_bar',
    title: 'MSI: activar Resizable BAR',
    steps: [
      'Entra en la BIOS (Del).',
      'En "OC" > "CPU Features" (o "Settings" > "Advanced") busca "Resizable BAR".',
      'Actívalo y guarda con F10.',
      'En Windows, activa la programación de GPU acelerada por hardware.',
    ],
    risk: 'Necesita una GPU y CPU compatibles. Si la GPU no lo soporta, el equipo puede no mostrar imagen.',
    revert: ['Entra en la BIOS.', 'Desactiva "Resizable BAR" y guarda.'],
  },
  {
    id: 'gigabyte-resizable-bar',
    vendor: 'Gigabyte',
    topic: 'resizable_bar',
    title: 'Gigabyte: activar Resizable BAR',
    steps: [
      'Entra en la BIOS (F2).',
      'En "Settings" > "IO Ports" activa "Above 4G Decoding" y "Resizable BAR".',
      'Guarda y reinicia.',
    ],
    risk: 'Ambas opciones deben ir juntas; activa primero "Above 4G Decoding".',
    revert: ['Entra en la BIOS.', 'Desactiva "Resizable BAR" (y "Above 4G Decoding") y guarda.'],
  },
  {
    id: 'asrock-resizable-bar',
    vendor: 'ASRock',
    topic: 'resizable_bar',
    title: 'ASRock: activar Resizable BAR',
    steps: [
      'Entra en la BIOS (F2).',
      'En "Advanced" > "PCI Configuration" activa "Above 4G Decoding" y luego "Resizable BAR".',
      'Guarda con F10.',
    ],
    risk: 'Si la máquina no arranca, desactiva "Above 4G Decoding" manteniendo el Clear CMOS a mano.',
    revert: ['Entra en la BIOS.', 'Desactiva "Resizable BAR" y guarda.'],
  },
  {
    id: 'memory-layout',
    vendor: 'General',
    topic: 'memory',
    title: 'Colocación de la memoria para dual channel',
    steps: [
      'Apaga el equipo y desconecta la alimentación.',
      'Consulta el manual de la placa para saber qué slots usar (normalmente A2 y B2).',
      'Coloca los módulos en esos slots, alternando un módulo por color.',
      'En la BIOS, en "Memory Frequency" o "DRAM Frequency", comprueba que la memoria aparece a la velocidad nominal.',
    ],
    risk: 'Colocar la memoria de forma incorrecta no la daña: simplemente no habrá dual channel.',
    revert: ['Devuelve los módulos a su posición original si el problema persiste.'],
  },
  {
    id: 'virtualization-intel',
    vendor: 'Intel',
    topic: 'virtualization',
    title: 'Intel: activar VT-x (virtualización)',
    steps: [
      'Entra en la BIOS (Supr o F2).',
      'En "Advanced" > "CPU Configuration" busca "Intel Virtualization Technology" o "VT-x".',
      'Pónlo en "Enabled" y guarda con F10.',
      'Comprueba en Windows que "Virtualización" aparece activada en "Información del sistema".',
    ],
    risk:
      'Sin virtualización no funcionan WSL2, Hyper-V, las máquinas virtuales ni algunos anti-cheat. Con la virtualización activada, algunos anti-cheat son más estrictos.',
    revert: ['Entra en la BIOS', 'Pon "Intel Virtualization Technology" en "Disabled"', 'Guarda con F10.'],
  },
  {
    id: 'virtualization-amd',
    vendor: 'AMD',
    topic: 'virtualization',
    title: 'AMD: activar SVM (virtualización)',
    steps: [
      'Entra en la BIOS (Del o F2).',
      'En "Advanced" > "CPU Configuration" (o "SVM Mode") busca "SVM Mode".',
      'Pónlo en "Enabled" y guarda.',
      'Verifica en Windows que la virtualización aparece activa en "Información del sistema".',
    ],
    risk:
      'Sin SVM no funcionan WSL2, Hyper-V, las máquinas virtuales ni algunos anti-cheat. Algunos juegos con anti-cheat exigen la virtualización activa.',
    revert: ['Entra en la BIOS', 'Pon "SVM Mode" en "Disabled"', 'Guarda.'],
  },
  {
    id: 'c-states',
    vendor: 'General',
    topic: 'c_states',
    title: 'C-States: qué hacen y cuándo tocarlos',
    steps: [
      'Entra en la BIOS y busca "CPU C States" o "Intel SpeedStep" / "C-State Support".',
      'Comprueba primero si el equipo tiene tirones o una latencia alta con la CPU al 100%.',
      'Si quieres probar la variante de bajo consumo, desactiva "C6/C7" o ponlos en "Disabled", dejando activo "C1".',
      'Guarda y mide con el medidor de latencia de clic antes y después.',
    ],
    risk:
      'Desactivar los C-States consume algo más de energía y, en muchos equipos, empeora el problema de tirones en lugar de arreglarlo. Mide siempre: no los desactives a ciegas.',
    revert: [
      'Vuelve a la BIOS y restaura "C-States" a "Enabled" (o a "Auto").',
      'Guarda con F10 y comprueba que el equipo vuelve al comportamiento anterior.',
    ],
  },
];

export function getBiosGuides(vendor?: string): BiosGuide[] {
  if (!vendor) return BIOS_GUIDES;
  return BIOS_GUIDES.filter(
    g => g.vendor.toLowerCase() === vendor.toLowerCase() || g.vendor === 'General'
  );
}

/**
 * Per game recommendations. The "evidence" text states what the community
 * usually reports without inventing a percentage that we have not measured.
 */
export const GAME_RECOMMENDATIONS: GameProfileRecommendation[] = [
  {
    gameId: 'fortnite',
    name: 'Fortnite',
    executable: 'FortniteClient-Win64-Shipping.exe',
    configPath: '%LOCALAPPDATA%\\FortniteGame\\Saved\\Config\\WindowsClient\\GameUserSettings.ini',
    supported: true,
    systemTweaks: [
      { id: 'power.high_performance', name: 'Plan de energía de alto rendimiento', why: 'Mantiene la frecuencia de CPU estable durante las partidas.' },
      { id: 'gpu.hags', name: 'HAGS (si tu driver lo soporta)', why: 'Reduce la latencia de presentación en tarjetas compatibles.' },
      { id: 'network.disable_nagle', name: 'Desactivar Nagle', why: 'Reduce el agrupamiento de paquetes en las conexiones de red.' },
    ],
    inGameSettings: [
      'V-Sync: desactivado (con un límite de FPS coherente).',
      'Límite de FPS: 3 por debajo de la tasa de refresco si usas VRR.',
      'Sombras, reflejos y efectos: bajos para ganar frames.',
      'Resolución de render al 100% para no perder nitidez.',
    ],
    evidence:
      'Práctica habitual de la comunidad: desactivar V-Sync y limitar los FPS es el ajuste que más se repite por la latencia que genera. El efecto real depende del equipo y del título; mide con la prueba A/B.',
  },
  {
    gameId: 'valorant',
    name: 'Valorant',
    executable: 'VALORANT-Win64-Shipping.exe',
    configPath: '%LOCALAPPDATA%\\VALORANT\\Saved\\Config\\WindowsClient\\GameUserSettings.ini',
    supported: false,
    systemTweaks: [
      { id: 'power.high_performance', name: 'Plan de energía de alto rendimiento', why: 'Evita que la CPU baje de frecuencia en los picos de la partida.' },
      { id: 'network.disable_nagle', name: 'Desactivar Nagle', why: 'Reduce la latencia de los paquetes de red.' },
    ],
    inGameSettings: [
      'V-Sync: desactivado.',
      'Límite de FPS: tasa del monitor o 3 menos con VRR.',
      'Materiales y detalles: medios, sombras bajas.',
    ],
    evidence:
      'En un título de FPS competitivo lo que más se nota es la latencia de entrada, no los gráficos. Prueba con el limitador inteligente de ZeroTweaks y mide.',
  },
  {
    gameId: 'cs2',
    name: 'Counter-Strike 2',
    executable: 'cs2.exe',
    configPath: '%PROGRAMFILES(X86)%\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\cfg\\video.txt',
    supported: false,
    systemTweaks: [
      { id: 'power.high_performance', name: 'Plan de energía de alto rendimiento', why: 'Estabilidad de frecuencias durante el juego.' },
      { id: 'gpu.hags', name: 'HAGS', why: 'Menor latencia de presentación en las GPUs compatibles.' },
    ],
    inGameSettings: [
      'Sincronización vertical: desactivada.',
      'NVIDIA Reflex: activado (On+Boost si el título lo ofrece).',
      'Multisampling: 2x o 4x con NVIDIA Reflex.',
    ],
    evidence:
      'Reflex junto a un límite de FPS es la combinación que la comunidad de CS2 repite como estándar. El ajuste concreto depende de tu GPU.',
  },
];

export function getGameRecommendations(gameId?: string): GameProfileRecommendation[] {
  if (!gameId) return GAME_RECOMMENDATIONS;
  return GAME_RECOMMENDATIONS.filter(g => g.gameId === gameId);
}
