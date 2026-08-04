/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '</.well-known/api-catalog>; rel="api-catalog", </.well-known/agent-skills/index.json>; rel="agent-skills", </auth.md>; rel="service-doc", </.well-known/mcp/server-card.json>; rel="mcp-server-card"',
          },
          {
            key: 'Vary',
            value: 'Accept',
          },
        ],
      },
      {
        source: '/.well-known/api-catalog',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/linkset+json',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Vary',
            value: 'Accept',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
