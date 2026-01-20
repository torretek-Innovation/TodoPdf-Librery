import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                email: true,
                theme: true,
                language: true,
                notifications: true,
                avatarPath: true
            }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json(user);
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { username, email, theme, language, notifications, driveWatchUrl } = body;

        // Basic validation
        if (username && username.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username,
                email,
                theme,
                language,
                notifications,
                driveWatchUrl
            }
        });

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error('Failed to update profile:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
