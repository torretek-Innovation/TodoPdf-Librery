
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// System default library configuration
const SYSTEM_LIBRARY_URL = 'https://drive.google.com/file/d/1811m-SfCwbzjvHeE66W82K8_zvxelQgF/view?usp=drive_link';
const SYSTEM_LIBRARY_ID = 'https://drive.google.com/uc?export=download&id=1811m-SfCwbzjvHeE66W82K8_zvxelQgF';

async function getSystemLibrary() {
    try {
        // Fetch the JSON to get the real name
        const response = await fetch(SYSTEM_LIBRARY_ID);
        const jsonData = await response.json();

        return {
            id: -1,
            name: jsonData.title || 'Biblioteca del Sistema',
            url: SYSTEM_LIBRARY_URL,
            type: 'SYSTEM',
            createdAt: new Date(),
            isSystem: true
        };
    } catch (error) {
        // Fallback if fetch fails
        return {
            id: -1,
            name: 'Biblioteca del Sistema',
            url: SYSTEM_LIBRARY_URL,
            type: 'SYSTEM',
            createdAt: new Date(),
            isSystem: true
        };
    }
}

export async function GET(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get system library with real name
        const systemLibrary = await getSystemLibrary();

        // Get user's libraries
        const userLibs = await (prisma as any).externalLibrary.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        // Combine system library with user libraries
        const allLibraries = [systemLibrary, ...userLibs];

        return NextResponse.json({ libraries: allLibraries });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch libraries' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, url, content, type } = body;

        const lib = await (prisma as any).externalLibrary.create({
            data: {
                userId,
                name,
                url,
                content: typeof content === 'string' ? content : JSON.stringify(content),
                type
            }
        });

        return NextResponse.json({ library: lib });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create library' }, { status: 500 });
    }
}
