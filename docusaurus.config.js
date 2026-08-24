// @ts-check

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

const siteDescription =
  'JWTForge: A JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations.';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'JWTForge',
  tagline: siteDescription,
  favicon: 'img/favicon.svg',
  url: 'https://jwtforge.dev',
  baseUrl: '/',
  trailingSlash: true,
  organizationName: 'abhishektiwari',
  projectName: 'jwtforge',
  customFields: {
    jwtforgeApiBaseUrl: process.env.JWTFORGE_API_BASE_URL || '',
  },
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  headTags: [
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'JWTForge',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cloudflare Workers, Node.js',
        description: siteDescription,
        url: 'https://jwtforge.dev',
        codeRepository: 'https://github.com/abhishektiwari/jwtforge',
        image: 'https://jwtforge.dev/img/jwtforge-social-card.svg',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      }),
    },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/docs',
          editUrl: 'https://github.com/abhishektiwari/jwtforge/tree/main/',
        },
        blog: false,
        sitemap: {
          changefreq: 'weekly',
          priority: 0.7,
          filename: 'sitemap.xml',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-llms',
      {
        title: 'JWTForge Documentation',
        description: siteDescription,
        docsDir: [{ path: 'docs', routeBasePath: 'docs', label: 'Documentation' }],
        generateLLMsTxt: true,
        generateLLMsFullTxt: true,
        generateMarkdownFiles: true,
        excludeImports: true,
        removeDuplicateHeadings: true,
        includeOrder: [
          'intro.md',
          'token-endpoint/*.md',
          'modes/*.md',
          'attacks/*.md',
          'evaluation.md',
          'cli.md',
          'openapi-pen-test-generator.md',
          'reference/*.md',
          'development.md',
        ],
        rootContent:
          'Use these links for agent-friendly access to JWTForge guides, token endpoint examples, testing modes, attack scenarios, CLI usage, and API reference material.',
        fullRootContent:
          'Complete agent-friendly JWTForge documentation bundle covering structured JSON requests, testing modes, attack scenarios, CLI usage, and API reference material.',
        logLevel: 'normal',
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/jwtforge-social-card.svg',
      metadata: [
        {
          name: 'keywords',
          content:
            'JWT, JSON Web Token, OAuth2, OIDC, OpenID Connect, token testing, JWT fuzzing, security testing, Cloudflare Workers',
        },
        { name: 'twitter:card', content: 'summary_large_image' },
        { property: 'og:type', content: 'website' },
        { name: 'robots', content: 'index,follow' },
      ],
      navbar: {
        logo: {
          alt: 'JWTForge',
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
        items: [
          { to: '/', label: 'Try', position: 'left' },
          { to: '/docs/intro/', label: 'Docs', position: 'left' },
          {
            to: '/docs/openapi-pen-test-generator/',
            label: 'OpenAPI Pen Test Generator',
            position: 'left',
          },
          { to: '/api-reference/', label: 'Swagger', position: 'left' },
          {
            href: 'https://github.com/abhishektiwari/jwtforge',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Overview', to: '/docs/intro/' },
              { label: 'Structured JSON', to: '/docs/token-endpoint/structured-json/' },
              { label: 'Grammar Templates', to: '/docs/modes/grammar/' },
              {
                label: 'OpenAPI Pen Test Generator',
                to: '/docs/openapi-pen-test-generator/',
              },
            ],
          },
          {
            title: 'Reference',
            items: [
              { label: 'Swagger', to: '/api-reference/' },
              { label: 'GitHub', href: 'https://github.com/abhishektiwari/jwtforge' },
            ],
          },
          {
            title: 'Agents',
            items: [
              { label: 'llms.txt', href: 'https://jwtforge.dev/llms.txt' },
              { label: 'llms-full.txt', href: 'https://jwtforge.dev/llms-full.txt' },
            ],
          },
        ],
        copyright: `Copyright ${new Date().getFullYear()} JWTForge. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'json'],
      },
    }),
};

module.exports = config;
