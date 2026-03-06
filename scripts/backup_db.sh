#!/bin/bash

# Script de Backup Automatizado do PostgreSQL - BidFlow CRM
# Este script deve ser executado no host (VPS).

# Configurações
BACKUP_DIR="/backups/bidflow"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="bidflow_db_$DATE.sql"
CONTAINER_NAME="bidflow_db"

# Cria o diretório de backup se não existir
mkdir -p $BACKUP_DIR

echo "--- Iniciando Backup da Base de Dados ($DATE) ---"

# Executa o dump dentro do contentor e salva no host
docker exec -t $CONTAINER_NAME pg_dump -U bidflow_user bidflow_db > $BACKUP_DIR/$BACKUP_NAME

# Comprime o backup
tar -czf $BACKUP_DIR/$BACKUP_NAME.tar.gz -C $BACKUP_DIR $BACKUP_NAME

# Remove o ficheiro SQL original (mantendo apenas o comprimido)
rm $BACKUP_DIR/$BACKUP_NAME

# Mantém apenas os últimos 7 dias de backups
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -delete

echo "--- Backup concluído e guardado em $BACKUP_DIR ---"
echo "--- Retenção de 7 dias aplicada (backups antigos removidos) ---"
