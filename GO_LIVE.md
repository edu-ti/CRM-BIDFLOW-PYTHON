# Checklist de Go-Live - BidFlow CRM

Siga estes passos finais para colocar o seu sistema em produção de forma estável.

## 1. Configuração de DNS (Painel da Hostinger/Domínio)
- [ ] Criar um **Registo A** apontando para o endereço IP da sua VPS.
  - Ex: `grupocabral.net.br` -> `185.x.x.x`
- [ ] Criar um **Registo CNAME** para `www` (opcional).
- [ ] Aguardar a propagação de DNS (pode demorar de 1h a 24h).

## 2. Configuração do Repositório (GitHub Secrets)
No seu repositório GitHub, vá a **Settings > Secrets and variables > Actions** e adicione:
- [ ] `HOST`: O IP da sua VPS.
- [ ] `USERNAME`: O utilizador SSH (ex: `root` ou um user com sudo).
- [ ] `SSH_KEY`: A sua chave privada SSH (deve estar autorizada no `.ssh/authorized_keys` da VPS).

## 3. Preparação na VPS
Aceda à VPS via SSH e execute:
- [ ] Criar o ficheiro `.env` na raiz do projeto baseado no `.env.example`.
- [ ] Colocar o ficheiro `firebase-key.json` dentro da pasta `django_backend/`.
- [ ] Dar permissão de execução aos scripts:
  ```bash
  chmod +x deploy.sh scripts/backup_db.sh
  ```

## 4. Lançamento e SSL
- [ ] Correr o script de deploy inicial: `./deploy.sh`.
- [ ] Gerar o certificado SSL para o seu domínio (após propagação DNS):
  ```bash
  docker-compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d grupocabral.net.br
  ```
- [ ] Editar o `nginx/nginx.conf` na VPS para descomentar as linhas de certificado e recarregar o Nginx:
  ```bash
  docker-compose exec frontend nginx -s reload
  ```

## 5. Migração de Dados Herdados
- [ ] Assim que o sistema estiver online, execute o script de migração do Firebase:
  ```bash
  docker-compose exec backend python scripts/migrate_firestore_to_django.py
  ```

## 6. Automação de Backups
- [ ] Configurar o Crontab para backup diário (às 03h00):
  ```bash
  crontab -e
  # Adicione a linha:
  0 3 * * * /path/to/project/scripts/backup_db.sh >> /var/log/bidflow_backup.log 2>&1
  ```
