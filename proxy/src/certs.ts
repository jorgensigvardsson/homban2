/**
 * Local development certificates.
 *
 * On first run this mints a private CA plus a leaf certificate for localhost,
 * both written to proxy/certs (git-ignored). Trust the CA once with
 * `npm run trust-ca` and the browser stops warning; the leaf can then be
 * regenerated freely without re-trusting anything.
 *
 * Pure JavaScript, so no openssl or mkcert binary has to be installed.
 */
import { X509Certificate } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as mkcert from 'mkcert';

export interface Certificates {
  key: string;
  cert: string;
  caCertPath: string;
  /** True when the CA was just created, meaning it is not trusted yet. */
  caIsNew: boolean;
}

/** Renew the leaf when it has less than this long to live. */
const RENEW_BEFORE_MS = 30 * 24 * 60 * 60 * 1000;

const CA_VALIDITY_DAYS = 3650;
const LEAF_VALIDITY_DAYS = 365;

export async function ensureCertificates(certDir: string, domains: string[]): Promise<Certificates> {
  fs.mkdirSync(certDir, { recursive: true });

  const paths = {
    caCert: path.join(certDir, 'ca.crt'),
    caKey: path.join(certDir, 'ca.key'),
    leafCert: path.join(certDir, 'localhost.crt'),
    leafKey: path.join(certDir, 'localhost.key'),
  };

  let ca = readPair(paths.caCert, paths.caKey);
  let caIsNew = false;

  if (!ca || !isUsable(ca.cert)) {
    ca = await mkcert.createCA({
      organization: 'Homban Local Development CA',
      countryCode: 'SE',
      state: 'Local',
      locality: 'Local',
      validity: CA_VALIDITY_DAYS,
    });
    writePair(paths.caCert, paths.caKey, ca);
    caIsNew = true;
  }

  let leaf = readPair(paths.leafCert, paths.leafKey);

  if (!leaf || !leafIsValid(leaf.cert, ca.cert, domains)) {
    leaf = await mkcert.createCert({
      ca: { key: ca.key, cert: ca.cert },
      domains,
      validity: LEAF_VALIDITY_DAYS,
      organization: 'Homban Local Development',
    });
    writePair(paths.leafCert, paths.leafKey, leaf);
  }

  return { key: leaf.key, cert: leaf.cert, caCertPath: paths.caCert, caIsNew };
}

function readPair(certPath: string, keyPath: string): mkcert.Certificate | null {
  try {
    return {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8'),
    };
  } catch {
    return null;
  }
}

function writePair(certPath: string, keyPath: string, pair: mkcert.Certificate): void {
  fs.writeFileSync(certPath, pair.cert, { mode: 0o644 });
  // The private key is readable by the owner only.
  fs.writeFileSync(keyPath, pair.key, { mode: 0o600 });
}

/** A certificate is usable when it parses and is not expired or renewable yet. */
function isUsable(pem: string): boolean {
  try {
    const x509 = new X509Certificate(pem);
    return Date.parse(x509.validTo) - Date.now() > RENEW_BEFORE_MS;
  } catch {
    return false;
  }
}

/**
 * The leaf must be current, cover every configured domain, and be signed by the
 * CA we are about to serve — otherwise browsers reject it after a CA reset.
 */
function leafIsValid(leafPem: string, caPem: string, domains: string[]): boolean {
  if (!isUsable(leafPem)) return false;
  try {
    const leaf = new X509Certificate(leafPem);
    const ca = new X509Certificate(caPem);
    if (!leaf.verify(ca.publicKey)) return false;
    return domains.every((domain) => covers(leaf, domain));
  } catch {
    return false;
  }
}

function covers(leaf: X509Certificate, domain: string): boolean {
  // checkHost handles DNS names, checkIP handles address SANs.
  return leaf.checkHost(domain) !== undefined || leaf.checkIP(domain) !== undefined;
}
