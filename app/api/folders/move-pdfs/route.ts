
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Move PDFs to folder
export async function POST(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { pdfIds, folderName } = await req.json();

        if (!pdfIds || !Array.isArray(pdfIds)) {
            return NextResponse.json({ error: 'PDF IDs required' }, { status: 400 });
        }

        // Update PDFs to new folder
        await prisma.pdf.updateMany({
            where: {
                id: { in: pdfIds.map((id: string) => parseInt(id)) },
                userId
            },
            data: {
                folderName: folderName || null
            } as any
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Move PDFs error:', error);
        return NextResponse.json({ error: 'Failed to move PDFs' }, { status: 500 });
    }
}
