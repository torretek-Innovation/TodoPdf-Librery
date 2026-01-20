import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, comparePassword, hashPassword } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
    try {
        const userId = getUserFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isValid = await comparePassword(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 });
        }

        const newHash = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash }
        });

        return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
        console.error('Password update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
