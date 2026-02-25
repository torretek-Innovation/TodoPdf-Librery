import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ categories: [] });
        }

        const categories = await prisma.category.findMany({
            where: { userId: user.id },
            select: { name: true },
            orderBy: { name: 'asc' }
        });


        const categoryNames = categories.map(c => c.name);

        return NextResponse.json({ categories: categoryNames });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }


        const category = await prisma.category.findFirst({
            where: {
                userId: user.id,
                name: name
            }
        });

        if (category) {

            await prisma.pdfCategory.deleteMany({
                where: { categoryId: category.id }
            });

            await prisma.category.delete({
                where: { id: category.id }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
