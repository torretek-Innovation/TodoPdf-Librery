
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Get all folders for user (Optional, used if you have a separate folder view)
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
        console.error('Fetch folders error:', error);
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

// Create new folder
export async function POST(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { folderName } = await req.json();

        if (!folderName || !folderName.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const cleanName = folderName.trim();

        // Check if folder already exists
        const existing = await prisma.pdf.findFirst({
            where: {
                userId,
                folderName: cleanName
            } as any
        });

        if (existing) {
            return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });
        }

        // Create a placeholder PDF entry to represent the empty folder
        // The dashboard looks for specific title '.folder_placeholder' to identify empty folders
        await prisma.pdf.create({
            data: {
                userId,
                title: '.folder_placeholder',
                filePath: '/placeholder', // Dummy path required by schema
                size: 0,
                totalPages: 0,
                folderName: cleanName
            } as any
        });

        return NextResponse.json({ success: true, folderName: cleanName });

    } catch (error) {
        console.error('Create folder error:', error);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}