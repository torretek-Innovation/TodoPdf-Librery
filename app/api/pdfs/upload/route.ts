// app/api/pdfs/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import path from 'path';

const prisma = new PrismaClient();

// Función para obtener el número de páginas de un PDF
async function getPdfPageCount(buffer: Buffer): Promise<number> {
    try {
        const pdfParse = require('pdf-parse');

        const data = await pdfParse(buffer);
        return data.numpages;
    } catch (error) {
        console.error('Error obteniendo páginas del PDF:', error);
        return 0;
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const folderName = formData.get('folderName') as string | null;

        const clientTotalPages = parseInt(formData.get('totalPages') as string) || 0;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convertir el archivo a buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Obtener el número de páginas
        let totalPages = clientTotalPages;

        if (totalPages === 0) {
            console.log('intentando calcular paginas en el servidor');
            totalPages = await getPdfPageCount(buffer);
        }

        console.log('Total páginas final a guardar:', totalPages);



        // Obtener directorio persistente
        const { ensureStorageDirectory, getFileUrl } = await import('@/lib/storage-utils');
        const uploadDir = await ensureStorageDirectory('pdfs');

        const safeFileName = path.basename(file.name);
        const fileName = `${Date.now()}-${safeFileName}`;
        const filePath = path.join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        // Generar URL pública (para guardar en la BD)
        // Guardamos el path relativo o absoluto de la URL que el frontend usará
        const dbFilePath = getFileUrl(fileName, 'pdfs');

        const userId = getUserFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return NextResponse.json({
                error: 'User not found.'
            }, { status: 404 });
        }

        // Guardar en la base de datos
        let savedPdf: any;
        try {
            savedPdf = await prisma.pdf.create({
                data: {
                    userId: user.id,
                    title: title || file.name.replace('.pdf', ''),
                    filePath: dbFilePath,
                    totalPages: totalPages,
                    size: file.size,
                    folderName: folderName,
                } as any,
                include: {
                    categories: { include: { category: true } },
                    favorites: true,
                    readingProgress: true
                }
            });
        } catch (error: any) {
            if (error.message && error.message.includes('Unknown argument')) {
                console.warn('⚠️ Schema mismatch detected. Retrying without folderName. SERVER RESTART REQUIRED for folder support.');
                savedPdf = await prisma.pdf.create({
                    data: {
                        userId: user.id,
                        title: title || file.name.replace('.pdf', ''),
                        filePath: dbFilePath,
                        totalPages: totalPages,
                        size: file.size,
                        // folderName omitted fallback
                    } as any,
                    include: {
                        categories: { include: { category: true } },
                        favorites: true,
                        readingProgress: true
                    }
                });
            } else {
                throw error;
            }
        }

        // Formatear respuesta
        const pdfData = {
            id: savedPdf.id.toString(),
            title: savedPdf.title,
            fileName: fileName,
            filePath: savedPdf.filePath,
            uploadDate: savedPdf.createdAt.toISOString(),
            size: file.size,
            totalPages: savedPdf.totalPages || 0,
            coverImage: savedPdf.coverImagePath,
            category: savedPdf.categories[0]?.category.name || 'Sin categoría',
            folderName: savedPdf.folderName,
            isFavorite: savedPdf.favorites.length > 0,
            readingProgress: savedPdf.readingProgress[0]?.progressPercentage || 0
        };

        return NextResponse.json({ success: true, pdf: pdfData });

    } catch (error) {
        console.error('Error uploading PDF:', error);
        return NextResponse.json({
            error: 'Upload failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
