
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Delete folder and all PDFs in it
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    try {
        const { name } = await params;
        const folderName = decodeURIComponent(name);

        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Delete all PDFs in this folder
        await prisma.pdf.deleteMany({
            where: {
                userId,
                folderName: folderName
            } as any
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }
}

// Rename folder
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    try {
        const { name } = await params;
        const oldName = decodeURIComponent(name);
        const { newName } = await req.json();

        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Update all PDFs with this folder name
        await prisma.pdf.updateMany({
            where: {
                userId,
                folderName: oldName
            } as any,
            data: {
                folderName: newName
            } as any
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
    }
}
