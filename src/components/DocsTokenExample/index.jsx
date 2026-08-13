import React, { useMemo, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

function getApiBaseUrl(configuredApiBaseUrl) {
  if (typeof configuredApiBaseUrl === 'string' && configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:8787';
  }

  const isLocalDocs =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalDocs && window.location.port !== '8787') {
    return 'http://localhost:8787';
  }

  return window.location.origin;
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function decodeJwtPart(value) {
  if (!value) return null;
  try {
    let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const remainder = base64.length % 4;
    if (remainder === 2) base64 += '==';
    if (remainder === 3) base64 += '=';
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  if (!token || typeof token !== 'string') {
    return { header: null, body: null, signature: '' };
  }

  const [header, body, signature = ''] = token.split('.');
  return {
    header: decodeJwtPart(header),
    body: decodeJwtPart(body),
    signature,
  };
}

export default function DocsTokenExample({ request }) {
  const { siteConfig } = useDocusaurusContext();
  const configuredApiBaseUrl = siteConfig.customFields?.jwtforgeApiBaseUrl;
  const baseUrl = useMemo(
    () => getApiBaseUrl(configuredApiBaseUrl),
    [configuredApiBaseUrl]
  );
  const endpoint = `${baseUrl.replace(/\/$/, '')}/token`;
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = response?.access_token || response?.id_token || '';
  const curl = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${prettyJson(request)}'`;
  const decoded = useMemo(() => decodeJwt(token), [token]);
  const decodedOutput = token
    ? {
        header: decoded.header,
        body: decoded.body,
        signature: decoded.signature,
      }
    : null;

  async function generateToken() {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const json = await result.json();
      if (!result.ok) {
        throw new Error(json.message || json.error_description || json.error || `HTTP ${result.status}`);
      }
      setResponse(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyCurl() {
    await navigator.clipboard.writeText(curl);
  }

  return (
    <div className={styles.example}>
      <div className={styles.header}>
        <span>POST <code>/token</code></span>
        <div className={styles.actions}>
          <button className={styles.button} onClick={generateToken} disabled={loading}>
            {loading ? 'Generating...' : 'Generate token'}
          </button>
          <button className={styles.secondaryButton} onClick={copyCurl}>
            Copy curl
          </button>
        </div>
      </div>
      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Request</div>
          <pre>{prettyJson(request)}</pre>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Response</div>
          <pre>{response ? prettyJson(response) : 'No response yet'}</pre>
        </div>
      </div>
      <div className={styles.decodedPanel}>
        <div className={styles.panelHeader}>Decoded token</div>
        <pre>{decodedOutput ? prettyJson(decodedOutput) : 'No token yet'}</pre>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
