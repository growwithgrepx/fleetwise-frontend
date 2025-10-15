const fs = require('fs');
const path = require('path');

console.log('🧹 Starting E2E test cleanup...');

// Clean up Cypress artifacts
const cleanupPaths = [
  'cypress/screenshots',
  'cypress/videos',
  'cypress/downloads'
];

cleanupPaths.forEach(cleanupPath => {
  if (fs.existsSync(cleanupPath)) {
    console.log(`📁 Cleaning up ${cleanupPath}...`);
    fs.rmSync(cleanupPath, { recursive: true, force: true });
  }
});

// Clean up any temporary files
const tempFiles = [
  '.cypress-cache',
  'cypress-cache.json'
];

tempFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`🗑️ Removing ${file}...`);
    fs.unlinkSync(file);
  }
});

console.log('✅ E2E test cleanup completed!'); 