
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Helper to decode folder name from URL
function getFolderName(params: { folderName: string }) {
    return decodeURIComponent(params.folderName);
}

// Rename folder
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ folderName: string }> }
) {
    try {
        const userId = getUserFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const oldName = decodeURIComponent(params.folderName);
        const { newName } = await request.json();

        if (!newName || !newName.trim()) {
            return NextResponse.json({ error: 'New folder name is required' }, { status: 400 });
        }

        const cleanNewName = newName.trim();

        // 1. Check if the destination folder name already exists for this user
        // We don't want to merge folders accidentally or cause duplicates if logic doesn't support it
        const existingDestination = await prisma.pdf.findFirst({
            where: {
                userId,
                folderName: cleanNewName
            } as any
        });

        if (existingDestination) {
            return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 409 });
        }

        // 2. Update all PDFs (including the placeholder) to the new folder name
        const result = await prisma.pdf.updateMany({
            where: {
                userId,
                folderName: oldName
            } as any,
            data: {
                folderName: cleanNewName
            } as any
        });

        if (result.count === 0) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Folder renamed successfully',
            updatedCount: result.count
        });

    } catch (error) {
        console.error('Rename folder error:', error);
        return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

// Delete folder and its contents
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ folderName: string }> }
) {
    try {
        const userId = getUserFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const folderName = decodeURIComponent(params.folderName);

        // Delete all PDFs in this folder (including placeholder)
        // Note: This logic ONLY deletes the database records.
        // If you need to delete physical files, you must fetch them first and unlink them.
        // For now, consistent with the request, we handle the folder logic.
        const result = await prisma.pdf.deleteMany({
            where: {
                userId,
                folderName: folderName
            } as any
        });

        if (result.count === 0) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Folder and contents deleted successfully',
            deletedCount: result.count
        });

    } catch (error) {
        console.error('Delete folder error:', error);
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
