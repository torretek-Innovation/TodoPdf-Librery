import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { step, username, answer } = body;


        if (step === 'find-user') {
            if (!username) {
                return NextResponse.json(
                    { error: 'Ingresa tu nombre de usuario o correo' },
                    { status: 400 }
                );
            }

            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: username },
                        { email: username }
                    ]
                },
                include: {
                    securityQuestion: true,
                }
            });

            if (!user) {
                return NextResponse.json(
                    { error: 'No se encontró ninguna cuenta con esos datos' },
                    { status: 404 }
                );
            }

            if (!user.securityQuestion) {
                return NextResponse.json(
                    { error: 'Esta cuenta no tiene configurada una pregunta de seguridad' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                message: 'Usuario encontrado',
                userId: user.id,
                question: user.securityQuestion.question,
            });
        }


        if (step === 'verify-answer') {
            const { userId } = body;

            if (!userId || !answer) {
                return NextResponse.json(
                    { error: 'Datos incompletos' },
                    { status: 400 }
                );
            }

            const securityQuestion = await prisma.securityQuestion.findUnique({
                where: { userId: userId }
            });

            if (!securityQuestion) {
                return NextResponse.json(
                    { error: 'Pregunta de seguridad no encontrada' },
                    { status: 404 }
                );
            }


            const normalizedAnswer = answer.trim().toLowerCase();
            const isValid = await bcrypt.compare(normalizedAnswer, securityQuestion.answerHash);

            if (!isValid) {
                return NextResponse.json(
                    { error: 'Respuesta incorrecta. Intenta de nuevo.' },
                    { status: 401 }
                );
            }

            return NextResponse.json({
                message: 'Respuesta correcta',
                verified: true,
                userId: userId,
            });
        }

        return NextResponse.json(
            { error: 'Paso no válido' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Error en recover:', error);
        return NextResponse.json(
            { error: 'Error en el proceso de recuperación' },
            { status: 500 }
        );
    }
}
