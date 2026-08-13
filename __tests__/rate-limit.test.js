jest.mock('@faker-js/faker', () => ({
  faker: {
    person: {
      firstName: () => 'Test',
      lastName: () => 'User',
      fullName: () => 'Test User',
      middleName: () => 'Middle',
      sex: () => 'female',
    },
    internet: {
      username: () => 'testuser',
      url: () => 'https://example.com',
      email: () => 'test@example.com',
    },
    image: {
      avatar: () => 'https://example.com/avatar.png',
    },
    date: {
      birthdate: () => new Date('1990-01-01T00:00:00Z'),
    },
    location: {
      timeZone: () => 'UTC',
      countryCode: () => 'US',
      streetAddress: () => '1 Test St',
      city: () => 'Test City',
      state: () => 'TS',
      zipCode: () => '12345',
    },
    datatype: {
      boolean: () => true,
    },
    phone: {
      number: () => '+15555550100',
    },
  },
}));

import worker from '../src/index.js';

describe('API rate limiting', () => {
  test('returns 429 when token endpoint exceeds the API rate limit', async () => {
    const limit = jest.fn().mockResolvedValue({ success: false });
    const response = await worker.fetch(
      new Request('https://jwtforge.dev/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.10',
        },
        body: JSON.stringify({ body: { sub: 'user123' } }),
      }),
      {
        API_RATE_LIMITER: { limit },
      }
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(limit).toHaveBeenCalledWith({ key: '/token:203.0.113.10' });
    await expect(response.json()).resolves.toMatchObject({
      error: 'rate_limit_exceeded',
    });
  });

  test('does not rate limit static asset requests', async () => {
    const limit = jest.fn();
    const assetResponse = new Response('<html>docs</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
    const assetsFetch = jest.fn().mockResolvedValue(assetResponse);

    const response = await worker.fetch(
      new Request('https://jwtforge.dev/docs/intro'),
      {
        API_RATE_LIMITER: { limit },
        ASSETS: { fetch: assetsFetch },
      }
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<html>docs</html>');
    expect(limit).not.toHaveBeenCalled();
    expect(assetsFetch).toHaveBeenCalled();
  });

  test('does not consume rate limit quota for CORS preflight', async () => {
    const limit = jest.fn();
    const response = await worker.fetch(
      new Request('https://jwtforge.dev/token', { method: 'OPTIONS' }),
      {
        API_RATE_LIMITER: { limit },
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(limit).not.toHaveBeenCalled();
  });
});
