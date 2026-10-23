// Script to add 'impacto' field to all tweaks based on risk level
const fs = require('fs');
const path = require('path');

const files = [
  'src/shared/tweaks/debloat.ts',
  'src/shared/tweaks/explorer.ts',
  'src/shared/tweaks/gpu.ts',
  'src/shared/tweaks/peripherals.ts',
  'src/shared/tweaks/power.ts',
  'src/shared/tweaks/ram.ts',
  'src/shared/tweaks/services.ts',
  'src/shared/tweaks/system.ts',
];

function getImpacto(risk) {
  switch (risk) {
    case 'safe': return 'bajo';
    case 'moderate': return 'medio';
    case 'advanced': return 'alto';
    default: return 'bajo';
  }
}

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  
  // Pattern: risk: 'X',\n  evidence: 'Y',\n  requiresReboot:
  // Replace with: risk: 'X',\n  evidence: 'Y',\n  impacto: 'Z',\n  requiresReboot:
  
  content = content.replace(
    /(risk: '(safe|moderate|advanced)',\n\s+evidence: '(measured|debated|placebo)',\n\s+)requiresReboot:/g,
    (match, prefix, risk, evidence) => {
      const impacto = getImpacto(risk);
      return `${prefix}impacto: '${impacto}',\n      ` + 'requiresReboot:';
    }
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
});

console.log('Done!');