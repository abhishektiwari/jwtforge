/**
 * OpenAPI Specification and Swagger UI for JWTForge
 */

import { openApiTokenExamples } from './token-examples.js';

/**
 * Generate OpenAPI 3.0 specification
 */
export function getOpenAPISpec(baseUrl) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'JWTForge',
      description: `JWT Token Vending Service for Testing`,
      version: '0.0.1',
      contact: {
        name: 'JWTForge',
        url: 'https://jwtforge.dev'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: baseUrl,
        description: 'Current server'
      }
    ],
    paths: {
      '/token': {
        post: {
          tags: ['Token-Endpoint'],
          summary: 'Generate JWT Token',
          description: 'Generate a signed JWT token with JSON payloads using header/body/signature, flat top-level claim payloads for backward compatibility, OAuth2 client_credentials grant (RFC 6749, form-encoded with Basic auth), or token exchange (RFC 8693, form-encoded). Client ID is auto-generated if not provided. **Using Client Credentials from Swagger:** Click "Authorize" (top right), select basicAuth, enter the same value for both username and password (your client_id). Then select `application/x-www-form-urlencoded` content type and fill in the form fields.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    response_type: {
                      type: 'string',
                      enum: ['token', 'id_token', 'id_token token', 'token id_token'],
                      default: 'token',
                      description: 'OAuth2/OIDC response type: "token" (access token), "id_token" (ID token), or "id_token token" (both)'
                    },
                    kty: {
                      type: 'string',
                      enum: ['RSA', 'EC'],
                      default: 'RSA',
                      description: 'Key type for signing (RSA=RS256, EC=ES256)'
                    },
                    mode: {
                      type: 'string',
                      enum: ['fake', 'fuzz', 'malicious', 'grammar', 'malcious', 'grammer'],
                      default: 'fake',
                      description: 'Token generation mode: "fake" (realistic data with OIDC scopes), "fuzz" (random fuzzed values), "malicious" (security testing payloads), "grammar" (FBNF grammar-based patterns). Misspelled aliases "malcious" and "grammer" are accepted and normalized.'
                    },
                    vulnerability: {
                      type: 'string',
                      enum: ['alg_none', 'rs_hs_confusion', 'kid_traversal', 'jku_injection', 'embedded_jwk'],
                      description: 'Known JWT vulnerability preset. Applies to the header/signature model before mode transformations.'
                    },
                    alg_none_variant: {
                      type: 'string',
                      enum: ['none', 'None', 'NONE', 'nOne', 'nOnE'],
                      default: 'none',
                      description: 'Optional with vulnerability=alg_none. Sets the exact case variation for header.alg. Any case variation of "none" is accepted.'
                    },
                    malicious_category: {
                      type: 'string',
                      enum: ['sql_injection', 'xss', 'path_traversal', 'command_injection', 'ldap_injection', 'nosql_injection', 'xml_injection', 'template_injection', 'header_injection', 'buffer_overflow'],
                      description: 'Required when mode=malicious. Selects specific attack category for injection payloads. Example: sql_injection injects SQL patterns into claims.'
                    },
                    grammar_category: {
                      type: 'string',
                      enum: ['valid', 'edge_cases', 'type_variations', 'injection', 'vulnerable'],
                      description: 'Optional when mode=grammar. Selects grammar pattern category for claim values. Default: "valid". Example: injection generates claims with injection patterns.'
                    },
                    exclude: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'List of claim names to exclude from fuzz/malicious transformations (e.g., ["exp", "nbf", "iat"] to create infinitely valid tokens). Always protected: iss, jti'
                    },
                    header: {
                      type: 'object',
                      description: 'JWT header overrides. Supported fields: alg, typ, cty, kid, jku, jwk, crit. Custom header parameters are allowed only when their names are listed in crit. Unsupported and rejected: x5u, x5c, x5t.',
                      properties: {
                        alg: { type: 'string', description: 'JWT algorithm header value' },
                        typ: { type: 'string', default: 'JWT', description: 'JWT type header value. Defaults to "JWT" and can be overridden.' },
                        cty: { type: 'string', description: 'JWT content type header value. Omitted by default; set explicitly for nested JWTs or application-specific content parsing.' },
                        kid: { type: 'string', description: 'JWT key ID header value' },
                        jku: { type: 'string', description: 'JWK Set URL header value' },
                        jwk: { type: 'object', description: 'Embedded JWK header value' },
                        crit: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Critical header parameter names. Each name listed here must also be present as a header parameter.'
                        }
                      },
                      additionalProperties: true
                    },
                    body: {
                      type: 'object',
                      description: 'JWT payload claims. Supports standard OIDC/OAuth2 and custom claims.',
                      additionalProperties: true
                    },
                    signature: {
                      oneOf: [
                        { type: 'boolean', enum: [false] },
                        { type: 'string' }
                      ],
                      description: 'JWT signature control. Omit to sign normally, set false for an unsigned trailing-dot token, or provide a literal signature segment string.'
                    },
                    header_alg: {
                      type: 'string',
                      description: 'Backward-compatible JWT header algorithm override. In fuzz mode, gets fuzzed to algorithm confusion attacks (none, None, HS256, etc.). Prefer header.alg for new requests.'
                    },
                    header_kid: {
                      type: 'string',
                      description: 'Backward-compatible JWT header key ID override. In fuzz/malicious modes, gets transformed to BLNS patterns or injection payloads. Prefer header.kid for new requests.'
                    },
                    sig: {
                      type: 'boolean',
                      default: true,
                      description: 'Backward-compatible signature switch. Set to false to generate unsigned tokens. Prefer signature for new requests.'
                    },
                    iss: {
                      type: 'string',
                      description: 'Issuer'
                    },
                    sub: {
                      type: 'string',
                      description: 'Subject (user identifier)'
                    },
                    aud: {
                      type: 'string',
                      description: 'Audience'
                    },
                    exp: {
                      type: 'integer',
                      description: 'Expiration time (Unix timestamp)'
                    },
                    nbf: {
                      type: 'integer',
                      description: 'Not before (Unix timestamp)'
                    },
                    iat: {
                      type: 'integer',
                      description: 'Issued at (Unix timestamp)'
                    },
                    jti: {
                      type: 'string',
                      description: 'JWT ID'
                    },
                    name: {
                      type: 'string',
                      description: 'Full name'
                    },
                    given_name: {
                      type: 'string',
                      description: 'First name'
                    },
                    family_name: {
                      type: 'string',
                      description: 'Last name'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'Email address'
                    },
                    email_verified: {
                      type: 'boolean',
                      description: 'Email verification status'
                    },
                    scope: {
                      type: 'string',
                      description: 'OAuth2 scopes'
                    },
                    roles: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'User roles'
                    },
                    groups: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'User groups'
                    },
                    nonce: {
                      type: 'string',
                      description: 'Nonce value for ID tokens (prevents replay attacks)'
                    },
                    client_id: {
                      type: 'string',
                      description: 'Client identifier (alphanumeric, underscores, and/or hyphens, up to 50 characters). If not provided, a random client_id will be auto-generated (e.g., client_a1b2c3d4)'
                    },
                    grant_type: {
                      type: 'string',
                      enum: ['client_credentials'],
                      description: 'OAuth2 grant type. For form-encoded requests using client_credentials, use Basic auth with Authorization header.'
                    }
                  },
                  additionalProperties: true
                },
                examples: openApiTokenExamples
              },
              'application/x-www-form-urlencoded': {
                schema: {
                  type: 'object',
                  required: ['grant_type'],
                  properties: {
                    grant_type: {
                      type: 'string',
                      enum: ['client_credentials', 'urn:ietf:params:oauth:grant-type:token-exchange'],
                      description: 'OAuth2 grant type: "client_credentials" (RFC 6749) or "urn:ietf:params:oauth:grant-type:token-exchange" (RFC 8693)'
                    },
                    scope: {
                      type: 'string',
                      description: 'OAuth2 scopes (space-separated, e.g., "openid profile email"). Used with client_credentials grant.'
                    },
                    sub: {
                      type: 'string',
                      description: 'Subject (user identifier). Used with client_credentials grant.'
                    },
                    subject_token: {
                      type: 'string',
                      description: 'The token being exchanged. Required for token-exchange grant.'
                    },
                    subject_token_type: {
                      type: 'string',
                      enum: ['urn:ietf:params:oauth:token-type:jwt', 'urn:ietf:params:oauth:token-type:id_token', 'urn:ietf:params:oauth:token-type:access_token'],
                      description: 'Type of the subject token. Required for token-exchange grant.'
                    },
                    resource: {
                      type: 'string',
                      description: 'Target resource for the exchanged token. Updates the "aud" claim. Optional for token-exchange.'
                    },
                    audience: {
                      type: 'string',
                      description: 'Target audience for the exchanged token. Overrides resource. Optional for token-exchange.'
                    },
                    requested_token_type: {
                      type: 'string',
                      enum: ['urn:ietf:params:oauth:token-type:access_token', 'urn:ietf:params:oauth:token-type:jwt', 'urn:ietf:params:oauth:token-type:id_token'],
                      description: 'Type of token to return. Defaults to access_token. Optional for token-exchange.'
                    },
                    add_claims: {
                      type: 'string',
                      description: 'Claims to add to the exchanged token. Format: key1:value1,key2:value2. Optional for token-exchange.'
                    },
                    remove_claims: {
                      type: 'string',
                      description: 'Claims to remove from the exchanged token. Format: claim1,claim2,claim3. Optional for token-exchange.'
                    }
                  }
                },
                examples: {
                  clientCredentials: {
                    summary: 'OAuth2 client_credentials grant (RFC 6749)',
                    value: {
                      grant_type: 'client_credentials',
                      scope: 'openid profile email'
                    }
                  },
                  clientCredentialsWithSub: {
                    summary: 'Client credentials with custom subject',
                    value: {
                      grant_type: 'client_credentials',
                      scope: 'openid',
                      sub: 'test-user-123'
                    }
                  },
                  tokenExchange: {
                    summary: 'Token exchange (RFC 8693) - basic',
                    value: {
                      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                      subject_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS1rZXktMSJ9...',
                      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt'
                    }
                  },
                  tokenExchangeWithTransform: {
                    summary: 'Token exchange (RFC 8693) - with claim transformation',
                    value: {
                      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                      subject_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS1rZXktMSJ9...',
                      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
                      resource: 'https://api.example.com',
                      add_claims: 'scope:read write,dept:engineering',
                      remove_claims: 'email_verified,nbf'
                    }
                  }
                }
              }
            }
          },
          security: [
            {
              basicAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Token generated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      access_token: {
                        type: 'string',
                        description: 'The access token JWT (present if response_type is "token" or "id_token token")'
                      },
                      id_token: {
                        type: 'string',
                        description: 'The ID token JWT (present if response_type is "id_token" or "id_token token")'
                      },
                      token_type: {
                        type: 'string',
                        example: 'Bearer',
                        description: 'Token type, always "Bearer"'
                      },
                      expires_in: {
                        type: 'integer',
                        description: 'Token expiration in seconds'
                      },
                      scope: {
                        type: 'string',
                        description: 'OAuth2 scopes (included if provided in request or defaults to "openid profile email" for hybrid flows)'
                      },
                      algorithm: {
                        type: 'string',
                        example: 'RS256',
                        description: 'Algorithm used for signing (RS256 or ES256)'
                      },
                      key_id: {
                        type: 'string',
                        example: 'rsa-key-1',
                        description: 'Key ID (kid) used for signing'
                      },
                      issued_token_type: {
                        type: 'string',
                        example: 'urn:ietf:params:oauth:token-type:access_token',
                        description: 'Type of token returned (RFC 8693). Present in token exchange responses.'
                      },
                      subject_token_type: {
                        type: 'string',
                        example: 'urn:ietf:params:oauth:token-type:jwt',
                        description: 'Type of subject token that was exchanged (RFC 8693). Present in token exchange responses.'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string'
                      },
                      message: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/introspect': {
        post: {
          tags: ['OAuth2-OIDC-Endpoints'],
          summary: 'Introspect Token',
          description: 'Validate and retrieve information about a token (RFC 7662). Requires Basic authentication with client_id (alphanumeric, underscores, and/or hyphens, up to 50 characters). Returns token claims if valid, or {"active": false} if invalid.',
          security: [
            {
              basicAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/x-www-form-urlencoded': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: {
                      type: 'string',
                      description: 'The token string to introspect'
                    },
                    token_type_hint: {
                      type: 'string',
                      enum: ['access_token'],
                      description: 'Optional hint about token type. Currently only "access_token" is supported.'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Token introspection response (RFC 7662)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      active: {
                        type: 'boolean',
                        description: 'Whether the token is currently valid'
                      },
                      scope: {
                        type: 'string',
                        description: 'Space-separated list of scopes'
                      },
                      client_id: {
                        type: 'string',
                        description: 'Client identifier'
                      },
                      username: {
                        type: 'string',
                        description: 'Username'
                      },
                      token_type: {
                        type: 'string',
                        description: 'Token type (e.g., "Bearer")'
                      },
                      exp: {
                        type: 'integer',
                        description: 'Token expiration time (Unix timestamp)'
                      },
                      iat: {
                        type: 'integer',
                        description: 'Issued at time (Unix timestamp)'
                      },
                      nbf: {
                        type: 'integer',
                        description: 'Not before time (Unix timestamp)'
                      },
                      sub: {
                        type: 'string',
                        description: 'Subject (user identifier)'
                      },
                      iss: {
                        type: 'string',
                        description: 'Issuer'
                      },
                      aud: {
                        type: 'string',
                        description: 'Audience'
                      },
                      jti: {
                        type: 'string',
                        description: 'JWT ID (unique token identifier)'
                      }
                    },
                    example: {
                      active: true,
                      scope: 'openid profile email',
                      sub: 'user123',
                      iss: 'https://jwtforge.example.com',
                      aud: 'https://api.example.com',
                      exp: 1735689600,
                      iat: 1735686000,
                      nbf: 1735686000,
                      jti: '550e8400-e29b-41d4-a716-446655440000',
                      name: 'John Doe',
                      email: 'john@example.com'
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Invalid or missing authorization',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'invalid_client'
                      },
                      error_description: {
                        type: 'string',
                        example: 'Invalid authorization'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'invalid_request'
                      },
                      error_description: {
                        type: 'string',
                        example: 'token parameter is required'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/.well-known/jwks.json': {
        get: {
          tags: ['OAuth2-OIDC-Endpoints'],
          summary: 'Get JWKS',
          description: 'Retrieve JSON Web Key Set containing public keys for token verification. Returns both RSA and EC keys.',
          responses: {
            '200': {
              description: 'JWKS response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      keys: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            kty: {
                              type: 'string',
                              description: 'Key type'
                            },
                            use: {
                              type: 'string',
                              description: 'Public key use'
                            },
                            kid: {
                              type: 'string',
                              description: 'Key ID'
                            },
                            alg: {
                              type: 'string',
                              description: 'Algorithm'
                            },
                            n: {
                              type: 'string',
                              description: 'RSA modulus (for RSA keys)'
                            },
                            e: {
                              type: 'string',
                              description: 'RSA exponent (for RSA keys)'
                            },
                            crv: {
                              type: 'string',
                              description: 'EC curve (for EC keys)'
                            },
                            x: {
                              type: 'string',
                              description: 'EC x coordinate (for EC keys)'
                            },
                            y: {
                              type: 'string',
                              description: 'EC y coordinate (for EC keys)'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/.well-known/openid-configuration': {
        get: {
          tags: ['OAuth2-OIDC-Endpoints'],
          summary: 'OpenID Connect Discovery',
          description: 'Retrieve OpenID Connect discovery document with supported endpoints, algorithms, and claims.',
          responses: {
            '200': {
              description: 'Discovery document',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      issuer: {
                        type: 'string'
                      },
                      authorization_endpoint: {
                        type: 'string'
                      },
                      token_endpoint: {
                        type: 'string'
                      },
                      jwks_uri: {
                        type: 'string'
                      },
                      response_types_supported: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      },
                      subject_types_supported: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      },
                      id_token_signing_alg_values_supported: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      },
                      scopes_supported: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      },
                      claims_supported: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic',
          description: 'Basic authentication: Username is the client_id (alphanumeric, underscores, and/or hyphens, up to 50 characters). Password must equal the client_id. Format: base64(client_id:client_id)'
        }
      }
    }
  };
}

/**
 * Handle OpenAPI spec endpoint
 */
function getIssuerBaseUrl(request, env) {
  if (env?.ISSUER) {
    return env.ISSUER.replace(/\/$/, '');
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function handleOpenAPIRequest(request, env) {
  const baseUrl = getIssuerBaseUrl(request, env);
  const spec = getOpenAPISpec(baseUrl);

  return new Response(JSON.stringify(spec, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Handle root endpoint - Swagger UI
 */
export function handleRootRequest(request, env) {
  const baseUrl = getIssuerBaseUrl(request, env);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JWTForge - JWT Token Vending Service</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .swagger-ui .topbar {
      display: none;
    }
    .swagger-ui .info .title {
      font-size: 2.5em;
    }
    .swagger-ui .info {
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const spec = ${JSON.stringify(getOpenAPISpec(baseUrl))};

      window.ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1
      });
    };
  </script>
</body>
</html>
  `;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}
