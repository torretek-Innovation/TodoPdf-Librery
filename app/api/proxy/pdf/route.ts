import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch content');

        const blob = await response.blob();
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');

        return new NextResponse(blob, { status: 200, statusText: "OK", headers });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to proxy' }, { status: 500 });
    }
}
