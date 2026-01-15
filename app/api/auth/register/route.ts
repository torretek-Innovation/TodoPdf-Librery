import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        // Validaciones
        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username y password son requeridos' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            );
        }

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'El usuario ya existe' },
                { status: 409 }
            );
        }

        // Hash de la contraseña
        const passwordHash = await hashPassword(password);

        // Crear usuario
        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
            },
        });

        // Generar token JWT
        const token = signToken({
            userId: user.id,
            username: user.username,
        });

        // Retornar usuario y token
        return NextResponse.json(
            {
                message: 'Usuario creado exitosamente',
                user: {
                    id: user.id,
                    username: user.username,
                    createdAt: user.createdAt,
                },
                token,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error en register:', error);
        return NextResponse.json(
            { error: 'Error al crear el usuario' },
            { status: 500 }
        );
    }
}