# ZeroTweaks - Maximum Performance Windows Optimization Suite

![ZeroTweaks](https://img.shields.io/badge/ZeroTweaks-v1.0.0--alpha-purple)
![Electron](https://img.shields.io/badge/Electron-28-blue)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Rust](https://img.shields.io/badge/Rust-2021-orange)
![License](https://img.shields.io/badge/License-MIT-green)

ZeroTweaks is a free, open-source Windows optimization suite designed for maximum performance with a focus on gaming, competitive play, and system responsiveness. Every tweak is measurable, reversible, and verified.

## ✨ Features

### 🎯 Core Philosophy
- **Zero Danger**: Complete system state backup before any changes
- **Measurable**: Every tweak shows before/after metrics on YOUR hardware
- **Reversible**: One-click restore to exact previous state
- **Honest**: No fake promises - "measured", "debated", or "placebo" labels
- **Secure**: Never disables Defender, Windows Update, Firewall, or CPU mitigations

### ⚡ Optimization Categories (400+ Tweaks Target)
- **System Performance** (60) - Priority control, MMCSS, timer resolution
- **Gaming & FPS** (45) - Game Mode, GameDVR, CPU priority, background suspension
- **GPU** (40) - HAGS, NVIDIA/AMD/Intel driver settings, VRR, MPO
- **Network & TCP** (40) - Nagle, autotuning, ECN, RSS, DNS
- **Peripherals & Input** (25) - Mouse accel, MSI mode, HPET, interrupt affinity
- **Power & CPU** (35) - Ultimate Performance, core parking, boost, PCIe ASPM
- **RAM & Storage** (35) - Memory compression, TRIM, page file, standby list
- **Debloat Apps** (50) - Bloatware removal, startup management, temp cleaning
- **Privacy & Telemetry** (45) - Telemetry, DiagTrack, advertising ID, location
- **Services** (30) - SysMain, WSearch, Print Spooler, Xbox services
- **Explorer & UI** (30) - File extensions, context menu, animations, taskbar

### 🎮 Automatic Game Mode
- Detects games from Steam, Epic, Riot, Battle.net, Xbox, GOG
- Applies per-game optimizations on launch, reverts on exit
- Compatible with Vanguard, EAC, BattlEye (no kernel injection)
- Per-game profiles with GPU/CPU/power settings

### 📊 Benchmark & A/B Testing
- Timer resolution & jitter measurement
- DPC/ISR latency via ETW
- Network ping, jitter, packet loss
- Frame times with PresentMon (1% lows)
- Auto-tune loop: measure → apply → measure → verify
- Statistical significance testing

### 🕷️ Spider Canvas Animation
- 8-legged inverse kinematics spider
- Scans module cards during analysis
- Cyberpunk aesthetic with cyan/pink accents
- Respects `prefers-reduced-motion`

### 🖥️ Performance Overlay
- Transparent, click-through, always-on-top
- CPU, RAM, GPU, ping, timer resolution, FPS
- Global hotkey toggle (Ctrl+Shift+O)
- <1% CPU usage

## 🚀 Quick Start

### Prerequisites
- Windows 10 2004+ (19041) or Windows 11
- Administrator rights (required)
- Node.js 20+ (for development)
- Rust 1.70+ (for native module)

### Installation
```bash
# Download latest release from GitHub
# Run ZeroTweaks-Setup.exe as Administrator
```

### Development
```bash
# Clone repository
git clone https://github.com/zerotweaks/zerotweaks
cd zerotweaks

# Install dependencies
npm install

# Build native module
cd src/native && cargo build --release && cd ../..

# Start development servers
npm run dev
```

## 🏗️ Architecture

```
zerotweaks/
├── src/
│   ├── main/           # Electron main process
│   │   ├── ipc/        # IPC handlers
│   │   ├── system/     # Preflight, backup, journal
│   │   ├── gaming/     # Game mode manager
│   │   ├── overlay/    # Overlay window
│   │   ├── spider/     # Spider animation coordinator
│   │   ├── native/     # Rust native bridge
│   │   └── utils/      # Logger, env
│   ├── preload/        # Secure preload script
│   ├── renderer/       # React + TypeScript UI
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── stores/     # Zustand stores
│   │   ├── hooks/      # Custom hooks
│   │   ├── styles/     # Tailwind + custom CSS
│   │   └── assets/     # Spider canvas, icons
│   ├── shared/         # Shared types, tweaks, utils
│   │   ├── types/      # TypeScript interfaces
│   │   ├── tweaks/     # Tweak implementations
│   │   ├── schemas/    # Zod validation
│   │   └── utils/      # Process, files, hardware
│   └── native/         # Rust native module
├── resources/          # PowerShell scripts, icons
├── scripts/            # Build/verify scripts
├── tests/              # Unit/integration tests
└── docs/               # Documentation
```

## 🔒 Safety Features

### Zero Danger Restore System
1. **Preflight Checks** - Admin rights, disk space, Windows version, BitLocker
2. **System Restore Point** - Created with temporary 24h limit bypass
3. **JSON Manifest** - Complete registry state (including non-existent values)
4. **Service/Power/AppX Backup** - Full system state capture
5. **Transactional Journal** - Crash-resistant operation log
6. **Per-Tweak Verification** - Read-back confirmation after apply
7. **Recovery Tools** - Desktop `.bat`, boot menu entry

### Risk Levels
- **Safe** ✅ - No stability risk, enabled by default
- **Moderate** ⚠️ - May affect stability, confirmation required
- **Advanced** 🔴 - Expert only, written confirmation required

### Evidence Levels
- **Measured** 📊 - Reproducible improvement on test hardware
- **Debated** 💬 - Mixed community reports, test on your system
- **Placebo** 🧪 - No measurable effect, included for completeness

## 📋 Default Profiles

| Profile | Description | Tweaks |
|---------|-------------|--------|
| **Safe** | Conservative, no reboot needed | All safe, measured tweaks |
| **Competitive** | Maximum gaming performance | Safe + moderate gaming tweaks |
| **Streamer** | Balanced for streaming | Safe + encoding optimizations |
| **Laptop** | Battery-friendly | Safe tweaks compatible with laptops |

## 🛠️ Building

```bash
# Development
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm run test

# Production build
npm run build

# Create installer (requires code signing cert)
npm run dist
```

## 📦 Distribution

- **NSIS Installer** - Signed, admin elevation, auto-updater
- **Portable** - No installation, runs from any folder
- **Microsoft Store** - Future consideration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tweaks with full detect/apply/revert/verify
4. Include evidence classification
5. Submit PR with benchmarks

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

ZeroTweaks modifies system settings. While designed to be safe and reversible:
- Always create a system restore point before use
- Test on non-critical systems first
- Some tweaks require reboot
- Use at your own risk

## 🙏 Acknowledgments

- Windows Internals (Russinovich, Solomon, Ionescu)
- Project Zero / Google Security Research
- PCGamingWiki community
- Various open-source optimization projects

---

**Made with ❤️ for the Windows performance community**