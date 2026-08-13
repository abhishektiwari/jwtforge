import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import TryTokenWidget from '../components/TryTokenWidget';
import styles from './index.module.css';

export default function Home() {
  return (
    <Layout
      title="JWTForge: A JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations"
      description="A lightweight JWT token vending service for testing purposes, deployable on Cloudflare Workers."
    >
      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <h1><span className={styles.brandJwt}>JWT</span><span className={styles.brandForge}>Forge</span></h1>
              <p>
                A JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations.
              </p>
              <div className={styles.heroActions}>
                <Link className="button button--primary" to="/docs/intro">Read docs</Link>
                <Link className="button button--secondary" to="/api-reference">Swagger UI</Link>
                <a
                  className={styles.deployButton}
                  href="https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src="https://deploy.workers.cloudflare.com/button"
                    alt="Deploy to Cloudflare Workers"
                    width="184"
                    height="32"
                  />
                </a>
              </div>
            </div>
            <div className={styles.tokenPreview} aria-hidden="true">
              <div className={styles.segmentHeader}>header</div>
              <div className={styles.segmentBody}>body</div>
              <div className={styles.segmentSignature}>signature</div>
            </div>
          </div>
        </section>

        <section className={styles.trySection}>
          <div className={styles.sectionHeader}>
            <h2>Try the token endpoint</h2>
            <p>Build a request, generate a token, and inspect decoded JWT parts.</p>
          </div>
          <TryTokenWidget />
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.featuresInner}>
            <div className={`${styles.sectionHeader} ${styles.featuresHeader}`}>
              <h2>Built for OAuth2/OIDC testing</h2>
              <p>
                A lightweight JWT token vending service for testing purposes, deployable on Cloudflare Workers.
                Generate JWT tokens with standard OIDC/OAuth2 and custom claims for development and testing.
                Use it for fuzzing, end-to-end testing, and penetration testing of OAuth2/OIDC applications and services.
              </p>
              <div className={styles.featureActions}>
                <a className="button button--primary button--lg" href="https://github.com/abhishektiwari/jwtforge" target="_blank" rel="noreferrer">
                  Clone on GitHub
                </a>
                <a className="button button--secondary button--lg" href="https://deploy.workers.cloudflare.com/?url=https://github.com/abhishektiwari/jwtforge" target="_blank" rel="noreferrer">
                  Deploy to Cloudflare
                </a>
              </div>
            </div>
            <div className={styles.featureGrid}>
              <div className={styles.feature}>
                <h3>Token controls</h3>
                <p>Generate signed, unsigned, malformed, and literal-signature JWTs using explicit header, body, and signature inputs.</p>
              </div>
              <div className={styles.feature}>
                <h3>Security modes</h3>
                <p>Exercise fake, fuzz, malicious, and grammar-driven payloads to test unexpected values, custom claims, and parser behavior.</p>
              </div>
              <div className={styles.feature}>
                <h3>OIDC workflows</h3>
                <p>Use OIDC discovery, JWKS, response types, client credentials, introspection, and token exchange in local or CI workflows.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
