
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Get all folders for user
export async function GET(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get unique folder names with counts
        const pdfs = await prisma.pdf.findMany({
            where: {
                userId,
                folderName: { not: null }
            } as any,
            select: {
                folderName: true
            } as any
        });

        const folders = pdfs.reduce((acc: any, pdf: any) => {
            const name = pdf.folderName;
            if (name) {
                acc[name] = (acc[name] || 0) + 1;
            }
            return acc;
        }, {});

        return NextResponse.json({ folders });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }
}

// Create new folder
export async function POST(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { folderName } = await req.json();

        if (!folderName) {
            return NextResponse.json({ error: 'Folder name required' }, { status: 400 });
        }

        // Check if folder already exists
        const existing = await prisma.pdf.findFirst({
            where: {
                userId,
                folderName: folderName
            } as any
        });

        if (existing) {
            return NextResponse.json({ error: 'Folder already exists' }, { status: 400 });
        }

        // Create a placeholder PDF entry to represent the empty folder
        // This will be removed when the first real PDF is added to the folder
        await prisma.pdf.create({
            data: {
                userId,
                title: '.folder_placeholder',
                filePath: '/placeholder',
                size: 0,
                totalPages: 0,
                folderName: folderName
            } as any
        });

        return NextResponse.json({ success: true, folderName });
    } catch (error) {
        console.error('Create folder error:', error);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}
