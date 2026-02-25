import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            );
        }


        const passwordHash = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        return NextResponse.json({
            message: 'Contraseña actualizada exitosamente',
        });

    } catch (error) {
        console.error('Error en reset-password:', error);
        return NextResponse.json(
            { error: 'Error al actualizar la contraseña' },
            { status: 500 }
        );
    }
}
