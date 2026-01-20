import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
    try {
        // Get user from token
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const userId = decoded.userId;

        // Get all reading progress updates for this user, ordered by date
        const progressUpdates = await prisma.readingProgress.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                updatedAt: 'desc'
            },
            select: {
                updatedAt: true
            }
        });

        if (progressUpdates.length === 0) {
            return NextResponse.json({
                currentStreak: 0,
                longestStreak: 0,
                lastReadDate: null
            });
        }

        // Calculate streak
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 1;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get unique dates (one entry per day)
        const uniqueDates = new Set<string>();
        progressUpdates.forEach(update => {
            const date = new Date(update.updatedAt);
            date.setHours(0, 0, 0, 0);
            uniqueDates.add(date.toISOString());
        });

        const sortedDates = Array.from(uniqueDates)
            .map(d => new Date(d))
            .sort((a, b) => b.getTime() - a.getTime());

        // Check if user read today or yesterday to start current streak
        const lastReadDate = sortedDates[0];
        const daysSinceLastRead = Math.floor((today.getTime() - lastReadDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceLastRead <= 1) {
            currentStreak = 1;

            // Calculate consecutive days
            for (let i = 1; i < sortedDates.length; i++) {
                const currentDate = sortedDates[i];
                const previousDate = sortedDates[i - 1];
                const daysDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysDiff === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        tempStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = sortedDates[i];
            const previousDate = sortedDates[i - 1];
            const daysDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 1;
            }
        }

        longestStreak = Math.max(longestStreak, currentStreak);

        return NextResponse.json({
            currentStreak,
            longestStreak,
            lastReadDate: lastReadDate.toISOString(),
            totalDaysRead: sortedDates.length
        });

    } catch (error) {
        console.error('Error calculating reading streak:', error);
        return NextResponse.json({ error: 'Error al calcular racha' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
