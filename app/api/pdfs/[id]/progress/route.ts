
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const pdfId = parseInt(params.id);
        const { page, totalPages } = await request.json();

        // TODO: Get userId from token. For now, use the first user.
        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const percentage = Math.round((page / totalPages) * 100);

        const progress = await prisma.readingProgress.upsert({
            where: {
                userId_pdfId: {
                    userId: user.id,
                    pdfId: pdfId
                }
            },
            update: {
                lastPage: page,
                progressPercentage: percentage,
            },
            create: {
                userId: user.id,
                pdfId: pdfId,
                lastPage: page,
                progressPercentage: percentage,
            }
        });

        return NextResponse.json({ success: true, progress });

    } catch (error) {
        console.error('Error updating progress:', error);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
