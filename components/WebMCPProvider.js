import { useEffect } from 'react';

export default function WebMCPProvider() {
  useEffect(() => {
    // Check if WebMCP API is available
    if (typeof navigator !== 'undefined' && navigator.modelContext) {
      // Define tools for AI agents
      const tools = [
        {
          name: 'search_products',
          description: 'Search and browse the sourdough product catalog with filters',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for products'
              },
              category: {
                type: 'string',
                enum: ['all', 'sourdough', 'stuffed', 'plain', 'starter', 'tools'],
                description: 'Product category filter'
              },
              priceRange: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' }
                }
              }
            }
          },
          execute: async (input) => {
            try {
              const response = await fetch('/api/products');
              const data = await response.json();
              
              let products = data.products || [];
              
              if (input.query) {
                const query = input.query.toLowerCase();
                products = products.filter(p => 
                  p.name?.toLowerCase().includes(query) || 
                  p.description?.toLowerCase().includes(query)
                );
              }
              
              if (input.category && input.category !== 'all') {
                products = products.filter(p => p.category === input.category);
              }
              
              if (input.priceRange) {
                if (input.priceRange.min) {
                  products = products.filter(p => p.price >= input.priceRange.min);
                }
                if (input.priceRange.max) {
                  products = products.filter(p => p.price <= input.priceRange.max);
                }
              }
              
              return {
                success: true,
                products: products,
                count: products.length
              };
            } catch (error) {
              return {
                success: false,
                error: error.message
              };
            }
          }
        },
        {
          name: 'get_product_details',
          description: 'Get detailed information about a specific product',
          inputSchema: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'Unique product identifier'
              }
            },
            required: ['productId']
          },
          execute: async (input) => {
            try {
              const response = await fetch('/api/products');
              const data = await response.json();
              const product = data.products?.find(p => p.id === input.productId);
              
              if (product) {
                return {
                  success: true,
                  product: product
                };
              } else {
                return {
                  success: false,
                  error: 'Product not found'
                };
              }
            } catch (error) {
              return {
                success: false,
                error: error.message
              };
            }
          }
        },
        {
          name: 'get_reviews',
          description: 'Get customer reviews for products',
          inputSchema: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'Filter reviews by product (optional)'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of reviews to return'
              }
            }
          },
          execute: async (input) => {
            try {
              const response = await fetch('/api/reviews');
              const data = await response.json();
              
              let reviews = data.reviews || [];
              
              if (input.productId) {
                reviews = reviews.filter(r => r.productId === input.productId);
              }
              
              if (input.limit) {
                reviews = reviews.slice(0, input.limit);
              }
              
              return {
                success: true,
                reviews: reviews,
                count: reviews.length
              };
            } catch (error) {
              return {
                success: false,
                error: error.message
              };
            }
          }
        },
        {
          name: 'get_content',
          description: 'Get public content about sourdough baking and tips',
          inputSchema: {
            type: 'object',
            properties: {
              contentType: {
                type: 'string',
                enum: ['tips', 'recipes', 'guides'],
                description: 'Type of content to retrieve'
              }
            }
          },
          execute: async (input) => {
            try {
              const response = await fetch('/api/content');
              const data = await response.json();
              
              let content = data.content || [];
              
              if (input.contentType) {
                content = content.filter(c => c.type === input.contentType);
              }
              
              return {
                success: true,
                content: content,
                count: content.length
              };
            } catch (error) {
              return {
                success: false,
                error: error.message
              };
            }
          }
        },
        {
          name: 'create_order',
          description: 'Create a new order for sourdough products (requires authentication)',
          inputSchema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    quantity: { type: 'number' }
                  }
                }
              },
              customerInfo: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' }
                }
              }
            },
            required: ['items', 'customerInfo']
          },
          execute: async (input) => {
            try {
              const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(input)
              });
              
              const data = await response.json();
              
              if (response.ok) {
                return {
                  success: true,
                  order: data.order
                };
              } else {
                return {
                  success: false,
                  error: data.error || 'Order creation failed'
                };
              }
            } catch (error) {
              return {
                success: false,
                error: error.message
              };
            }
          }
        }
      ];

      // Provide the context to AI agents
      navigator.modelContext.provideContext({
        name: 'Dodo Sourdough App',
        description: 'Premium sourdough bread marketplace with tools for product browsing, ordering, and content access',
        version: '1.0.0',
        tools: tools,
        metadata: {
          homepage: 'https://your-domain.com',
          apiCatalog: '/.well-known/api-catalog',
          authDocs: '/auth.md',
          skills: '/.well-known/agent-skills/index.json'
        }
      }).then(() => {
        console.log('WebMCP context provided successfully');
      }).catch((error) => {
        console.warn('Failed to provide WebMCP context:', error);
      });
    } else {
      console.log('WebMCP API not available in this browser');
    }
  }, []);

  return null; // This component doesn't render anything
}
