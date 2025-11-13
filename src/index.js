/**
 * JWTForge - JWT Token Vending Service for Testing
 * Provides JWT tokens with OIDC/OAuth2 claims, JWKS endpoint, and discovery endpoint
 */

import { KeyStore } from './durable.js';
import { handleOpenAPIRequest, handleRootRequest } from './openapi.js';
import { getKeyStorage } from './storage.js';

// In-memory cache for local development (when KV/Durable Objects are not available)
const memoryCache = new Map();

/**
 * Get or create key data from storage backend (KV, Durable Objects, or memory cache)
 * Returns the current signing key (with automatic rotation)
 */
async function getKeyData(env, kty = 'RSA') {
  const kid = `${kty.toLowerCase()}-key-1`;

  // Use configured storage backend (KV or Durable Objects)
  if (env && (env.KEYSTORE_KV || env.KEYSTORE_DURABLE)) {
    const storage = getKeyStorage(env);
    const keyData = await storage.getCurrentKey(kty);
    return keyData;
  }

  // Fall back to memory cache for local development
  if (memoryCache.has(kid)) {
    return memoryCache.get(kid);
  }

  // Generate new key for memory cache
  const keyData = await generateKeyInMemory(kty, kid);
  memoryCache.set(kid, keyData);
  return keyData;
}

/**
 * Get all active keys from storage backend (KV, Durable Objects, or memory cache)
 * Returns current key + keys in grace period (for JWKS)
 */
async function getAllActiveKeys(env, kty = 'RSA') {
  // Use configured storage backend (KV or Durable Objects)
  if (env && (env.KEYSTORE_KV || env.KEYSTORE_DURABLE)) {
    const storage = getKeyStorage(env);
    const keys = await storage.getActiveKeys(kty);
    return keys;
  }

  // Fall back to memory cache for local development
  const kid = `${kty.toLowerCase()}-key-1`;
  if (memoryCache.has(kid)) {
    return [memoryCache.get(kid)];
  }

  // Generate new key for memory cache
  const keyData = await generateKeyInMemory(kty, kid);
  memoryCache.set(kid, keyData);
  return [keyData];
}

/**
 * Generate key pair in memory (for local development)
 */
async function generateKeyInMemory(kty, kid) {
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

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  publicKeyJwk.alg = alg;
  publicKeyJwk.use = 'sig';
  publicKeyJwk.kid = kid;

  return {
    kid,
    kty,
    alg,
    algorithm,
    privateKey: privateKeyJwk,
    publicKey: publicKeyJwk,
    keyPair,
    createdAt: new Date().toISOString()
  };
}

/**
 * Base64URL encode
 */
function base64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create and sign JWT token
 */
async function createJWT(claims, keyData) {
  const now = Math.floor(Date.now() / 1000);

  // JWT Header
  const header = {
    alg: keyData.alg,
    typ: 'JWT',
    kid: keyData.kid
  };

  // JWT Payload with default OIDC/OAuth2 claims
  const payload = {
    iss: claims.iss || 'https://jwtforge.example.com',
    sub: claims.sub || 'user123',
    aud: claims.aud || 'https://api.example.com',
    exp: claims.exp || (now + 3600), // 1 hour from now
    nbf: claims.nbf || now,
    iat: claims.iat || now,
    jti: claims.jti || crypto.randomUUID(),
    ...claims // Include all custom claims
  };

  // Remove metadata fields that shouldn't be in the token
  delete payload.kty;
  delete payload.alg;

  // Encode header and payload
  const encodedHeader = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  // Import private key for signing
  let privateKey = keyData.keyPair?.privateKey;
  if (!privateKey) {
    // Import from JWK if keyPair is not available (Durable Object case)
    const algorithm = keyData.kty === 'RSA'
      ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
      : { name: 'ECDSA', namedCurve: 'P-256' };

    privateKey = await crypto.subtle.importKey(
      'jwk',
      keyData.privateKey,
      algorithm,
      false,
      ['sign']
    );
  }

  // Create signature based on algorithm
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  let signatureBuffer;

  if (keyData.alg.startsWith('RS')) {
    // RSA signature
    signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signatureInput)
    );
  } else if (keyData.alg.startsWith('ES')) {
    // ECDSA signature
    signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      new TextEncoder().encode(signatureInput)
    );
  } else {
    throw new Error(`Unsupported algorithm: ${keyData.alg}`);
  }

  const signature = base64urlEncode(signatureBuffer);

  return `${signatureInput}.${signature}`;
}

/**
 * Handle token generation endpoint
 */
async function handleTokenRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const requestData = await request.json();

    // Extract response_type from request (OAuth2/OIDC standard)
    // Supported values: "token", "id_token", "id_token token", "token id_token"
    const responseType = (requestData.response_type || 'token').toLowerCase().trim();

    // Parse response_type to determine what tokens to generate
    const shouldGenerateAccessToken = responseType.includes('token') && !responseType.includes('id_token token') ||
                                       responseType === 'token' ||
                                       responseType.includes('token id_token') ||
                                       responseType.includes('id_token token');
    const shouldGenerateIdToken = responseType.includes('id_token');

    // Extract kty from request, default to RSA/RS256
    const kty = requestData.kty || 'RSA';
    const keyData = await getKeyData(env, kty);

    const response = {
      token_type: 'Bearer',
      expires_in: requestData.exp ? (requestData.exp - Math.floor(Date.now() / 1000)) : 3600
    };

    // Generate access token
    if (shouldGenerateAccessToken) {
      const accessTokenClaims = {
        ...requestData,
        response_type: undefined, // Remove metadata
        kty: undefined
      };
      const accessToken = await createJWT(accessTokenClaims, keyData);
      response.access_token = accessToken;
    }

    // Generate ID token
    if (shouldGenerateIdToken) {
      // ID tokens have specific OIDC requirements
      const idTokenClaims = {
        ...requestData,
        response_type: undefined, // Remove metadata
        // ID tokens should have nonce if provided
        nonce: requestData.nonce,
        // Add at_hash for hybrid flows if access token is present
        ...(shouldGenerateAccessToken && response.access_token ? { at_hash: 'placeholder' } : {})
      };
      const idToken = await createJWT(idTokenClaims, keyData);
      response.id_token = idToken;
    }

    // If requesting both, also include scope
    if (shouldGenerateAccessToken && shouldGenerateIdToken && !response.scope) {
      response.scope = 'openid profile email';
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request',
        message: error.message
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle JWKS endpoint
 * Returns all active keys including those in grace period (for key rotation)
 */
async function handleJWKSRequest(env) {
  try {
    // Get all active keys for all supported key types
    const rsaKeys = await getAllActiveKeys(env, 'RSA');
    const ecKeys = await getAllActiveKeys(env, 'EC');

    // Flatten all public keys into JWKS format
    const allPublicKeys = [
      ...rsaKeys.map(k => k.publicKey),
      ...ecKeys.map(k => k.publicKey)
    ];

    const jwks = {
      keys: allPublicKeys
    };

    return new Response(JSON.stringify(jwks, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800' // 30 minutes cache
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWKS', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle OIDC Discovery endpoint
 */
async function handleDiscoveryRequest(request) {
  const url = new URL(request.url);
  const issuer = `${url.protocol}//${url.host}`;

  const discoveryDocument = {
    issuer: issuer,
    token_endpoint: `${issuer}/token`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['token', 'id_token', 'id_token token', 'token id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256', 'ES256'],
    claims_supported: [
      'sub', 'iss', 'aud', 'exp', 'iat', 'nbf', 'jti',
      'name', 'given_name', 'family_name', 'middle_name', 'nickname',
      'preferred_username', 'profile', 'picture', 'website',
      'email', 'email_verified',
      'gender', 'birthdate', 'zoneinfo', 'locale',
      'phone_number', 'phone_number_verified',
      'address', 'updated_at',
      'scope', 'roles', 'groups', 'nonce'
    ]
  };

  return new Response(JSON.stringify(discoveryDocument, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Route handling
    if (path === '/token') {
      return handleTokenRequest(request, env);
    } else if (path === '/.well-known/jwks.json') {
      return handleJWKSRequest(env);
    } else if (path === '/.well-known/openid-configuration') {
      return handleDiscoveryRequest(request);
    } else if (path === '/openapi.json' || path === '/swagger.json') {
      return handleOpenAPIRequest(request);
    } else if (path === '/') {
      return handleRootRequest(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};

// Export Durable Object class
export { KeyStore };
