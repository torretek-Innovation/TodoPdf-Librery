import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'png';
        const filename = `user_${userId}_avatar_${Date.now()}.${ext}`;
        const filePath = join(uploadDir, filename);

        await writeFile(filePath, buffer);

        const avatarPath = `/uploads/avatars/${filename}`;

        await prisma.user.update({
            where: { id: userId },
            data: { avatarPath }
        });

        return NextResponse.json({ success: true, avatarPath });

    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
