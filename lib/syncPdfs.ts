
import { PrismaClient } from '@prisma/client';
import { readdir, stat } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function syncLocalPdfs() {
    try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
        let files: string[] = [];

        try {
            files = await readdir(uploadDir);
        } catch (e) {
            console.warn('Upload directory not found, skipping sync.');
            return;
        }

        // Get actual user (fallback)
        const user = await prisma.user.findFirst();
        if (!user) return;

        // Get existing PDF paths from DB to check for duplicates
        const existingPdfs = await prisma.pdf.findMany({ select: { filePath: true } });
        const existingPaths = new Set(existingPdfs.map(p => p.filePath));

        for (const file of files) {
            if (!file.toLowerCase().endsWith('.pdf')) continue;

            const filePath = `/uploads/pdfs/${file}`;
            const fullPath = path.join(uploadDir, file);

            if (!existingPaths.has(filePath)) {
                try {
                    const stats = await stat(fullPath);

                    // Simple logic: default title is filename
                    const title = file.replace('.pdf', '');

                    try {
                        await prisma.pdf.create({
                            data: {
                                userId: user.id,
                                title: title,
                                filePath: filePath,
                                size: stats.size,
                                totalPages: 0,
                                folderName: 'Local Sync',
                            } as any
                        });
                    } catch (schemaError: any) {
                        if (schemaError.message && schemaError.message.includes('Unknown argument')) {
                            await prisma.pdf.create({
                                data: {
                                    userId: user.id,
                                    title: title,
                                    filePath: filePath,
                                    size: stats.size,
                                    totalPages: 0,
                                    // folderName omitted
                                } as any
                            });
                        } else {
                            throw schemaError;
                        }
                    }
                    console.log(`Synced new local file: ${file}`);
                } catch (err) {
                    console.error(`Error syncing file ${file}:`, err);
                }
            }
        }
    } catch (error) {
        console.error('Error during local PDF sync:', error);
    } finally {
        await prisma.$disconnect();
    }
}

export { syncLocalPdfs };
