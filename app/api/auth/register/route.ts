import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, email, password, securityQuestion, securityAnswer } = body;

        // Validaciones
        if (!username || !password || !email) {
            return NextResponse.json(
                { error: 'Todos los campos son requeridos' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            );
        }

        if (!securityQuestion || !securityAnswer) {
            return NextResponse.json(
                { error: 'La pregunta y respuesta de seguridad son requeridas' },
                { status: 400 }
            );
        }

        // Verificar si el usuario o email ya existe
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: email }
                ]
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'El nombre de usuario o correo ya está registrado' },
                { status: 409 }
            );
        }

        // Hash de la contraseña
        const passwordHash = await hashPassword(password);

        // Hash de la respuesta de seguridad (normalizada a minúsculas y sin espacios extra)
        const normalizedAnswer = securityAnswer.trim().toLowerCase();
        const answerHash = await hashPassword(normalizedAnswer);

        // Crear usuario con pregunta de seguridad
        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                securityQuestion: {
                    create: {
                        question: securityQuestion,
                        answerHash: answerHash,
                    }
                }
            },
        });

        // Generar token JWT
        const token = generateToken({
            userId: user.id,
            email: user.email || user.username,
        });

        // Retornar usuario y token
        return NextResponse.json(
            {
                message: 'Usuario creado exitosamente',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt,
                    avatarPath: user.avatarPath,
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