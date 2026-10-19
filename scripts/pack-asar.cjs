const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const targetAsar = path.join(projectRoot, 'release/win-unpacked/resources/app.asar');
const staging = path.join(projectRoot, 'release/asar-staging');

if (!fs.existsSync(path.dirname(targetAsar))) {
  console.log('[pack-asar] Directory release/win-unpacked/resources does not exist yet.');
  process.exit(0);
}

try {
  if (fs.existsSync(staging)) {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  if (fs.existsSync(targetAsar)) {
    console.log('[pack-asar] Extracting current app.asar...');
    execSync(`npx asar extract "${targetAsar}" "${staging}"`);
  } else {
    fs.mkdirSync(staging, { recursive: true });
    // Copy node_modules if needed
    if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
      fs.copyFileSync(path.join(projectRoot, 'package.json'), path.join(staging, 'package.json'));
    }
  }

  console.log('[pack-asar] Copying latest dist and dist-electron...');
  fs.cpSync(path.join(projectRoot, 'dist'), path.join(staging, 'dist'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'dist-electron'), path.join(staging, 'dist-electron'), { recursive: true });

  console.log('[pack-asar] Packing updated app.asar...');
  execSync(`npx asar pack "${staging}" "${targetAsar}"`);
  console.log('[pack-asar] Successfully updated ' + targetAsar);

  fs.rmSync(staging, { recursive: true, force: true });
} catch (e) {
  console.error('[pack-asar] Error updating asar:', e.message);
  process.exit(1);
}
