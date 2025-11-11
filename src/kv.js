/**
 * Workers KV Storage Implementation
 * Free tier: 100,000 reads/day, 1,000 writes/day
 * Eventually consistent (up to 60 seconds propagation)
 */

const KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const KEY_GRACE_PERIOD = 6 * 60 * 60 * 1000; // 6 hours

export class KVStorage {
  constructor(env) {
    this.kv = env.KEYSTORE_KV;
  }

  /**
   * Get current signing key for a key type
   */
  async getCurrentKey(kty) {
    // Get list of all keys for this type
    const keys = await this.listAllKeys(kty);

    if (keys.length === 0) {
      // No keys exist, generate new one
      const kid = this.generateKid(kty, 1);
      return await this.generateAndStoreKey(kty, kid);
    }

    // Sort by creation time (newest first)
    keys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const currentKey = keys[0];

    // Check if rotation is needed
    if (this.shouldRotateKey(currentKey)) {
      const version = this.extractVersion(currentKey.kid) + 1;
      const newKid = this.generateKid(kty, version);
      const newKey = await this.generateAndStoreKey(kty, newKid);

      // Cleanup expired keys
      await this.cleanupExpiredKeys(keys);

      return newKey;
    }

    return currentKey;
  }

  /**
   * List all active keys (current + grace period) for JWKS endpoint
   */
  async getActiveKeys(kty) {
    const allKeys = await this.listAllKeys(kty);
    const now = Date.now();

    // Filter to only active keys (within grace period)
    const activeKeys = allKeys.filter(key => {
      const keyAge = now - new Date(key.createdAt).getTime();
      return keyAge < KEY_ROTATION_INTERVAL + KEY_GRACE_PERIOD;
    });

    // Sort by creation time (newest first)
    activeKeys.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return activeKeys;
  }

  /**
   * List all keys for a key type from KV
   */
  async listAllKeys(kty) {
    const prefix = `${kty.toLowerCase()}-key-`;
    const list = await this.kv.list({ prefix });

    const keys = await Promise.all(
      list.keys.map(async (k) => {
        const data = await this.kv.get(k.name, { type: 'json' });
        return data;
      })
    );

    return keys.filter(k => k !== null);
  }

  /**
   * Generate and store a new key
   */
  async generateAndStoreKey(kty, kid) {
    let keyPair, algorithm, alg;

    if (kty === 'RSA') {
      algorithm = {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256',
      };
      alg = 'RS256';
      keyPair = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
    } else if (kty === 'EC') {
      algorithm = {
        name: 'ECDSA',
        namedCurve: 'P-256',
      };
      alg = 'ES256';
      keyPair = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
    } else {
      throw new Error(`Unsupported key type: ${kty}`);
    }

    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    // Clean up exported JWKs - remove fields that might cause import issues
    delete privateKeyJwk.key_ops;
    delete publicKeyJwk.key_ops;
    delete privateKeyJwk.ext;
    delete publicKeyJwk.ext;

    // Add metadata to public key
    publicKeyJwk.alg = alg;
    publicKeyJwk.use = 'sig';
    publicKeyJwk.kid = kid;

    const keyData = {
      kid,
      kty,
      alg,
      privateKey: privateKeyJwk,
      publicKey: publicKeyJwk,
      createdAt: new Date().toISOString()
    };

    // Store in KV (note: propagation may take up to 60 seconds)
    await this.kv.put(kid, JSON.stringify(keyData));

    return keyData;
  }

  /**
   * Delete expired keys beyond grace period
   */
  async cleanupExpiredKeys(keys) {
    const now = Date.now();
    const expiredKeys = keys.filter(key => {
      const keyAge = now - new Date(key.createdAt).getTime();
      return keyAge >= KEY_ROTATION_INTERVAL + KEY_GRACE_PERIOD;
    });

    await Promise.all(
      expiredKeys.map(key => this.kv.delete(key.kid))
    );
  }

  /**
   * Check if key should be rotated
   */
  shouldRotateKey(keyData) {
    if (!keyData) return true;
    const keyAge = Date.now() - new Date(keyData.createdAt).getTime();
    return keyAge >= KEY_ROTATION_INTERVAL;
  }

  /**
   * Generate key ID with version
   */
  generateKid(kty, version) {
    return `${kty.toLowerCase()}-key-${version}`;
  }

  /**
   * Extract version from key ID
   */
  extractVersion(kid) {
    const match = kid.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
