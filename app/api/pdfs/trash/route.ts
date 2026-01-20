import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const userId = getUserFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get only deleted PDFs
        const pdfs = await prisma.pdf.findMany({
            where: {
                userId,
                // @ts-ignore
                deletedAt: { not: null }
            },
            // @ts-ignore
            orderBy: { deletedAt: 'desc' }
        });

        // Get favorites for this user
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            select: { pdfId: true }
        });
        const favoriteIds = new Set(favorites.map(f => f.pdfId));

        // Get reading progress for this user
        const progress = await prisma.readingProgress.findMany({
            where: { userId },
            select: { pdfId: true, progressPercentage: true }
        });
        const progressMap = new Map(progress.map(p => [p.pdfId, p.progressPercentage]));

        // Format PDFs for frontend
        const formattedPdfs = pdfs.map(pdf => ({
            id: pdf.id.toString(),
            title: pdf.title,
            fileName: pdf.filePath.split('/').pop() || '',
            filePath: pdf.filePath,
            uploadDate: pdf.createdAt.toISOString(),
            deletedDate: (pdf as any).deletedAt?.toISOString(),
            size: (pdf as any).size || 0,
            totalPages: pdf.totalPages || 0,
            coverImage: pdf.coverImagePath,
            category: 'Sin categoría',
            folderName: (pdf as any).folderName,
            isFavorite: favoriteIds.has(pdf.id),
            readingProgress: progressMap.get(pdf.id) || 0
        }));

        return NextResponse.json({ pdfs: formattedPdfs });

    } catch (error: any) {
        // If we have a schema mismatch (e.g. deletedAt column not in client), just return empty list
        if (error.message && error.message.includes('Unknown argument')) {
            console.warn('⚠️ Schema mismatch detected in trash list. Returning empty list.');
            return NextResponse.json({ pdfs: [] });
        }

        console.error('Error listing trash PDFs:', error);
        return NextResponse.json({ error: 'Failed to list trash PDFs' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
