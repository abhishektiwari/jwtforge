/**
 * OIDC Discovery Endpoint
 * Provides OpenID Connect configuration document (RFC 5849)
 */

/**
 * Handle OIDC Discovery endpoint
 * GET /.well-known/openid-configuration
 * Returns OpenID Connect configuration document with endpoint URLs and capabilities
 */
export async function handleDiscoveryRequest(request) {
  const url = new URL(request.url);
  const issuer = `${url.protocol}//${url.host}`;

  const discoveryDocument = {
    issuer: issuer,
    token_endpoint: `${issuer}/token`,
    introspection_endpoint: `${issuer}/introspect`,
    introspection_endpoint_auth_methods_supported: ['http_basic'],
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['token', 'id_token', 'id_token token', 'token id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256', 'ES256'],
    token_endpoint_auth_methods_supported: ['none', 'http_basic'],
    scopes_supported: ['openid', 'profile', 'email', 'address', 'phone'],
    claims_supported: [
      'sub', 'iss', 'aud', 'exp', 'iat', 'nbf', 'jti',
      'name', 'given_name', 'family_name', 'middle_name', 'nickname',
      'preferred_username', 'profile', 'picture', 'website',
      'email', 'email_verified',
      'gender', 'birthdate', 'zoneinfo', 'locale',
      'phone_number', 'phone_number_verified',
      'address', 'updated_at',
      'scope', 'roles', 'groups', 'nonce', 'client_id'
    ],
    grant_types_supported: ['client_credentials'],
    service_documentation: 'https://github.com/abhishektiwari/jwtforge'
  };

  return new Response(JSON.stringify(discoveryDocument, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  });
}
