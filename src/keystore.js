/**
 * KeyStore Durable Object
 * Persistently stores cryptographic keys for JWT signing with automatic rotation
 */
export class KeyStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.KEY_GRACE_PERIOD = 6 * 60 * 60 * 1000; // 6 hours grace period for old keys
  }

  /**
   * Generate or retrieve key pair based on key type
   * Automatically rotates keys after 24 hours
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const kty = url.searchParams.get('kty') || 'RSA';

    try {
      // Handle different endpoints
      if (path.includes('/list')) {
        // List all active keys (for JWKS endpoint)
        return await this.handleListKeys(kty);
      } else {
        // Get current signing key (with rotation check)
        return await this.handleGetKey(kty);
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Get the current signing key, rotating if necessary
   */
  async handleGetKey(kty) {
    const currentKey = await this.getCurrentKey(kty);

    // Check if key needs rotation
    if (this.shouldRotateKey(currentKey)) {
      await this.rotateKey(kty, currentKey);
      // Get the newly generated key
      const newKey = await this.getCurrentKey(kty);
      return new Response(JSON.stringify(newKey), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(currentKey), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * List all active keys (current + grace period keys)
   */
  async handleListKeys(kty) {
    const allKeys = await this.state.storage.list();
    const activeKeys = [];
    const now = Date.now();

    for (const [kid, keyData] of allKeys) {
      if (keyData.kty === kty) {
        const keyAge = now - new Date(keyData.createdAt).getTime();

        // Include keys that are:
        // 1. Current (less than rotation interval)
        // 2. In grace period (rotation interval + grace period)
        if (keyAge < this.KEY_ROTATION_INTERVAL + this.KEY_GRACE_PERIOD) {
          activeKeys.push(keyData);
        } else {
          // Delete expired keys beyond grace period
          await this.state.storage.delete(kid);
        }
      }
    }

    // Sort by creation time (newest first)
    activeKeys.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return new Response(JSON.stringify(activeKeys), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get the current (newest) key for a given type
   */
  async getCurrentKey(kty) {
    const allKeys = await this.state.storage.list();
    let currentKey = null;
    let newestTime = 0;

    for (const [kid, keyData] of allKeys) {
      if (keyData.kty === kty) {
        const createdAt = new Date(keyData.createdAt).getTime();
        if (createdAt > newestTime) {
          newestTime = createdAt;
          currentKey = keyData;
        }
      }
    }

    // If no key exists, generate one
    if (!currentKey) {
      currentKey = await this.generateAndStoreKey(kty, this.generateKid(kty, 1));
    }

    return currentKey;
  }

  /**
   * Check if a key should be rotated (older than 24 hours)
   */
  shouldRotateKey(keyData) {
    if (!keyData) return true;

    const keyAge = Date.now() - new Date(keyData.createdAt).getTime();
    return keyAge >= this.KEY_ROTATION_INTERVAL;
  }

  /**
   * Rotate the key by generating a new one
   */
  async rotateKey(kty, oldKey) {
    // Generate new key ID with incremented version
    const version = this.extractVersion(oldKey.kid) + 1;
    const newKid = this.generateKid(kty, version);

    // Generate and store new key
    await this.generateAndStoreKey(kty, newKid);
  }

  /**
   * Generate a key ID with version number
   */
  generateKid(kty, version) {
    return `${kty.toLowerCase()}-key-${version}`;
  }

  /**
   * Extract version number from key ID
   */
  extractVersion(kid) {
    const match = kid.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Generate key pair based on key type and store it
   */
  async generateAndStoreKey(kty, kid) {
    let keyPair;
    let algorithm;
    let alg;

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

    // Export keys in JWK format for storage
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    // Add metadata to public key
    publicKeyJwk.alg = alg;
    publicKeyJwk.use = 'sig';
    publicKeyJwk.kid = kid;

    const keyData = {
      kid,
      kty,
      alg,
      algorithm,
      privateKey: privateKeyJwk,
      publicKey: publicKeyJwk,
      createdAt: new Date().toISOString()
    };

    // Store in Durable Object storage
    await this.state.storage.put(kid, keyData);

    return keyData;
  }

  /**
   * List all stored keys
   */
  async listKeys() {
    const keys = await this.state.storage.list();
    return Array.from(keys.values());
  }

  /**
   * Delete a specific key
   */
  async deleteKey(kid) {
    await this.state.storage.delete(kid);
  }
}
