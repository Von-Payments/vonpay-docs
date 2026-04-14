import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Von Payments Docs',
  tagline: 'Hosted checkout. Create a session, redirect the buyer, get paid.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.vonpay.com',
  baseUrl: '/',

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'alternate',
        type: 'text/plain',
        href: 'https://checkout.vonpay.com/llms.txt',
        title: 'LLM-readable API reference',
      },
    },
  ],

  organizationName: 'Von-Payments',
  projectName: 'vonpay-docs',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/Von-Payments/vonpay-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Von Payments',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/Von-Payments',
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
            { label: 'Quickstart', to: '/quickstart' },
            { label: 'API Reference', to: '/reference/api' },
            { label: 'Node SDK', to: '/sdks/node-sdk' },
          ],
        },
        {
          title: 'Integration',
          items: [
            { label: 'Create Session', to: '/integration/create-session' },
            { label: 'Handle Return', to: '/integration/handle-return' },
            { label: 'Security', to: '/reference/security' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'GitHub', href: 'https://github.com/Von-Payments' },
            { label: 'Status', href: 'https://checkout.vonpay.com/api/health' },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Von Payments. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'php', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
