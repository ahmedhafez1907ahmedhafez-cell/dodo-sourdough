import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();
  const acceptHeader = request.headers.get('accept') || '';

  // Add Link headers for agent discovery (RFC 8288)
  response.headers.set('Link', '</.well-known/api-catalog>; rel="api-catalog", </.well-known/agent-skills/index.json>; rel="agent-skills", </auth.md>; rel="service-doc", </.well-known/mcp/server-card.json>; rel="mcp-server-card"');

  // Add Vary header for content negotiation
  response.headers.set('Vary', 'Accept');

  // Handle markdown content negotiation
  if (acceptHeader.includes('text/markdown') || acceptHeader.includes('text/x-markdown')) {
    // For homepage, redirect to a markdown endpoint
    if (request.nextUrl.pathname === '/') {
      const markdownUrl = request.nextUrl.clone();
      markdownUrl.pathname = '/api/markdown';
      return NextResponse.redirect(markdownUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/'],
};
