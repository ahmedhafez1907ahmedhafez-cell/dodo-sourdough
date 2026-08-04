import { WHATSAPP_NUMBER } from '../../lib/contact';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  
  const markdown = `# Dodo Sourdough App

Welcome to Dodo Sourdough - your premium sourdough bread marketplace.

## About Us
We specialize in artisanal sourdough bread made with traditional methods and premium ingredients.

## Our Products
- Plain Sourdough Bread
- Seeded Varieties
- Stuffed Options
- Specialty Breads

## Features
- Browse our catalog of premium sourdough products
- Place orders for delivery
- Read customer reviews
- Manage your profile

## Navigation
- [Home](/)
- [Products](/products)
- [Reviews](/reviews)
- [Profile](/profile)

## API Access
This site supports AI agent discovery through:
- API Catalog: /.well-known/api-catalog
- Agent Skills: /.well-known/agent-skills/index.json
- MCP Server Card: /.well-known/mcp/server-card.json
- Auth Documentation: /auth.md

## Contact
For inquiries, please use our contact form or reach out through our support channels.
WhatsApp: https://wa.me/${WHATSAPP_NUMBER}`;

  res.status(200).send(markdown);
}
