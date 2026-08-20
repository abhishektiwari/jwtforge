/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    'development',
    'cli',
    {
      type: 'category',
      label: 'Token Endpoint',
      items: [
        'token-endpoint/structured-json',
        'token-endpoint/legacy-flat-json',
        'token-endpoint/signatures',
      ],
    },
    {
      type: 'category',
      label: 'Modes',
      items: ['modes/overview', 'modes/fake', 'modes/fuzz', 'modes/malicious', 'modes/grammar'],
    },
    {
      type: 'category',
      label: 'Attacks',
      items: [
        'attacks/alg-none',
        'attacks/rs-hs-confusion',
        'attacks/kid-injection',
        'attacks/jku-injection',
        'attacks/embedded-jwk',
      ],
    },
    'evaluation',
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/oidc-oauth2-claims',
        'reference/oidc-scopes',
        'reference/header-fields',
        'reference/openapi',
      ],
    },
    'openapi-pen-test-generator',
  ],
};

module.exports = sidebars;
