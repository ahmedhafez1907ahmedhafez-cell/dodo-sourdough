# Auth.md

# Dodo Sourdough App

## Agent Authentication & Registration

This document describes how AI agents can authenticate and interact with the Dodo Sourdough App API.

---

## Agent Registration

### Registration Endpoint
`POST https://your-domain.com/api/auth/agent-register`

### Required Information
- **Agent Name**: Your agent's identifier
- **Description**: What your agent does
- **Use Case**: Intended usage
- **Contact**: Support contact information
- **Capabilities**: List of API endpoints needed

### Registration Process
1. Submit registration request with agent details
2. Receive approval and credentials
3. Configure your agent with provided credentials

### Credentials Provided
- `client_id`: Unique agent identifier
- `client_secret`: Secret for authentication
- `api_key`: Alternative simple API key

---

## Authentication Methods

### Public Access (No Authentication)
The following endpoints are publicly accessible and do not require authentication:
- `GET /api/products` - Browse product catalog
- `GET /api/reviews` - Read customer reviews
- `GET /api/content` - Access public content

### Authentication Required
The following endpoints require authentication:
- `POST /api/orders` - Create orders
- `PUT /api/orders/:id` - Update orders
- `DELETE /api/orders/:id` - Cancel orders
- `GET /api/profile` - Access user profile
- `PUT /api/profile` - Update user profile

### Step 3: Use Your Credentials
Include your credentials in API requests:

```bash
# Using API Key (simpler)
curl -H "X-API-Key: your_api_key" https://your-domain.com/api/orders

# Using OAuth 2.0 Bearer Token
curl -H "Authorization: Bearer your_access_token" https://your-domain.com/api/orders
```

---

## OAuth 2.0 Flow

### Authorization Code Flow
1. Redirect users to: `https://your-domain.com/api/auth/authorize`
   - `response_type=code`
   - `client_id=your_client_id`
   - `redirect_uri=your_redirect_uri`
   - `scope=orders profile`

2. Receive authorization code

3. Exchange code for access token:
   ```
   POST https://your-domain.com/api/auth/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=authorization_code&code=code&redirect_uri=your_redirect_uri
   ```

4. Use access token in API requests

---

## Agent Capabilities

### Supported Operations
- **Product Discovery**: Browse and search products
- **Order Management**: Create and manage orders (with authentication)
- **Content Access**: Read public content and reviews
- **Profile Management**: Access and update user profiles (with authentication)

### Rate Limits
- Public endpoints: 100 requests/minute
- Authenticated endpoints: 1000 requests/minute
- Burst limit: 200 requests/10 seconds

---

## API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get specific product details

### Orders
- `POST /api/orders` - Create new order (requires auth)
- `GET /api/orders` - List user orders (requires auth)
- `GET /api/orders/:id` - Get order details (requires auth)
- `PUT /api/orders/:id` - Update order (requires auth)

### Reviews
- `GET /api/reviews` - List all reviews
- `POST /api/reviews` - Submit review (requires auth)

### Content
- `GET /api/content` - Get public content

---

## Error Handling

API responses follow standard HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Server Error

Error response format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional context"
  }
}
```

---

## Support

For agent registration and API support:
- Email: support@dodosourdough.com
- Documentation: https://your-domain.com/docs/api
- Status: https://your-domain.com/api/status

---

## Compliance

This API complies with:
- RFC 9727 (API Catalog)
- RFC 8288 (Link Headers)
- RFC 9309 (robots.txt)
- OAuth 2.0 and OpenID Connect specifications

---

## Additional Resources

- API Catalog: `/.well-known/api-catalog`
- Agent Skills: `/.well-known/agent-skills/index.json`
- MCP Server Card: `/.well-known/mcp/server-card.json`
- robots.txt: `/robots.txt`
- OAuth Protected Resource: `/.well-known/oauth-protected-resource`
- OAuth Authorization Server: `/.well-known/oauth-authorization-server`
