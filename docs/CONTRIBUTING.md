# Contributing to ZeroTweaks

Thank you for your interest in contributing to ZeroTweaks! This document outlines the process for contributing tweaks, fixing bugs, and improving the codebase.

## 🎯 Contribution Guidelines

### Tweak Requirements
Every tweak must include:
1. **Detection** - Read current state without modification
2. **Application** - Apply the change with dry-run support
3. **Reversion** - Restore exact previous state
4. **Verification** - Confirm the change was applied correctly
5. **Metadata** - Complete categorization and risk assessment

### Evidence Standards
- **Measured** 📊 - You have benchmark data showing improvement
- **Debated** 💬 - Community discusses it, results vary
- **Placebo** 🧪 - No measurable effect, included for completeness

Never claim "100% safe" or "+X% FPS" without data.

## 🔧 Adding a New Tweak

### 1. Define the Tweak
Create a new file in `src/shared/tweaks/` or add to existing category file:

```typescript
export const myNewTweak: Tweak = {
  id: 'category.unique_name',
  name: 'Human Readable Name',
  category: 'system_performance', // or other category
  description: 'Clear explanation of what this does',
  whenHelps: 'Specific scenarios where this helps',
  risk: 'safe', // safe | moderate | advanced
  evidence: 'measured', // measured | debated | placebo
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    // Optional: cpuVendors, gpuVendors
  },
  detect: async () => { /* return TweakState */ },
  apply: async (options) => { /* return TweakResult */ },
  revert: async (originalState) => { /* return TweakResult */ },
  verify: async (expectedState) => { /* return boolean */ },
};
```

### 2. Registry Tweaks
Use `RegistryManager` for registry operations:

```typescript
import { RegistryManager } from '../tweaks/registry';

const result = await RegistryManager.getValue('HKLM', '\\Path\\To\\Key', 'ValueName');
await RegistryManager.setValue('HKLM', '\\Path\\To\\Key', 'ValueName', 'REG_DWORD', 1);
```

### 3. PowerShell Tweaks
Use `execPowerShell` for complex operations:

```typescript
import { execPowerShell } from '../utils/process';

const { stdout } = await execPowerShell(`Your-PowerShell-Command`);
```

### 4. Add to Index
Export from `src/shared/tweaks/index.ts`:

```typescript
export { myNewTweak } from './myCategory';
```

### 5. Test Thoroughly
- Test on Windows 10 and 11
- Test on laptop and desktop
- Verify detection works before/after apply
- Verify revert restores exact state
- Run benchmark before/after

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues
2. Test with latest version
3. Try dry-run mode first

### Required Information
- Windows version (`winver`)
- Hardware (CPU, GPU, RAM)
- ZeroTweaks version
- Steps to reproduce
- Expected vs actual behavior
- Logs from `%APPDATA%\ZeroTweaks\logs\`

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Manual Testing Checklist
- [ ] Preflight checks pass
- [ ] Backup created successfully
- [ ] Tweak detection works
- [ ] Apply succeeds
- [ ] Verify confirms change
- [ ] Revert restores original state
- [ ] Journal records all operations
- [ ] Recovery script works
- [ ] Benchmark runs without errors

### Hardware Testing Matrix
| CPU | GPU | Form Factor | Windows |
|-----|-----|-------------|---------|
| Intel 12th+ | NVIDIA RTX 30/40 | Desktop | 10/11 |
| Intel 12th+ | NVIDIA RTX 30/40 | Laptop | 10/11 |
| AMD Ryzen 5000+ | AMD RX 6000/7000 | Desktop | 10/11 |
| AMD Ryzen 5000+ | AMD RX 6000/7000 | Laptop | 10/11 |

## 📝 Code Style

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Explicit return types for public functions
- Zod schemas for all IPC boundaries

### React
- Functional components with hooks
- Zustand for state management
- TanStack Query for server state
- Tailwind CSS for styling

### Rust (Native Module)
- Follow Rust API guidelines
- Document all public functions
- Handle errors with `Result<T, E>`
- No `unwrap()` in production code

## 🚀 Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create signed release
4. Publish to GitHub Releases
5. Update Scoop/Chocolatey packages (future)

## 📋 Pull Request Checklist

- [ ] All new tweaks have detect/apply/revert/verify
- [ ] Evidence level correctly assigned
- [ ] Risk level appropriate
- [ ] Compatibility matrix accurate
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Benchmark data included (for measured tweaks)

## 💬 Community

- GitHub Discussions for questions
- Discord for real-time chat (future)
- Issues for bugs and feature requests

## 🙏 Recognition

Contributors will be listed in:
- README.md
- About dialog in app
- Release notes

Thank you for making ZeroTweaks better!