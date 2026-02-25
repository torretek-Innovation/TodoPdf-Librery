import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getStorageDirectory } from '@/lib/storage-utils';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {

        const { path: pathSegments } = await params;

        if (!pathSegments || pathSegments.length === 0) {
            return new NextResponse('File path missing', { status: 400 });
        }

        const type = pathSegments[0];
        const fileName = pathSegments[1];

        if (!type || !fileName) {
            return new NextResponse('Invalid path', { status: 400 });
        }


        const storageDir = getStorageDirectory(type);
        const filePath = path.join(storageDir, fileName);

        try {
            const fileBuffer = await fs.readFile(filePath);


            let contentType = 'application/octet-stream';
            if (fileName.endsWith('.pdf')) contentType = 'application/pdf';
            if (fileName.endsWith('.png')) contentType = 'image/png';
            if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) contentType = 'image/jpeg';

            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable'
                }
            });
        } catch (error) {
            return new NextResponse('File not found', { status: 404 });
        }

    } catch (error) {
        console.error('Error serving asset:', error);
        return new NextResponse('Server Error', { status: 500 });
    }
}
