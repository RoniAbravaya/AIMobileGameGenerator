/**
 * Generate placeholder assets for the game template
 * Run with: node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');

// Minimal 1x1 transparent PNG (base64)
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Simple colored PNG generator (creates a solid color square)
function createColoredPng(width, height, r, g, b) {
  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // For simplicity, we'll use a minimal approach
  // In production, you'd use a proper image library
  return transparentPng;
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create placeholder files
const assets = [
  'icon.png',
  'splash.png', 
  'adaptive-icon.png',
  'favicon.png'
];

assets.forEach(asset => {
  const assetPath = path.join(assetsDir, asset);
  if (!fs.existsSync(assetPath)) {
    fs.writeFileSync(assetPath, transparentPng);
    console.log(`Created: ${asset}`);
  }
});

console.log('Assets generated successfully!');
console.log('Note: Replace these with actual game assets before publishing.');

