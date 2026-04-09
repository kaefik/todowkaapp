# Self-Signed SSL Certificates for Local Development

## Problem

Let's Encrypt cannot issue certificates for `localhost` or local domains. For local development and testing, you need to use self-signed certificates.

## Quick Solution (Already Applied)

Self-signed certificates have been generated for `localhost`:

```bash
cd /path/to/todowkaapp/docker/certbot/conf/live/localhost
# Certificates already exist:
# - fullchain.pem
# - privkey.pem
```

## Manual Certificate Generation

If you need to regenerate certificates:

```bash
cd /path/to/todowkaapp/docker

# Create directory structure
mkdir -p certbot/conf/live/localhost

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certbot/conf/live/localhost/privkey.pem \
  -out certbot/conf/live/localhost/fullchain.pem \
  -subj "/CN=localhost/O=localhost/C=US"
```

## Browser Warnings

When accessing `https://localhost`, you'll see a browser warning:

```
"Your connection is not private"
"NET::ERR_CERT_AUTHORITY_INVALID"
```

This is **normal** for self-signed certificates. 

### How to proceed:

1. **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
2. **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
3. **Safari**: Click "Visit this website" → "Details" → "Visit this website"

## Testing HTTPS

```bash
# Test with curl (ignoring SSL verification)
curl -k https://localhost/health
curl -k https://localhost/
curl -k https://localhost/api/

# Or with curl using the certificate
curl --cacert certbot/conf/live/localhost/fullchain.pem \
     https://localhost/health
```

## Production Deployment

For production deployment:

1. **Use a real domain name** (e.g., `your-app.com`)
2. **Ensure DNS points to your server**
3. **Let's Encrypt will work automatically** with the deploy script
4. **No browser warnings** with real SSL certificates

### Example for real domain:

```bash
# Set your domain in docker/.env
DOMAIN=your-app.com
EMAIL=admin@your-app.com

# Deploy - Let's Encrypt will get real certificates
cd /path/to/todowkaapp/docker
./deploy-ssl.sh
```

## Certificate Details

The generated self-signed certificate:

- **Type**: RSA 2048-bit
- **Validity**: 365 days
- **Common Name (CN)**: localhost
- **Organization (O)**: localhost
- **Country**: US

## Security Considerations

✅ **For local development**: Self-signed certificates are fine
❌ **For production**: Always use real SSL certificates (Let's Encrypt or commercial)

## Updating Self-Signed Certificates

To extend validity or regenerate:

```bash
# Remove old certificates
rm /path/to/todowkaapp/docker/certbot/conf/live/localhost/*.pem

# Generate new certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /path/to/todowkaapp/docker/certbot/conf/live/localhost/privkey.pem \
  -out /path/to/todowkaapp/docker/certbot/conf/live/localhost/fullchain.pem \
  -subj "/CN=localhost/O=localhost/C=US"

# Restart nginx
cd /path/to/todowkaapp/docker
docker-compose -f docker-compose-ssl.yml restart nginx
```

## Alternative: Using mkcert (Recommended for Development)

For better local development experience, consider using `mkcert`:

```bash
# Install mkcert (Linux)
sudo apt install mkcert

# Setup local CA
mkcert -install

# Generate certificates for localhost
cd /path/to/todowkaapp/docker/certbot/conf/live/localhost
mkcert -key-file privkey.pem -cert-file fullchain.pem localhost

# Restart nginx
cd /path/to/todowkaapp/docker
docker-compose -f docker-compose-ssl.yml restart nginx
```

`mkcert` certificates are trusted by browsers and won't show warnings!

## Verification

```bash
# Check certificate details
openssl x509 -in certbot/conf/live/localhost/fullchain.pem -text -noout

# Check certificate validity
openssl x509 -checkend 86400 -noout -in certbot/conf/live/localhost/fullchain.pem && echo "Certificate valid for >24 hours" || echo "Certificate expiring soon"
```