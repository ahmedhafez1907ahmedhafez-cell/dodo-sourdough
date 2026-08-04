import { GetServerSideProps } from 'next';

const BASE_URL = 'https://dodo-sourdough.vercel.app';

// Define all public pages that should be indexed
const PUBLIC_PAGES = [
  {
    url: '/',
    lastModified: new Date('2026-08-04'),
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: '/content',
    lastModified: new Date('2026-08-03'),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: '/reviews',
    lastModified: new Date('2026-07-30'),
    changeFrequency: 'daily',
    priority: 0.7,
  },
  {
    url: '/profile',
    lastModified: new Date('2026-08-03'),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
];

// Excluded routes (not included in sitemap):
// - /admin/* - Admin dashboard and authentication
// - /api/* - API endpoints (not for indexing)
// - Authentication pages (login/signup) - disabled in current implementation
// - Error pages - automatically handled by Next.js
// - Private/utility routes - not for public indexing

function generateSitemap() {
  const urlset = PUBLIC_PAGES.map((page) => {
    const lastMod = page.lastModified.toISOString().split('T')[0];
    return `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  const sitemap = generateSitemap();

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default function Sitemap() {
  // This component is never rendered - it's only for the XML output
  return null;
}
