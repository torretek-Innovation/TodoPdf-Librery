const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        console.log('🔍 Verificando base de datos...\n');

        // Verificar usuarios
        const users = await prisma.user.findMany();
        console.log(`✅ Usuarios encontrados: ${users.length}`);
        users.forEach(user => {
            console.log(`   - ${user.username} (ID: ${user.id})`);
        });

        // Verificar PDFs
        const pdfs = await prisma.pdf.findMany({
            include: {
                categories: {
                    include: {
                        category: true
                    }
                }
            }
        });
        console.log(`\n✅ PDFs encontrados: ${pdfs.length}`);
        pdfs.forEach(pdf => {
            console.log(`   - ${pdf.title} (ID: ${pdf.id})`);
            console.log(`     Ruta: ${pdf.filePath}`);
            console.log(`     Páginas: ${pdf.totalPages || 'N/A'}`);
            console.log(`     Categorías: ${pdf.categories.map(c => c.category.name).join(', ') || 'Sin categoría'}`);
        });

        // Verificar categorías
        const categories = await prisma.category.findMany();
        console.log(`\n✅ Categorías encontradas: ${categories.length}`);
        categories.forEach(cat => {
            console.log(`   - ${cat.name} (ID: ${cat.id})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
