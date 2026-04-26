import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    'quickstart',
    'how-it-works',
    'troubleshooting',
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/vora',
      ],
    },
    {
      type: 'category',
      label: 'Integration',
      items: [
        'integration/create-session',
        'integration/redirect-to-checkout',
        'integration/handle-return',
        'integration/webhooks',
        'integration/webhook-events',
        'integration/webhook-verification',
        'integration/webhook-secrets',
        'integration/ai-agents',
      ],
    },
    {
      type: 'category',
      label: 'SDKs & Tools',
      items: [
        'sdks/node-sdk',
        'sdks/vonpay-js',
        'sdks/python-sdk',
        'sdks/cli',
        'sdks/mcp',
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
        'reference/api-keys',
        'reference/security',
        'reference/versioning',
        'reference/test-cards',
        'reference/rate-limits',
        'reference/discovery',
        'sdk-telemetry',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/test-in-sandbox',
        'guides/sandbox',
        'guides/going-live',
        'guides/go-live-checklist',
        'guides/platform-sandbox',
      ],
    },
    {
      type: 'category',
      label: 'Platforms',
      items: [
        'platforms/index',
      ],
    },
  ],
};

export default sidebars;
