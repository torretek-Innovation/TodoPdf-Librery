import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Restore a PDF from trash
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const pdfId = parseInt(params.id);

        // Restore the PDF by setting deletedAt to null
        try {
            await prisma.pdf.update({
                where: { id: pdfId },
                // @ts-ignore
                data: { deletedAt: null }
            });
        } catch (error: any) {
            if (error.message && error.message.includes('Unknown argument')) {
                // Fallback to raw query
                await prisma.$executeRawUnsafe(`UPDATE pdfs SET deleted_at = NULL WHERE id = ?`, pdfId);
            } else {
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'PDF restaurado correctamente'
        });

    } catch (error) {
        console.error('Error restoring PDF:', error);
        return NextResponse.json({ error: 'Failed to restore PDF' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
