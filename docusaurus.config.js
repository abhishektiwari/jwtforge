// @ts-check

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'JWTForge',
  tagline: 'A JWT Vending Service for Testing, Fuzzing, and Security Research of OAuth2/OIDC Implementations.',
  favicon: 'img/favicon.svg',
  url: 'https://jwtforge.dev',
  baseUrl: '/',
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

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/jwtforge-social-card.svg',
      navbar: {
        logo: {
          alt: 'JWTForge',
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
        items: [
          { to: '/', label: 'Try', position: 'left' },
          { to: '/docs/intro', label: 'Docs', position: 'left' },
          { to: '/api-reference', label: 'Swagger', position: 'left' },
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
              { label: 'Overview', to: '/docs/intro' },
              { label: 'Structured JSON', to: '/docs/token-endpoint/structured-json' },
              { label: 'Grammar Templates', to: '/docs/modes/grammar' },
            ],
          },
          {
            title: 'Reference',
            items: [
              { label: 'Swagger', to: '/api-reference' },
              { label: 'GitHub', href: 'https://github.com/abhishektiwari/jwtforge' },
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
