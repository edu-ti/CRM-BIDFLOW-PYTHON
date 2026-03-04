const { PrismaClient } = require('@prisma/client');

// Use environment variable or default local connection string
// Attempting to connect to localhost:5432 exposed by Docker
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "mysql://u540193243_frpe:g3st@03Du4rd0@127.0.0.1:3307/u540193243_frpe_crm_db"
        }
    }
});

async function main() {
    console.log('Iniciando teste de conexão com o banco de dados...');
    try {
        await prisma.$connect();
        console.log('✅ Sucesso: Conectado ao banco de dados!');

        // Tenta uma consulta simples para validar schema
        const count = await prisma.user.count();
        console.log(`📊 Número de usuários no banco: ${count}`);

    } catch (e) {
        console.error('❌ Erro: Falha na conexão:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
