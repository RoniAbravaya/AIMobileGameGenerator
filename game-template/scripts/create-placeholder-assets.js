/**
 * Create placeholder images for development
 * Generates simple colored PNG files
 */

const fs = require('fs');
const path = require('path');

// Minimal 1x1 PNG files (base64 encoded)
const MINIMAL_PNG_BASE64 = {
  // Dark blue 1x1 PNG
  splash: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  // Green 1x1 PNG  
  icon: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg=='
};

const assetsDir = path.join(__dirname, '..', 'assets', 'generated');

// Ensure directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create splash.png
fs.writeFileSync(
  path.join(assetsDir, 'splash.png'),
  Buffer.from(MINIMAL_PNG_BASE64.splash, 'base64')
);

// Create icon.png
fs.writeFileSync(
  path.join(assetsDir, 'icon.png'),
  Buffer.from(MINIMAL_PNG_BASE64.icon, 'base64')
);

// Create adaptive-icon.png (same as icon)
fs.writeFileSync(
  path.join(assetsDir, 'adaptive-icon.png'),
  Buffer.from(MINIMAL_PNG_BASE64.icon, 'base64')
);

console.log('✅ Placeholder assets created in assets/generated/');
console.log('   - splash.png (1x1 dark placeholder)');
console.log('   - icon.png (1x1 green placeholder)');
console.log('   - adaptive-icon.png (1x1 green placeholder)');
console.log('\nThese will be replaced by AI-generated images during game generation.');
