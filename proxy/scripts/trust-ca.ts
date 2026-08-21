/**
 * Installs (or removes) the local development CA in the OS trust store, so the
 * browser accepts https://localhost without a warning.
 *
 *   npm run trust-ca              install
 *   npm run trust-ca -- --remove  uninstall
 *
 * Run this once per machine. The leaf certificate can be regenerated afterwards
 * without repeating it.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';
import { ensureCertificates } from '../src/certs.js';

const remove = process.argv.includes('--remove');
const caPath = path.join(config.certDir, 'ca.crt');

if (!fs.existsSync(caPath)) {
  if (remove) {
    console.error(`No CA found at ${caPath} - nothing to remove.`);
    process.exit(1);
  }
  console.log('No CA yet, generating one...');
  await ensureCertificates(config.certDir, config.domains);
}

const CA_FRIENDLY_NAME = 'Homban Local Development CA';

switch (process.platform) {
  case 'win32':
    windows();
    break;
  case 'darwin':
    macos();
    break;
  default:
    linux();
    break;
}

function windows(): void {
  // The CurrentUser store needs no administrator rights. Windows shows a
  // one-time confirmation dialog when adding a root certificate.
  const args = remove
    ? ['-user', '-delstore', 'Root', CA_FRIENDLY_NAME]
    : ['-user', '-addstore', 'Root', caPath];
  try {
    const out = execFileSync('certutil', args, { encoding: 'utf8' });
    console.log(out.trim());
    done();
  } catch (err) {
    console.error('certutil failed:', (err as Error).message);
    console.error(
      remove
        ? 'Remove it manually: certmgr.msc -> Trusted Root Certification Authorities -> Certificates.'
        : `Add it manually: double-click ${caPath}, choose "Install Certificate", store location "Current User", place it in "Trusted Root Certification Authorities".`,
    );
    process.exit(1);
  }
}

function macos(): void {
  const args = remove
    ? ['remove-trusted-cert', '-d', caPath]
    : ['add-trusted-cert', '-d', '-r', 'trustRoot', '-k', `${process.env.HOME}/Library/Keychains/login.keychain-db`, caPath];
  try {
    execFileSync('security', args, { stdio: 'inherit' });
    done();
  } catch (err) {
    console.error('security failed:', (err as Error).message);
    process.exit(1);
  }
}

function linux(): void {
  const target = '/usr/local/share/ca-certificates/homban-local-ca.crt';
  console.log('Run these commands to update the system trust store:');
  console.log(
    remove
      ? `  sudo rm ${target} && sudo update-ca-certificates --fresh`
      : `  sudo cp ${caPath} ${target} && sudo update-ca-certificates`,
  );
  console.log('\nChromium and Firefox keep their own stores; import the CA there too if needed.');
}

function done(): void {
  if (remove) {
    console.log('\nLocal CA removed from the trust store.');
    return;
  }
  console.log('\nLocal CA trusted. Restart the browser, then open https://localhost');
  console.log('Note: Firefox uses its own trust store. Either enable');
  console.log('security.enterprise_roots.enabled in about:config, or import');
  console.log(`${caPath} under Settings -> Privacy & Security -> Certificates.`);
}
