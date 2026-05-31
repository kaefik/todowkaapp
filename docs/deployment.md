# Деплой Todowka

## TLS-терминация

Nginx-контейнер фронтенда слушает порт 80 (HTTP). TLS-терминация — ответственность reverse-proxy/ingress перед контейнером.

### Traefik (Docker Compose)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.todowka.rule=Host(`todowka.example.com`)"
  - "traefik.http.routers.todowka.tls.certresolver=letsencrypt"
  - "traefik.http.routers.todowka.entrypoints=websecure"
```

### Caddy

```
todowka.example.com {
    reverse_proxy frontend:80
}
```

Caddy автоматически получает сертификаты Let's Encrypt.

### Nginx reverse-proxy

```nginx
server {
    listen 443 ssl http2;
    server_name todowka.example.com;

    ssl_certificate /etc/ssl/certs/todowka.pem;
    ssl_certificate_key /etc/ssl/private/todowka.key;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Безопасность

- Бэкенд устанавливает заголовки безопасности для API-ответов через `SecurityHeadersMiddleware`
- Nginx добавляет `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` для статических файлов
- Cookie-based httpOnly аутентификация
- CSRF-защита через `X-Requested-With: XMLHttpRequest`
