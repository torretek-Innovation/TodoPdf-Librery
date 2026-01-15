const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Inicializando base de datos...');

    // Verificar si ya existe un usuario
    const existingUser = await prisma.user.findFirst();

    if (existingUser) {
        console.log('✅ Ya existe un usuario en la base de datos');
        console.log(`   Usuario: ${existingUser.username}`);
        return;
    }

    // Crear un usuario de prueba
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
        data: {
            username: 'admin',
            passwordHash: hashedPassword,
        },
    });

    console.log('✅ Usuario creado exitosamente');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: password123`);
    console.log('');
    console.log('⚠️  Recuerda cambiar la contraseña en producción');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
