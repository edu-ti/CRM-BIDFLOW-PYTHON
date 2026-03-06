#!/bin/bash

# Script de Deployment Automático - BidFlow CRM
# Este script deve ser executado na raiz do projeto na VPS.

echo "--- Iniciando Deploy de Produção ---"

# 1. Puxar as alterações mais recentes
echo "1. Atualizando código do repositório..."
git pull origin main

# 2. Verificar se o ficheiro .env existe
if [ ! -f .env ]; then
    echo "ERRO: Ficheiro .env não encontrado! Por favor crie um baseado no .env.example."
    exit 1
fi

# 3. Construir e levantar os contentores
echo "2. Reconstruindo contentores (se necessário) e iniciando serviços..."
docker-compose up -d --build

# 4. Executar Migrações do Django
echo "3. Executando migrações da base de dados..."
docker-compose exec -T backend python manage.py migrate --noinput

# 5. Recolher Ficheiros Estáticos
echo "4. Recolhendo ficheiros estáticos (Collectstatic)..."
docker-compose exec -T backend python manage.py collectstatic --noinput

# 6. Limpar imagens órfãs para poupar espaço
echo "5. Limpando imagens e volumes não utilizados..."
docker image prune -f

echo "--- Deploy finalizado com sucesso! ---"
echo "Acesse o seu domínio para verificar o estado da aplicação."
