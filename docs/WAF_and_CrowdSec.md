# WAF (ModSecurity + OWASP CRS) ve CrowdSec Kurulum Notları

Bu kurulum self-host profile uygundur ve bulut WAF kullanılmaz.

## Nginx + ModSecurity
- Nginx için ModSecurity dynamic module yükleyin (dağıtıma göre paket veya kaynak derleme).
- OWASP CRS v4 kurun ve `modsecurity.conf` içinde active edin; başlangıçta DetectionOnly, sonra Blocking moda geçin.

Örnek Nginx snippet:
```nginx
load_module modules/ngx_http_modsecurity_module.so;
modsecurity on;
modsecurity_rules_file /etc/nginx/modsec/main.conf;
```

`/etc/nginx/modsec/main.conf`:
```nginx
Include "/etc/nginx/modsec/modsecurity.conf"
Include "/etc/nginx/modsec/crs-setup.conf"
Include "/usr/local/owasp-modsecurity-crs/rules/*.conf"
```

İstisnalar:
- Büyük dosya indirme/etiket uçları için body size ayarlarını artırın.
- Websocket yoksa ilgili kuralları devre dışı bırakın.

## CrowdSec
- CrowdSec agent kurun; Nginx bouncer ile entegre edin.
- Senaryolar: `crowdsecurity/http-probing`, `crowdsecurity/http-bad-user-agent` vb.
- Kararlar: ban; TTL 24 saat (ihtiyaca göre değiştirin).

Kaynaklar:
- `crowdsec` servisi, `cscli` ile senaryo ve koleksiyonları aktif edin.
- `nginx-bouncer` yapılandırıp `limit_req` ile birlikte kullanın.

## Ölçüm ve İzleme
- `waf_dropped_total` ve `token_utilization` metriklerini Prometheus'a ekleyin (uygulama/kenar tarafı etiketleriyle).

## Notlar
- Önce DetectionOnly modunda learning yapın, sonra kademeli blocking.
- Yanlış pozitif durumları exclusion listeleriyle giderin.