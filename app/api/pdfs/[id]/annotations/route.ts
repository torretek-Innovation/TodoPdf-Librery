
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/pdfs/[id]/annotations
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // Await params if necessary (Next.js 15+ needs this, doing it for safety)
    const { id } = await Promise.resolve(params);
    const pdfId = parseInt(id);

    if (isNaN(pdfId)) {
        return NextResponse.json({ error: "Invalid PDF ID" }, { status: 400 });
    }

    try {
        // Safe check for the annotation model
        // If the Prisma client doesn't have 'annotation', it means generation failed or hasn't run.
        // We return empty annotations instead of crashing.
        const prismaAny = prisma as any;
        if (!prismaAny.annotation) {
            console.warn("Prisma Annotation model not found. Run 'npx prisma generate'. Returning empty.");
            return NextResponse.json({});
        }

        const annotations = await prismaAny.annotation.findMany({
            where: { pdfId },
            orderBy: { createdAt: 'asc' }
        });

        // Group by page for frontend consumption
        const grouped: Record<number, any> = {};

        annotations.forEach((ann: any) => {
            if (!grouped[ann.page]) {
                grouped[ann.page] = {
                    notes: '',
                    stickyNotes: [],
                    texts: [],
                    highlights: []
                };
            }

            if (ann.type === 'text') {
                grouped[ann.page].texts.push({
                    id: ann.uuid,
                    x: ann.x,
                    y: ann.y,
                    text: ann.text || ''
                });
            } else if (ann.type === 'highlight') {
                grouped[ann.page].highlights.push({
                    id: ann.uuid,
                    x: ann.x,
                    y: ann.y,
                    width: ann.width || 0,
                    height: ann.height || 0
                });
            } else if (ann.type === 'sticky_note') {
                grouped[ann.page].stickyNotes.push({
                    id: ann.uuid,
                    text: ann.text || '',
                    color: ann.color || 'bg-yellow-100', // Default if missing
                    date: ann.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        });

        return NextResponse.json(grouped);
    } catch (error) {
        console.error("Error fetching annotations:", error);
        // Return success with empty data to avoid blocking the UI
        return NextResponse.json({});
    }
}

// POST /api/pdfs/[id]/annotations
// Accepts a list of operations or a full sync of a page.
// For simplicity and robustness, we will accept a "Page Update" payload.
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = await Promise.resolve(params);
    const pdfId = parseInt(id);
    const body = await request.json();
    const { page, annotations } = body;

    if (isNaN(pdfId) || !page) {
        return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Transaction to replace annotations for this page
    // This isn't the most efficient for huge PDFs, but safe for consistency
    try {
        await (prisma as any).$transaction(async (tx: any) => {
            // Delete existing annotations for this page
            await tx.annotation.deleteMany({
                where: { pdfId, page }
            });

            // Prepare new records
            const records = [];

            // Texts
            if (annotations.texts) {
                for (const t of annotations.texts) {
                    records.push({
                        uuid: t.id,
                        pdfId,
                        page,
                        type: 'text',
                        x: t.x,
                        y: t.y,
                        text: t.text
                    });
                }
            }

            // Highlights
            if (annotations.highlights) {
                for (const h of annotations.highlights) {
                    records.push({
                        uuid: h.id,
                        pdfId,
                        page,
                        type: 'highlight',
                        x: h.x,
                        y: h.y,
                        width: h.width,
                        height: h.height
                    });
                }
            }

            // Sticky Notes
            if (annotations.stickyNotes) {
                for (const sn of annotations.stickyNotes) {
                    records.push({
                        uuid: sn.id,
                        pdfId,
                        page,
                        type: 'sticky_note',
                        x: 0, // Placeholder
                        y: 0, // Placeholder
                        text: sn.text,
                        color: sn.color
                    });
                }
            }

            if (records.length > 0) {
                await tx.annotation.createMany({
                    data: records
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving annotations:", error);
        return NextResponse.json({ error: "Failed to save annotations" }, { status: 500 });
    }
}
