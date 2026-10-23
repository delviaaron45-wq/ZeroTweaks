# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Active          |
| < 1.0   | ❌ Alpha/Pre-release |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow responsible disclosure:

### Private Disclosure
1. **DO NOT** create a public GitHub issue
2. Email: security@zerotweaks.app (or use GitHub Security Advisories)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline
- **24 hours**: Acknowledgment of report
- **72 hours**: Initial assessment
- **7 days**: Fix or mitigation plan
- **30 days**: Patch release (for critical issues)

## Security Features

### Zero Danger Architecture
- **Preflight checks** validate system state before any changes
- **System restore points** created before every optimization session
- **Complete JSON manifests** capture exact registry state (including non-existent values)
- **Transactional journal** survives crashes and power loss
- **Per-tweak verification** reads back values after application
- **Recovery tools** work without ZeroTweaks installed

### Code Security
- **Context isolation** enabled in Electron
- **Node integration disabled** in renderer
- **Preload script** with allowlisted IPC channels
- **Zod validation** on all IPC boundaries
- **No user input concatenation** in PowerShell commands
- **Parametrized scripts** only (`-File script.ps1 -Param value`)

### Native Module
- **Rust memory safety** prevents buffer overflows
- **Minimal Windows API surface** (only required APIs)
- **No kernel drivers** - user-mode only
- **Anti-cheat compatible** - no code injection, no kernel hooks

### Data Protection
- **100% offline** - no telemetry by default
- **Local logs only** in `%APPDATA%\ZeroTweaks\logs\`
- **Optional telemetry** requires explicit opt-in
- **No accounts** - no authentication, no cloud sync

## Threat Model

### Attack Vectors Considered
1. **Malicious tweak definitions** - Mitigated by signed catalog, code review
2. **IPC exploitation** - Mitigated by context isolation, schema validation
3. **Native module vulnerabilities** - Mitigated by Rust, minimal API
4. **Privilege escalation** - Mitigated by requireAdministrator manifest
5. **Supply chain** - Mitigated by signed releases, SBOM, reproducible builds

### Out of Scope
- Physical access attacks
- Compromised OS/kernel
- Malicious user with admin rights
- Social engineering

## Security Best Practices for Users

1. **Verify signatures** - Check Authenticode signature on installer
2. **Review changes** - Use Expert Mode to see exact registry paths
3. **Test first** - Use Dry Run mode before applying
4. **Backup manually** - Create your own restore point too
5. **Monitor** - Check Windows Event Viewer after changes

## Vulnerability History

| Version | CVE | Severity | Description | Fixed |
|---------|-----|----------|-------------|-------|
| - | - | - | None reported yet | - |

## Contact

Security team: security@zerotweaks.app

For non-security bugs, use GitHub Issues.