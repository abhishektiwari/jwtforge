/**
 * Token Introspection Endpoint (RFC 7662)
 * Validates and returns information about OAuth2/OIDC tokens
 */

/**
 * Decode base64url encoded string
 */
function base64urlDecode(str) {
  // Add padding if necessary
  let padded = str;
  const remainder = str.length % 4;
  if (remainder === 1) {
    throw new Error('Invalid base64url string');
  }
  if (remainder === 2) padded += '==';
  if (remainder === 3) padded += '=';

  // Decode
  const decoded = atob(
    padded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
  );

  // Convert to JSON
  return JSON.parse(new TextDecoder().decode(
    new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)))
  ));
}

/**
 * Validate Basic authorization header
 * Accepts alphanumeric, underscores, and/or hyphens in client_id up to 50 characters
 */
function validateBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  try {
    const credentials = atob(authHeader.slice(6));
    const [clientId] = credentials.split(':');

    // Client ID should be alphanumeric, underscores, and/or hyphens, up to 50 characters
    return /^[a-zA-Z0-9_-]{1,50}$/.test(clientId);
  } catch (e) {
    return false;
  }
}

/**
 * Verify JWT signature using public key
 */
async function verifyJWTSignature(token, publicKeyJwk, algorithm) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const signatureInput = `${headerB64}.${payloadB64}`;

    // Decode signature
    let signaturePadded = signatureB64;
    const remainder = signatureB64.length % 4;
    if (remainder === 2) signaturePadded += '==';
    if (remainder === 3) signaturePadded += '=';

    const signatureBytes = Uint8Array.from(
      atob(signaturePadded.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => c.charCodeAt(0))
    );

    // Import public key
    let importAlgorithm;
    let verifyAlgorithm;

    if (algorithm.startsWith('RS')) {
      // RSA algorithm
      importAlgorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
      verifyAlgorithm = 'RSASSA-PKCS1-v1_5';
    } else if (algorithm.startsWith('ES')) {
      // ECDSA algorithm
      importAlgorithm = { name: 'ECDSA', namedCurve: 'P-256' };
      verifyAlgorithm = { name: 'ECDSA', hash: 'SHA-256' };
    } else {
      return false; // Unsupported algorithm
    }

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      importAlgorithm,
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      verifyAlgorithm,
      publicKey,
      signatureBytes,
      new TextEncoder().encode(signatureInput)
    );

    return isValid;
  } catch (error) {
    return false;
  }
}

/**
 * Handle token introspection request
 * POST /introspect
 * Parameters: token (required), token_type_hint (optional)
 * Requires: Basic authorization
 */
export async function handleIntrospectionRequest(request, env) {
  try {
    // Validate method
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate Basic auth
    const authHeader = request.headers.get('Authorization');
    if (!validateBasicAuth(authHeader)) {
      return new Response(
        JSON.stringify({ error: 'invalid_client', error_description: 'Invalid authorization' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Basic realm="JWTForge"'
          }
        }
      );
    }

    // Parse form data
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/x-www-form-urlencoded')) {
      return new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Content-Type must be application/x-www-form-urlencoded'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = new URLSearchParams(await request.text());
    const token = formData.get('token');
    const tokenTypeHint = formData.get('token_type_hint');

    // Validate token parameter
    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'token parameter is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate token_type_hint if provided
    if (tokenTypeHint && tokenTypeHint !== 'access_token') {
      return new Response(
        JSON.stringify({
          error: 'unsupported_token_type',
          error_description: 'Only access_token token_type_hint is supported'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Decode token
    let header, payload;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return new Response(JSON.stringify({ active: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      header = base64urlDecode(parts[0]);
      payload = base64urlDecode(parts[1]);
    } catch (error) {
      // Invalid token format
      return new Response(JSON.stringify({ active: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return new Response(
        JSON.stringify({ active: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check not-before time
    if (payload.nbf && payload.nbf > now) {
      return new Response(
        JSON.stringify({ active: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature if algorithm is not 'none'
    if (header.alg && header.alg !== 'none' && header.alg !== 'None' && header.alg !== 'NONE') {
      try {
        // Get all active keys from storage
        const storage = (await import('./storage.js')).getKeyStorage(env);
        let keys = [];

        try {
          const rsaKeys = await storage.getActiveKeys('RSA');
          const ecKeys = await storage.getActiveKeys('EC');
          keys = [...rsaKeys, ...ecKeys];
        } catch {
          // If storage fails, return inactive
          return new Response(
            JSON.stringify({ active: false }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Try to verify with available keys
        let signatureValid = false;
        for (const keyData of keys) {
          const isValid = await verifyJWTSignature(
            token,
            keyData.publicKey,
            header.alg
          );
          if (isValid) {
            signatureValid = true;
            break;
          }
        }

        if (!signatureValid) {
          return new Response(
            JSON.stringify({ active: false }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        // Signature verification error
        return new Response(
          JSON.stringify({ active: false }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Token is active - return all claims with active: true
    const response = {
      active: true,
      ...payload
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
