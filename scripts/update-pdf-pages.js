const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Función para obtener el número de páginas de un PDF
async function getPdfPageCount(filePath) {
    try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.numpages;
    } catch (error) {
        console.error('Error obteniendo páginas:', error);
        return 0;
    }
}

async function updatePdfPages() {
    try {
        console.log('🔄 Actualizando número de páginas de PDFs...\n');

        const pdfs = await prisma.pdf.findMany();

        for (const pdf of pdfs) {
            const fullPath = path.join(process.cwd(), 'public', pdf.filePath);

            if (fs.existsSync(fullPath)) {
                const pages = await getPdfPageCount(fullPath);

                await prisma.pdf.update({
                    where: { id: pdf.id },
                    data: { totalPages: pages }
                });

                console.log(`✅ ${pdf.title}: ${pages} páginas`);
            } else {
                console.log(`⚠️  ${pdf.title}: Archivo no encontrado en ${fullPath}`);
            }
        }

        console.log('\n✅ Actualización completada');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePdfPages();
