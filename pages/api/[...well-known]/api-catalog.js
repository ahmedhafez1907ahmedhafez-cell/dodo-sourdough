export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/linkset+json');
  
  const apiCatalog = {
    linkset: [
      {
        anchor: '/api/products',
        rel: ['service-desc', 'service-doc'],
        href: '/api/products',
        type: 'application/json',
        title: 'Products API'
      },
      {
        anchor: '/api/orders',
        rel: ['service-desc', 'service-doc'],
        href: '/api/orders',
        type: 'application/json',
        title: 'Orders API'
      },
      {
        anchor: '/api/reviews',
        rel: ['service-desc', 'service-doc'],
        href: '/api/reviews',
        type: 'application/json',
        title: 'Reviews API'
      },
      {
        anchor: '/api/auth',
        rel: ['service-desc', 'service-doc'],
        href: '/api/auth',
        type: 'application/json',
        title: 'Authentication API'
      },
      {
        anchor: '/api/content',
        rel: ['service-desc', 'service-doc'],
        href: '/api/content',
        type: 'application/json',
        title: 'Content API'
      },
      {
        anchor: '/api/products',
        rel: ['status'],
        href: '/api/products/health',
        type: 'application/json',
        title: 'Products Health Check'
      }
    ]
  };

  res.status(200).json(apiCatalog);
}
