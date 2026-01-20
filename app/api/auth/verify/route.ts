import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Token no proporcionado' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (!payload) {
            return NextResponse.json(
                { error: 'Token inválido o expirado' },
                { status: 401 }
            );
        }

        // Verificar que el usuario aún existe
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            valid: true,
            user: {
                id: user.id,
                username: user.username,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Error en verify:', error);
        return NextResponse.json(
            { error: 'Error al verificar el token' },
            { status: 500 }
        );
    }
}