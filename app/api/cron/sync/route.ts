import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { driveWatchUrl: true, lastSyncedAt: true }
        });

        if (!user || !user.driveWatchUrl) {
            return NextResponse.json({ error: 'No watch URL configured' }, { status: 400 });
        }

        // Check if 24 hours passed, unless force=true is passed
        const { force } = await req.json().catch(() => ({ force: false }));

        if (!force && user.lastSyncedAt) {
            const now = new Date();
            const last = new Date(user.lastSyncedAt);
            const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);

            if (diffHours < 24) {
                return NextResponse.json({ skipped: true, message: 'Synced recently' });
            }
        }

        // Extract Folder ID
        const match = user.driveWatchUrl.match(/folders\/([-a-zA-Z0-9_]+)/);
        const folderId = match ? match[1] : null;

        if (!folderId) {
            return NextResponse.json({ error: 'Invalid Drive URL' }, { status: 400 });
        }

        // Run Logic
        const scriptPath = join(process.cwd(), 'scripts', 'scan_drive.py');
        const command = `python "${scriptPath}" "${folderId}"`; // Assume python is in PATH

        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);

        if (result.pdfs) {
            // Save to DB
            for (const pdf of result.pdfs) {
                // Upsert logic: simple check if exists for user to avoid duplicates
                // In a real app, we'd want a dedicated DriveID field on PDF model.
                // For now, check by name or URL. The script returns a consistent name.

                // Note: To truly sync properly we should add `driveId` to Pdf model, 
                // but user didn't ask for schema migration on Pdf, just user sync settings.
                // We'll rely on Title + User uniqueness or just create new ones (risk of dups).
                // Let's check schema: Pdf has userId, title.

                // Let's assume we want to avoid duplicates by URL or Name
                const exists = await prisma.pdf.findFirst({
                    where: {
                        userId,
                        title: pdf.name
                    }
                });

                if (!exists) {
                    await prisma.pdf.create({
                        data: {
                            userId,
                            title: pdf.name,
                            filePath: pdf.url,
                            coverImagePath: pdf.image_path,
                            // Default category handling could be complex, skipping for brevity
                        }
                    });
                }
            }
        }

        // Update last synced
        await prisma.user.update({
            where: { id: userId },
            data: { lastSyncedAt: new Date() }
        });

        return NextResponse.json({ success: true, count: result.pdfs?.length || 0 });

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
