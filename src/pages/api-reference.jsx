import React, { useMemo } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './api-reference.module.css';

function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const isLocalDocs =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalDocs && window.location.port !== '8787') {
    return 'http://localhost:8787';
  }

  return '';
}

export default function ApiReference() {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const swaggerUrl = `${apiBaseUrl}/swagger`;
  const openApiUrl = `${apiBaseUrl.replace(/\/$/, '')}/openapi.json`;

  return (
    <Layout title="Swagger API reference" description="Swagger UI reference for JWTForge.">
      <main className={styles.referencePage}>
        <div className={styles.referenceHeader}>
          <h1>Swagger API reference</h1>
          <p>The Worker API serves Swagger UI with editable request forms and Try it out enabled.</p>
          <div className={styles.referenceMeta}>
            <span>Swagger UI: <code>{swaggerUrl}</code></span>
            <a href={swaggerUrl} target="_blank" rel="noreferrer">Open Swagger UI</a>
            <a href={openApiUrl} target="_blank" rel="noreferrer">Open raw OpenAPI JSON</a>
            <Link to="/docs/reference/openapi">How this works</Link>
          </div>
          <p className={styles.requestHint}>
            During local development, keep <code>npm run dev</code> running on port <code>8787</code>. If the embedded Swagger UI does not load, open it directly from the link above.
          </p>
        </div>
        <iframe
          className={styles.swaggerFrame}
          src={swaggerUrl}
          title="JWTForge Swagger UI"
        />
      </main>
    </Layout>
  );
}
