
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { title, url, category, coverImage } = body;

        let finalUrl = url;

        // Convert google drive view links to download links
        if (url.includes('drive.google.com') && url.includes('/view')) {
            const fileIdMatch = url.match(/\/d\/([-\w]+)\//);
            if (fileIdMatch) {
                finalUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
            }
        }

        // Fetch the file
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error('Failed to download PDF');

        const buffer = Buffer.from(await response.arrayBuffer());

        // Save locally
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
        await mkdir(uploadDir, { recursive: true });

        const fileName = `${Date.now()}-${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        // Save to DB
        const pdf = await prisma.pdf.create({
            data: {
                userId,
                title: title,
                filePath: `/uploads/pdfs/${fileName}`,
                size: buffer.length,
                totalPages: 0,
                folderName: 'Descargas Externas',
                coverImagePath: coverImage
            } as any
        });

        return NextResponse.json({ success: true, pdf });

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
