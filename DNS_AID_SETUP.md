# DNS-AID Setup Instructions

## Overview
DNS for AI Discovery (DNS-AID) enables DNS-based agent discovery using SVCB/HTTPS records. This requires DNS configuration at your domain provider.

## What is DNS-AID?
DNS-AID allows AI agents to discover your services through DNS queries, providing:
- Service endpoints
- Supported protocols (ALPN)
- Authentication requirements
- Service metadata

## Required DNS Records

### 1. Index Record
Create an SVCB/HTTPS record for `_index._agents.your-domain.com`:

```
_index._agents.your-domain.com. 3600 IN HTTPS 1 .
  alpn="h2,h3"
  endpoint="https://your-domain.com"
  key="agent-discovery" value="v1"
```

### 2. A2A Record (Agent-to-Agent)
Create an SVCB/HTTPS record for `_a2a._agents.your-domain.com`:

```
_a2a._agents.your-domain.com. 3600 IN HTTPS 1 .
  alpn="h2,h3"
  endpoint="https://your-domain.com/api/mcp"
  key="transport" value="http"
  key="auth" value="oauth2"
```

### 3. Alternative Configuration
If your DNS provider doesn't support SVCB/HTTPS records, use TXT records:

```
_index._agents.your-domain.com. 3600 IN TXT "v=aid1; endpoint=https://your-domain.com; alpn=h2,h3"
_a2a._agents.your-domain.com. 3600 IN TXT "v=aid1; endpoint=https://your-domain.com/api/mcp; transport=http; auth=oauth2"
```

## DNSSEC Configuration

### Enable DNSSEC
1. Enable DNSSEC at your domain registrar
2. Generate DNSSEC keys (KSK/ZSK)
3. Publish DS records at your registrar
4. Sign your zone with DNSSEC

### Verification
Verify DNSSEC is working:
```bash
dig +dnssec your-domain.com SOA
```

## DNS Provider Support

### Cloudflare
Cloudflare supports SVCB/HTTPS records:
1. Go to DNS > Records
2. Add record type "SVCB" or "HTTPS"
3. Configure as shown above

### AWS Route 53
Route 53 doesn't natively support SVCB/HTTPS yet. Use:
- Alias records for basic discovery
- Consider using CloudFront with custom domains

### Google Cloud DNS
Google Cloud DNS supports SVCB/HTTPS:
1. Go to Cloud DNS
2. Add resource record set
3. Select type "HTTPS" or "SVCB"

### Other Providers
Check your provider's documentation for SVCB/HTTPS support.

## Implementation Steps

### Step 1: Check Provider Support
Verify your DNS provider supports:
- SVCB/HTTPS records (preferred)
- Or TXT records (fallback)

### Step 2: Add DNS Records
Add the appropriate records based on your provider's capabilities.

### Step 3: Enable DNSSEC
Enable DNSSEC for authenticated responses.

### Step 4: Test Configuration
Test the DNS records:
```bash
dig _index._agents.your-domain.com HTTPS
dig _a2a._agents.your-domain.com HTTPS
```

### Step 5: Update Domain References
Replace `your-domain.com` with your actual domain in:
- DNS records
- OAuth metadata files
- API catalog
- MCP server card
- Agent skills index

## Testing DNS-AID

### Test DNS Resolution
```bash
# Test HTTPS record
dig _index._agents.your-domain.com HTTPS +short

# Test with specific DNS server
dig @8.8.8.8 _index._agents.your-domain.com HTTPS
```

### Test DNSSEC Validation
```bash
# Verify DNSSEC is working
dig +dnssec your-domain.com SOA

# Check AD flag (Authenticated Data)
dig +dnssec _index._agents.your-domain.com HTTPS
```

## Troubleshooting

### Records Not Propagating
- Wait up to 48 hours for DNS propagation
- Check TTL settings
- Verify record syntax

### DNSSEC Issues
- Ensure DS records are published at registrar
- Verify KSK/ZSK keys are properly configured
- Check signature validity

### Provider Limitations
- If provider doesn't support SVCB/HTTPS, use TXT records
- Consider migrating to a provider that supports modern DNS features

## Current Status

Your application is DNS-AID ready with the following:
- ✅ Well-known endpoints configured
- ✅ API catalog published
- ✅ OAuth metadata available
- ✅ MCP server card published
- ⏳ DNS records (requires DNS provider configuration)
- ⏳ DNSSEC (requires domain registrar configuration)

## Next Steps

1. **Configure DNS Records**: Add the DNS records shown above
2. **Enable DNSSEC**: Enable DNSSEC at your domain registrar
3. **Update Domain**: Replace `your-domain.com` with your actual domain
4. **Test**: Run the DNS-AID tests shown above
5. **Validate**: Use isitagentready.com to validate DNS-AID configuration

## Additional Resources

- RFC 9460: https://www.rfc-editor.org/rfc/rfc9460
- DNS-AID Draft: https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/
- DNS-AID Skill: https://isitagentready.com/.well-known/agent-skills/dns-aid/SKILL.md

## Note

DNS-AID configuration requires access to your domain's DNS management console. This cannot be done through the application code alone - you must configure these records at your DNS provider.
