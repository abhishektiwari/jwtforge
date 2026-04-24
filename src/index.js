/**
 * JWTForge - JWT Token Vending Service for Testing
 * Provides JWT tokens with OIDC/OAuth2 claims, JWKS endpoint, and discovery endpoint
 */

import { KeyStore } from './durable.js';
import { handleOpenAPIRequest, handleRootRequest } from './openapi.js';
import { getKeyStorage } from './storage.js';
import { applyModeTransformations, applyHeaderTransformations } from './modes.js';
import { handleIntrospectionRequest } from './introspect.js';
import { handleDiscoveryRequest } from './discovery.js';
import { parseTokenExchangeRequest } from './tokenexchange.js';
import { faker } from '@faker-js/faker';

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
 * Map OIDC scopes to default claims using faker for realistic test data
 */
function getDefaultClaimsFromScope(scope) {
  const scopes = scope ? scope.toLowerCase().split(' ') : [];
  const defaultClaims = {};

  // profile scope - personal information
  if (scopes.includes('profile')) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    defaultClaims.name = faker.person.fullName({ firstName, lastName });
    defaultClaims.given_name = firstName;
    defaultClaims.family_name = lastName;
    defaultClaims.middle_name = faker.person.middleName();
    defaultClaims.nickname = faker.internet.username({ firstName, lastName });
    defaultClaims.preferred_username = faker.internet.username({ firstName, lastName });
    defaultClaims.profile = faker.internet.url() + '/' + faker.internet.username({ firstName, lastName });
    defaultClaims.picture = faker.image.avatar();
    defaultClaims.website = faker.internet.url();
    defaultClaims.gender = faker.person.sex();
    defaultClaims.birthdate = faker.date.birthdate({ mode: 'age', min: 18, max: 80 }).toISOString().split('T')[0];
    defaultClaims.zoneinfo = faker.location.timeZone();
    defaultClaims.locale = faker.location.countryCode('alpha-2') + '-' + faker.location.countryCode('alpha-2');
    defaultClaims.updated_at = Math.floor(Date.now() / 1000);
  }

  // email scope - email address and verification
  if (scopes.includes('email')) {
    defaultClaims.email = faker.internet.email();
    defaultClaims.email_verified = faker.datatype.boolean();
  }

  // address scope - physical address
  if (scopes.includes('address')) {
    defaultClaims.address = {
      street_address: faker.location.streetAddress(),
      locality: faker.location.city(),
      region: faker.location.state(),
      postal_code: faker.location.zipCode(),
      country: faker.location.countryCode('alpha-2')
    };
  }

  // phone scope - phone number and verification
  if (scopes.includes('phone')) {
    defaultClaims.phone_number = faker.phone.number();
    defaultClaims.phone_number_verified = faker.datatype.boolean();
  }

  return defaultClaims;
}

/**
 * Create and sign JWT token
 * @param {Object} claims - The claims for the JWT payload
 * @param {Object} keyData - The key data for signing
 * @param {Object} headerOverrides - Optional header field overrides (alg, kid)
 * @param {boolean} skipSignature - If true, returns token without signature (for CVE-2020-28042 testing)
 */
async function createJWT(claims, keyData, headerOverrides = {}, skipSignature = false) {
  const now = Math.floor(Date.now() / 1000);

  // JWT Header with optional overrides
  const header = {
    alg: headerOverrides.alg !== undefined ? headerOverrides.alg : keyData.alg,
    typ: 'JWT',
    kid: headerOverrides.kid !== undefined ? headerOverrides.kid : keyData.kid
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
  delete payload.header_alg;
  delete payload.header_kid;
  delete payload.sig;

  // Encode header and payload
  const encodedHeader = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // If skipSignature is true, return unsigned JWT (for CVE-2020-28042 testing)
  if (skipSignature) {
    return `${signatureInput}.`;
  }

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
 * Generate random client ID for backward compatibility
 */
function generateRandomClientId() {
  return `client_${crypto.randomUUID().substring(0, 8)}`;
}

/**
 * Handle token generation endpoint
 * Supports two approaches for backward compatibility:
 * 1. Direct JSON payload (legacy)
 * 2. OAuth2 client_credentials grant (form-encoded with Basic auth)
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
    const contentType = request.headers.get('Content-Type') || '';
    let requestData = {};
    let grantType = null;
    let clientId = null;

    // Parse request based on content type
    if (contentType.includes('application/json')) {
      // Approach 1: Direct JSON payload (legacy)
      requestData = await request.json();
      grantType = requestData.grant_type;
      clientId = requestData.client_id;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Approach 2: OAuth2 client_credentials grant or Token Exchange
      // Clone request before reading body so it can be read again if needed
      const clonedRequest = request.clone();
      const formData = new URLSearchParams(await clonedRequest.text());
      grantType = formData.get('grant_type');

      // Check if this is a token exchange request (RFC 8693)
      if (grantType === 'urn:ietf:params:oauth:grant-type:token-exchange') {
        try {
          const exchangeResult = await parseTokenExchangeRequest(request);

          if (exchangeResult.error) {
            return exchangeResult.error;
          }

          // Get key data for token generation
          const keyData = await getKeyData(env, 'RSA');

          // Create access token with exchanged claims
          const accessToken = await createJWT(exchangeResult.claims, keyData);

          const response = {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            issued_token_type: exchangeResult.requestedTokenType,
            subject_token_type: exchangeResult.subjectTokenType
          };

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: 'server_error',
              error_description: error.message
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Validate grant_type
      if (grantType && grantType !== 'client_credentials') {
        return new Response(
          JSON.stringify({
            error: 'unsupported_grant_type',
            error_description: 'Supported grant types: client_credentials, urn:ietf:params:oauth:grant-type:token-exchange'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (grantType === 'client_credentials') {
        // Extract client_id from Basic auth
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return new Response(
            JSON.stringify({
              error: 'invalid_client',
              error_description: 'Basic authorization required for client_credentials grant'
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        try {
          const credentials = atob(authHeader.slice(6));
          const [extractedClientId, password] = credentials.split(':');

          // Validate password equals client_id
          if (password !== extractedClientId) {
            return new Response(
              JSON.stringify({
                error: 'invalid_client',
                error_description: 'Invalid client credentials'
              }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
          }

          clientId = extractedClientId;
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: 'invalid_client',
              error_description: 'Invalid authorization header'
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Parse optional form fields for OAuth2 flow
      if (formData.get('scope')) requestData.scope = formData.get('scope');
      if (formData.get('sub')) requestData.sub = formData.get('sub');
    } else if (contentType === '') {
      // Empty content-type, try JSON
      requestData = await request.json().catch(() => ({}));
      grantType = requestData.grant_type;
      clientId = requestData.client_id;
    } else {
      return new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Content-Type must be application/json or application/x-www-form-urlencoded'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate grant_type if provided in JSON
    if (grantType && grantType !== 'client_credentials') {
      return new Response(
        JSON.stringify({
          error: 'unsupported_grant_type',
          error_description: 'Only client_credentials grant type is supported'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate or use provided client_id
    if (!clientId) {
      clientId = requestData.client_id || generateRandomClientId();
    }
    requestData.client_id = clientId;

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

    // Extract mode from request, default to 'fake'
    // Supported modes: 'fake' (default), 'fuzz', 'malicious'
    const mode = requestData.mode || 'fake';

    // Extract exclude list from request (claims to protect from fuzz/malicious modes)
    const exclude = requestData.exclude || [];

    // Extract sig parameter (defaults to true, when false generates unsigned tokens)
    const skipSignature = requestData.sig === false;

    const response = {
      token_type: 'Bearer',
      expires_in: requestData.exp ? (requestData.exp - Math.floor(Date.now() / 1000)) : 3600,
      algorithm: keyData.alg,
      key_id: keyData.kid
    };

    // Get default claims based on requested scopes (only for 'fake' mode)
    const scopeDefaults = mode === 'fake' ? getDefaultClaimsFromScope(requestData.scope) : {};

    // Apply header transformations (for alg and kid)
    const headerOverrides = applyHeaderTransformations(requestData, mode, exclude);

    // Generate access token
    if (shouldGenerateAccessToken) {
      let accessTokenClaims = {
        ...scopeDefaults,    // Default claims from scopes
        ...requestData,      // User-provided claims (override defaults)
        response_type: undefined, // Remove metadata
        kty: undefined,
        mode: undefined,
        exclude: undefined,
        header_alg: undefined,
        header_kid: undefined,
        sig: undefined
      };

      // Apply mode transformations (fuzz/malicious) with exclusions
      accessTokenClaims = applyModeTransformations(accessTokenClaims, mode, exclude);

      const accessToken = await createJWT(accessTokenClaims, keyData, headerOverrides, skipSignature);
      response.access_token = accessToken;
    }

    // Generate ID token
    if (shouldGenerateIdToken) {
      // ID tokens have specific OIDC requirements
      let idTokenClaims = {
        ...scopeDefaults,    // Default claims from scopes
        ...requestData,      // User-provided claims (override defaults)
        response_type: undefined, // Remove metadata
        kty: undefined,
        mode: undefined,
        exclude: undefined,
        header_alg: undefined,
        header_kid: undefined,
        sig: undefined,
        // ID tokens should have nonce if provided
        nonce: requestData.nonce,
        // Add at_hash for hybrid flows if access token is present
        ...(shouldGenerateAccessToken && response.access_token ? { at_hash: 'placeholder' } : {})
      };

      // Apply mode transformations (fuzz/malicious) with exclusions
      idTokenClaims = applyModeTransformations(idTokenClaims, mode, exclude);

      const idToken = await createJWT(idTokenClaims, keyData, headerOverrides, skipSignature);
      response.id_token = idToken;
    }

    // Include scope from request or default for hybrid flows
    if (requestData.scope) {
      response.scope = requestData.scope;
    } else if (shouldGenerateAccessToken && shouldGenerateIdToken) {
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Route handling
    if (path === '/token') {
      return handleTokenRequest(request, env);
    } else if (path === '/introspect') {
      return handleIntrospectionRequest(request, env);
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
