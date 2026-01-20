import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { unlink } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// Delete files older than 30 days from trash
const RETENTION_PERIOD_DAYS = 30;

export async function GET(request: NextRequest) {
    try {
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIOD_DAYS);

        // Find PDFs to delete
        const pdfsToDelete = await prisma.pdf.findMany({
            where: {
                // @ts-ignore - Schema updated but client pending regeneration
                deletedAt: {
                    lt: cutoffDate
                }
            }
        });

        if (pdfsToDelete.length === 0) {
            return NextResponse.json({ message: 'No files to clean up', count: 0 });
        }

        console.log(`Found ${pdfsToDelete.length} files to permanently delete (older than ${RETENTION_PERIOD_DAYS} days)`);

        let deletedCount = 0;
        let errors = 0;

        // Process deletions
        for (const pdf of pdfsToDelete) {
            try {
                // 1. Delete actual file from disk
                if (pdf.filePath && !pdf.filePath.startsWith('http')) {
                    const absolutePath = path.join(process.cwd(), 'public', pdf.filePath.startsWith('/') ? pdf.filePath.slice(1) : pdf.filePath);
                    try {
                        await unlink(absolutePath);
                    } catch (fsError: any) {
                        // Ignore if file doesn't exist
                        if (fsError.code !== 'ENOENT') {
                            console.error(`Error deleting file for PDF ${pdf.id}:`, fsError);
                        }
                    }
                }

                // 2. Delete database record
                // Use deleteMany to avoid error if record is already gone
                await prisma.pdf.delete({
                    where: { id: pdf.id }
                });

                deletedCount++;
            } catch (error) {
                console.error(`Failed to delete PDF ${pdf.id}:`, error);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cleanup completed`,
            deletedCount,
            errors,
            retentionDays: RETENTION_PERIOD_DAYS
        });

    } catch (error: any) {
        // Fallback for schema mismatch (safe fail)
        if (error.message && error.message.includes('Unknown argument')) {
            console.warn('Cleanup skipped: Schema not updated yet');
            return NextResponse.json({ message: 'Skipped - schema mismatch' });
        }

        console.error('Error in trash cleanup:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
