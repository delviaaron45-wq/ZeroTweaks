// Verify native module is built and accessible
const fs = require('fs');
const path = require('path');

const nativePath = path.join(__dirname, '..', 'src', 'native', 'target', 'release', 'zerotweaks_native.node');

if (fs.existsSync(nativePath)) {
  console.log('✅ Native module found:', nativePath);
  
  // Try to load it
  try {
    const native = require(nativePath);
    console.log('✅ Native module loaded successfully');
    console.log('Exports:', Object.keys(native));
  } catch (err) {
    console.error('❌ Failed to load native module:', err.message);
    process.exit(1);
  }
} else {
  console.warn('⚠️ Native module not found at:', nativePath);
  console.log('Run: cd src/native && cargo build --release');
  
  // Check if we're in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode - native module optional');
    process.exit(0);
  } else {
    console.error('Production build requires native module');
    process.exit(1);
  }
}