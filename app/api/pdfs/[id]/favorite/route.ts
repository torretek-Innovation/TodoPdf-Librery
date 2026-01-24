import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Ensure params are awaited if they are promises (Next.js 15+) or just access them
        const { id } = await params;
        const pdfId = parseInt(id);

        console.log(`Toggling favorite for PDF ID: ${id} parsed as ${pdfId}`);

        if (isNaN(pdfId)) {
            console.error('Invalid PDF ID received:', id);
            return NextResponse.json({ error: 'Invalid PDF ID' }, { status: 400 });
        }

        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if favorite exists
        const existingFavorite = await prisma.favorite.findUnique({
            where: {
                userId_pdfId: {
                    userId: user.id,
                    pdfId: pdfId
                }
            }
        });

        let isFavorite = false;

        if (existingFavorite) {
            await prisma.favorite.delete({
                where: {
                    userId_pdfId: {
                        userId: user.id,
                        pdfId: pdfId
                    }
                }
            });
            isFavorite = false;
        } else {
            await prisma.favorite.create({
                data: {
                    userId: user.id,
                    pdfId: pdfId
                }
            });
            isFavorite = true;
        }

        return NextResponse.json({ success: true, isFavorite });

    } catch (error) {
        console.error('Error toggling favorite:', error);
        return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
