
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const libraryId = parseInt(id);

        // Prevent deletion of system library
        if (libraryId === -1) {
            return NextResponse.json({ error: 'Cannot delete system library' }, { status: 403 });
        }

        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await (prisma as any).externalLibrary.deleteMany({
            where: {
                id: libraryId,
                userId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete library' }, { status: 500 });
    }
}
