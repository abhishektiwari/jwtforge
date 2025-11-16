/**
 * OpenAPI Specification and Swagger UI for JWTForge
 */

/**
 * Generate OpenAPI 3.0 specification
 */
export function getOpenAPISpec(baseUrl) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'JWTForge',
      description: `JWT Token Vending Service for Testing

Generate JWT tokens with standard OIDC/OAuth2 and custom claims for your development and testing needs. 🚨🚨 Do not use in production environments 🚨🚨.  Use it for **fuzzing**, **end-to-end**, **penetration testing** of OIDC/OAuth2 applications and services. 

Follow or Fork [JWTForge on Github](https://github.com/abhishektiwari/jwtforge).

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge)`,

      version: '0.0.1',
      contact: {
        name: 'JWTForge',
        url: 'http://jwtforge.dev'
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
          description: 'Generate a signed JWT token with custom claims and optional key type selection (RSA or EC).',
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
                      enum: ['fake', 'fuzz', 'malicious'],
                      default: 'fake',
                      description: 'Token generation mode: "fake" (realistic data with OIDC scopes), "fuzz" (random fuzzed values), "malicious" (security testing payloads)'
                    },
                    exclude: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'List of claim names to exclude from fuzz/malicious transformations (e.g., ["exp", "nbf", "iat"] to create infinitely valid tokens). Always protected: iss, jti'
                    },
                    header_alg: {
                      type: 'string',
                      description: 'JWT header algorithm override. In fuzz mode, gets fuzzed to algorithm confusion attacks (none, None, HS256, etc.). Set to any value to enable header fuzzing in fuzz/malicious modes.'
                    },
                    header_kid: {
                      type: 'string',
                      description: 'JWT header key ID override. In fuzz/malicious modes, gets transformed to BLNS patterns or injection payloads. Set to any value to enable kid fuzzing.'
                    },
                    sig: {
                      type: 'boolean',
                      default: true,
                      description: 'Include signature in JWT. Set to false to generate unsigned tokens (for CVE-2020-28042 testing). When false, token ends with "." instead of a signature.'
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
                    }
                  },
                  additionalProperties: true
                },
                examples: {
                  accessToken: {
                    summary: 'Access token (response_type=token)',
                    value: {
                      response_type: 'token',
                      sub: 'user123',
                      scope: 'read write',
                      aud: 'https://api.example.com'
                    }
                  },
                  idToken: {
                    summary: 'ID token (response_type=id_token)',
                    value: {
                      response_type: 'id_token',
                      sub: 'user123',
                      name: 'John Doe',
                      email: 'john@example.com',
                      email_verified: true,
                      aud: 'my-client-app',
                      nonce: 'random-nonce-12345'
                    }
                  },
                  both: {
                    summary: 'Both tokens (response_type=id_token token)',
                    value: {
                      response_type: 'id_token token',
                      sub: 'user123',
                      name: 'John Doe',
                      email: 'john@example.com',
                      email_verified: true,
                      scope: 'openid profile email',
                      aud: 'my-client-app',
                      nonce: 'random-nonce-67890'
                    }
                  },
                  ec: {
                    summary: 'EC (ES256) token',
                    value: {
                      kty: 'EC',
                      sub: 'user@example.com',
                      name: 'Jane Smith'
                    }
                  },
                  custom: {
                    summary: 'Token with custom claims',
                    value: {
                      sub: 'user123',
                      name: 'Admin User',
                      roles: ['admin', 'user'],
                      permissions: ['read', 'write', 'delete'],
                      tenant_id: 'tenant-abc-123'
                    }
                  },
                  oidc: {
                    summary: 'Full OIDC profile',
                    value: {
                      sub: '12345678',
                      name: 'John Doe',
                      given_name: 'John',
                      family_name: 'Doe',
                      email: 'john@example.com',
                      email_verified: true,
                      picture: 'https://example.com/avatar.jpg',
                      locale: 'en-US'
                    }
                  },
                  fuzz: {
                    summary: 'Fuzz mode (random fuzzed values)',
                    value: {
                      mode: 'fuzz',
                      sub: 'user123',
                      name: 'Test User',
                      email: 'test@example.com',
                      roles: ['user']
                    }
                  },
                  malicious: {
                    summary: 'Malicious mode (security testing)',
                    value: {
                      mode: 'malicious',
                      sub: 'user123',
                      name: 'Test User',
                      email: 'test@example.com',
                      roles: ['user']
                    }
                  },
                  fuzzWithExclusions: {
                    summary: 'Fuzz mode with exclusions (infinitely valid token)',
                    value: {
                      mode: 'fuzz',
                      sub: 'user123',
                      name: 'Test User',
                      email: 'test@example.com',
                      roles: ['user'],
                      exclude: ['exp', 'nbf', 'iat']
                    }
                  },
                  algConfusion: {
                    summary: 'Algorithm confusion attack (header fuzzing)',
                    value: {
                      mode: 'fuzz',
                      sub: 'user123',
                      name: 'Test User',
                      header_alg: 'trigger-fuzz',
                      header_kid: 'trigger-fuzz'
                    }
                  },
                  cve20152951: {
                    summary: 'alg=none signature bypass',
                    value: {
                      sub: 'user123',
                      roles: ['admin'],
                      header_alg: 'none'
                    }
                  },
                  cve201610555: {
                    summary: 'RS/HS256 key confusion',
                    value: {
                      sub: 'user123',
                      roles: ['admin'],
                      header_alg: 'HS256'
                    }
                  },
                  cve20180114: {
                    summary: 'Key injection (kid parameter)',
                    value: {
                      sub: 'user123',
                      header_kid: '../../../../../../dev/null'
                    }
                  },
                  cve202028042: {
                    summary: 'Null signature',
                    value: {
                      sub: 'user123',
                      roles: ['admin'],
                      sig: false
                    }
                  }
                }
              }
            }
          },
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
    }
  };
}

/**
 * Handle OpenAPI spec endpoint
 */
export function handleOpenAPIRequest(request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const spec = getOpenAPISpec(baseUrl);

  return new Response(JSON.stringify(spec, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Handle root endpoint - Swagger UI
 */
export function handleRootRequest(request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

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
