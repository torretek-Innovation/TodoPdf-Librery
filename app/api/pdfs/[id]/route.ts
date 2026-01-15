import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// GET - Obtener un PDF específico
// GET - Obtener un PDF específico incluyendo el progreso del usuario actual
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const pdfId = parseInt(params.id);

        // 1. Obtener usuario actual (Temporalmente el primero, igual que en tu lógica de guardar)
        // TODO: Implementar autenticación real
        const user = await prisma.user.findFirst();

        // 2. Obtener el PDF
        const pdf = await prisma.pdf.findUnique({
            where: { id: pdfId },
            include: {
                categories: {
                    include: { category: true }
                },
                favorites: true,
                // No incluimos readingProgress globalmente para no traer datos de otros
            }
        });

        if (!pdf) {
            return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
        }

        // 3. Buscar el progreso específico de ESTE usuario para ESTE pdf
        let currentPage = 1;
        if (user) {
            const progress = await prisma.readingProgress.findUnique({
                where: {
                    userId_pdfId: {
                        userId: user.id,
                        pdfId: pdfId
                    }
                }
            });
            if (progress) {
                currentPage = progress.lastPage;
            }
        }

        // 4. Devolver el PDF y la página actual limpia
        return NextResponse.json({
            pdf,
            currentPage // Enviamos esto explícitamente
        });

    } catch (error) {
        console.error('Error fetching PDF:', error);
        return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

// PATCH - Actualizar un PDF
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        console.log('PATCH /api/pdfs/[id] - Params:', params);
        const pdfId = parseInt(params.id);
        console.log('PDF ID parseado:', pdfId);

        const body = await request.json();
        console.log('Body recibido:', body);

        const { title, category, coverImage } = body;

        // Construir el objeto de actualización solo con campos definidos
        const updateData: any = {};
        if (title !== undefined && title !== null) {
            updateData.title = title;
        }
        if (coverImage !== undefined && coverImage !== null) {
            updateData.coverImagePath = coverImage;
        }

        console.log('Datos a actualizar:', updateData);

        // Solo actualizar si hay datos
        let updatedPdf;
        if (Object.keys(updateData).length > 0) {
            updatedPdf = await prisma.pdf.update({
                where: { id: pdfId },
                data: updateData
            });
            console.log('PDF actualizado:', updatedPdf);
        } else {
            // Si no hay datos para actualizar, solo obtener el PDF actual
            updatedPdf = await prisma.pdf.findUnique({
                where: { id: pdfId }
            });
            console.log('No hay cambios en el PDF, obteniendo actual');
        }

        // Si se proporciona una categoría, manejarla
        if (category) {
            console.log('Procesando categoría:', category);
            // Obtener el userId del PDF
            const pdf = await prisma.pdf.findUnique({
                where: { id: pdfId },
                select: { userId: true }
            });

            if (pdf) {
                // Buscar o crear la categoría
                let categoryRecord = await prisma.category.findFirst({
                    where: {
                        userId: pdf.userId,
                        name: category
                    }
                });

                if (!categoryRecord) {
                    console.log('Creando nueva categoría');
                    categoryRecord = await prisma.category.create({
                        data: {
                            userId: pdf.userId,
                            name: category
                        }
                    });
                }

                // Eliminar categorías anteriores del PDF
                await prisma.pdfCategory.deleteMany({
                    where: { pdfId }
                });

                // Asignar la nueva categoría
                await prisma.pdfCategory.create({
                    data: {
                        pdfId,
                        categoryId: categoryRecord.id
                    }
                });
                console.log('Categoría asignada correctamente');
            }
        }

        return NextResponse.json({
            success: true,
            pdf: updatedPdf
        });

    } catch (error) {
        console.error('Error updating PDF:', error);
        return NextResponse.json({
            error: 'Failed to update PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

// DELETE - Eliminar un PDF
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const pdfId = parseInt(params.id);

        await prisma.pdf.delete({
            where: { id: pdfId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting PDF:', error);
        return NextResponse.json({ error: 'Failed to delete PDF' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
