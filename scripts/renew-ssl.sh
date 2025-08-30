#!/bin/bash
# SSL renewal script for Fulexo

# Stop nginx temporarily
docker exec compose-nginx-1 nginx -s stop 2>/dev/null || true
sleep 2

# Renew certificates
certbot renew --quiet

# Start nginx again
docker exec compose-nginx-1 nginx 2>/dev/null || true

# Reload nginx if it's running
docker exec compose-nginx-1 nginx -s reload 2>/dev/null || true
