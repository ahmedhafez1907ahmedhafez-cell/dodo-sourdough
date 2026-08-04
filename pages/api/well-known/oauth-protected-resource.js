export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  const oauthProtectedResource = {
    "resource": "https://your-domain.com",
    "resource_id": "dodo-sourdough-app",
    "authorization_servers": [
      "https://your-domain.com/api/auth"
    ],
    "scopes_supported": [
      "products:read",
      "orders:read",
      "orders:write",
      "profile:read",
      "profile:write",
      "reviews:read",
      "reviews:write"
    ],
    "bearer_methods_supported": ["header"],
    "resource_documentation": "/auth.md"
  };

  res.status(200).json(oauthProtectedResource);
}
