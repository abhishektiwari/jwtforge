/**
 * Token Exchange Endpoint (RFC 8693)
 * Allows exchanging one token type for another (e.g., JWT to access token)
 * Supports: JWT, ID Token, Access Token formats
 */

/**
 * Decode base64url encoded string
 */
export function base64urlDecode(str) {
  let padded = str;
  const remainder = str.length % 4;
  if (remainder === 1) {
    throw new Error('Invalid base64url string');
  }
  if (remainder === 2) padded += '==';
  if (remainder === 3) padded += '=';

  const decoded = atob(
    padded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
  );

  return JSON.parse(new TextDecoder().decode(
    new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)))
  ));
}

/**
 * Extract claims from a JWT token (without validation)
 * Supports: urn:ietf:params:oauth:token-type:jwt, id_token, access_token
 */
export function extractTokenClaims(token, tokenType) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = base64urlDecode(parts[1]);
    return payload;
  } catch (error) {
    throw new Error(`Failed to extract claims from ${tokenType}: ${error.message}`);
  }
}

/**
 * Parse add_claims parameter (format: "key1:value1,key2:value2")
 */
export function parseAddClaims(addClaimsStr) {
  const claims = {};
  if (!addClaimsStr) return claims;

  const pairs = addClaimsStr.split(',');
  pairs.forEach(pair => {
    const [key, ...valueParts] = pair.split(':');
    const value = valueParts.join(':'); // Handle values with colons
    if (key && value) {
      claims[key.trim()] = value.trim();
    }
  });

  return claims;
}

/**
 * Parse remove_claims parameter (format: "claim1,claim2,claim3")
 */
export function parseRemoveClaims(removeClaimsStr) {
  if (!removeClaimsStr) return [];
  return removeClaimsStr.split(',').map(c => c.trim()).filter(c => c);
}

/**
 * Parse and validate token exchange request parameters
 * Returns { claims, resource, audience, requestedTokenType } or error response
 */
export async function parseTokenExchangeRequest(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'Content-Type must be application/x-www-form-urlencoded'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  const formData = new URLSearchParams(await request.text());

  // Extract and validate required parameters
  const subjectToken = formData.get('subject_token');
  if (!subjectToken) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'subject_token parameter is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  const subjectTokenType = formData.get('subject_token_type');
  if (!subjectTokenType) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'subject_token_type parameter is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  // Validate subject_token_type
  const validTokenTypes = [
    'urn:ietf:params:oauth:token-type:jwt',
    'urn:ietf:params:oauth:token-type:id_token',
    'urn:ietf:params:oauth:token-type:access_token'
  ];

  if (!validTokenTypes.includes(subjectTokenType)) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'unsupported_token_type',
          error_description: `Unsupported subject_token_type. Supported types: ${validTokenTypes.join(', ')}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  // Extract claims from subject token
  let subjectClaims;
  try {
    subjectClaims = extractTokenClaims(subjectToken, subjectTokenType);
  } catch (error) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'invalid_request',
          error_description: error.message
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  // Extract optional parameters
  const resource = formData.get('resource');
  const audience = formData.get('audience');
  const requestedTokenType = formData.get('requested_token_type') ||
                             'urn:ietf:params:oauth:token-type:access_token';

  // Parse claim transformations
  const addClaims = parseAddClaims(formData.get('add_claims'));
  const removeClaims = parseRemoveClaims(formData.get('remove_claims'));

  // Build new token claims
  let newClaims = { ...subjectClaims };

  // Remove specified claims
  removeClaims.forEach(claim => {
    delete newClaims[claim];
  });

  // Add new claims
  Object.assign(newClaims, addClaims);

  // Update resource if provided
  if (resource) {
    newClaims.aud = resource;
  }

  // Update audience if provided (overrides resource)
  if (audience) {
    newClaims.aud = audience;
  }

  return {
    claims: newClaims,
    resource,
    audience,
    requestedTokenType,
    subjectTokenType
  };
}
