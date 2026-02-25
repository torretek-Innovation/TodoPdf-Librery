import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const { folderUrl } = await req.json();

        if (!folderUrl) {
            return NextResponse.json({ error: 'Falta la URL de la carpeta' }, { status: 400 });
        }


        const match = folderUrl.match(/folders\/([-a-zA-Z0-9_]+)/);
        const folderId = match ? match[1] : null;

        if (!folderId) {
            return NextResponse.json({ error: 'URL de Google Drive inválida' }, { status: 400 });
        }


        const scriptPath = join(process.cwd(), 'scripts', 'scan_drive.py');


        const command = `python "${scriptPath}" "${folderId}"`;

        console.log(`Ejecutando: ${command}`);

        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.error(`Python stderr: ${stderr}`);

        }

        try {

            const result = JSON.parse(stdout);
            return NextResponse.json(result);
        } catch (parseError) {
            console.error('Error parseando salida de Python:', stdout);
            return NextResponse.json({ error: 'Error procesando la respuesta del script' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error en scan-drive:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
