# Changelog

All notable changes to ZeroTweaks will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure
- Core tweak system with detect/apply/revert/verify
- Zero Danger restore system (preflight, backup, journal)
- Game Mode with automatic detection
- Benchmark suite with A/B testing
- Performance overlay
- Spider canvas animation
- 60+ initial tweaks across all categories

### Changed
- N/A

### Fixed
- N/A

### Removed
- N/A

## [1.0.0-alpha.1] - 2024-01-XX

### Added
- **Core Architecture**
  - Electron + React + TypeScript strict
  - Rust native module for timer/DPC/GPU metrics
  - Secure IPC with context isolation
  - Zod validation on all channels

- **Tweak Categories (MVP - 80 tweaks)**
  - System Performance: Win32PrioritySeparation, MMCSS, NetworkThrottlingIndex
  - Gaming: GameDVR disable, Game Mode enable, CPU priority
  - GPU: HAGS, GPU preference, MPO, VRR
  - Network: Nagle, autotuning, ECN, RSS
  - Power: Ultimate Performance, core parking, boost, PCIe ASPM
  - Debloat: AppX removal, startup management, temp cleaning
  - Privacy: Telemetry minimum, DiagTrack, advertising ID, location
  - Services: SysMain, WSearch, Print Spooler, Xbox services
  - Explorer: File extensions, context menu, animations

- **Zero Danger System**
  - Preflight checks (admin, disk, version, BitLocker)
  - System restore point with 24h limit bypass
  - JSON manifest with full registry state
  - Service/power/AppX backup
  - Transactional journal
  - Recovery script generation
  - Boot recovery entry

- **Game Mode**
  - Process-based detection (Steam, Epic, Riot, Battle.net, Xbox, GOG)
  - Per-game profiles with power/CPU/GPU settings
  - Automatic apply/revert on launch/exit
  - Anti-cheat compatible (no injection)

- **Benchmark & A/B**
  - Timer resolution & jitter
  - DPC/ISR latency via ETW
  - Network ping/jitter/loss
  - Frame times with PresentMon
  - Auto-tune loop with statistical significance

- **UI**
  - Bento grid cyberpunk theme
  - Space Grotesk + JetBrains Mono fonts
  - Cyan/pink accent colors
  - Spider canvas with inverse kinematics
  - Responsive layout, reduced motion support

- **Overlay**
  - Transparent, click-through, always-on-top
  - CPU, RAM, GPU, ping, timer, FPS modules
  - Global hotkey (Ctrl+Shift+O)
  - <1% CPU usage

- **Multi-language**
  - English, Spanish, Portuguese, French, German
  - i18next with react-i18next

### Changed
- N/A

### Fixed
- N/A

### Removed
- N/A

---

## Release Template

## [X.Y.Z] - YYYY-MM-DD

### Added
- New tweaks with full detect/apply/revert/verify
- New benchmark metrics
- New language support
- New hardware detection

### Changed
- Improved tweak detection accuracy
- Updated compatibility matrices
- Enhanced benchmark algorithms
- UI/UX improvements

### Fixed
- Bug fixes with issue numbers
- Regression fixes
- Compatibility issues

### Removed
- Deprecated tweaks (with migration path)
- Obsolete code paths

### Security
- Security improvements
- Dependency updates