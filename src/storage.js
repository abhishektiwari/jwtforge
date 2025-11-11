/**
 * Storage abstraction for cryptographic keys
 * Supports both Workers KV (default, free) and Durable Objects (paid, strong consistency)
 */

import { KVStorage } from './kv.js';

/**
 * Durable Objects Storage Wrapper
 * Communicates with Durable Object for strongly consistent key storage
 */
class DurableObjectStorage {
  constructor(env) {
    this.env = env;
  }

  /**
   * Get current signing key from Durable Object
   */
  async getCurrentKey(kty) {
    const id = this.env.KEYSTORE_DURABLE.idFromName('default');
    const stub = this.env.KEYSTORE_DURABLE.get(id);
    const response = await stub.fetch(`http://keystore/?kty=${kty}`);
    return await response.json();
  }

  /**
   * Get all active keys from Durable Object
   */
  async getActiveKeys(kty) {
    const id = this.env.KEYSTORE_DURABLE.idFromName('default');
    const stub = this.env.KEYSTORE_DURABLE.get(id);
    const response = await stub.fetch(`http://keystore/list?kty=${kty}`);
    return await response.json();
  }
}

/**
 * Get storage implementation based on configuration
 *
 * Priority:
 * 1. Durable Objects (if USE_DURABLE_OBJECTS=true and KEYSTORE_DURABLE binding exists)
 * 2. Workers KV (default, if KEYSTORE_KV binding exists)
 * 3. Falls back to in-memory cache (local dev)
 */
export function getKeyStorage(env) {
  // Use Durable Objects if explicitly enabled and available
  if (env.USE_DURABLE_OBJECTS === 'true' && env.KEYSTORE_DURABLE) {
    return new DurableObjectStorage(env);
  }

  // Default to Workers KV (free tier)
  return new KVStorage(env);
}
