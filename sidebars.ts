import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    'quickstart',
    'how-it-works',
    {
      type: 'category',
      label: 'Integration',
      items: [
        'integration/create-session',
        'integration/redirect-to-checkout',
        'integration/handle-return',
        'integration/webhooks',
      ],
    },
    {
      type: 'category',
      label: 'SDKs',
      items: [
        'sdks/vonpay-js',
        'sdks/node-sdk',
        'sdks/rest-api',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/api',
        'reference/session-object',
        'reference/error-codes',
        'reference/security',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/test-in-sandbox',
        'guides/going-live',
      ],
    },
  ],
};

export default sidebars;
