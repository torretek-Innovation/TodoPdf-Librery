import path from 'path';
import fs from 'fs';

/**
 * Returns the storage directory for the application.
 * In development, it uses the project's 'public/uploads' folder.
 * In production (Electron), it uses the AppData path provided by the 'STORAGE_DIR' env var (or defaults).
 */
export function getStorageDirectory(subDir: string = ''): string {
    // 1. Check if we are in Electron Production (via env var passed from main.js)
    if (process.env.STORAGE_DIR) {
        return path.join(process.env.STORAGE_DIR, subDir);
    }

    // 2. Default Next.js development/server behavior
    // Use the public folder so files are served statically by Next.js in dev
    return path.join(process.cwd(), 'public', 'uploads', subDir);
}

/**
 * Helper to ensure the directory exists
 */
export async function ensureStorageDirectory(subDir: string = ''): Promise<string> {
    const dir = getStorageDirectory(subDir);
    try {
        await fs.promises.mkdir(dir, { recursive: true });
    } catch (e) {
        console.error(`Failed to create directory: ${dir}`, e);
    }
    return dir;
}

/**
 * Get the public URL for a file.
 * In Dev: returns normal /uploads/... path.
 * In Prod: returns a special API route path to serve the file from AppData.
 */
export function getFileUrl(fileName: string, type: 'pdfs' | 'avatars'): string {
    if (process.env.STORAGE_DIR) {
        // Use an API route to serve the file in production
        return `/api/assets/${type}/${fileName}`;
    }

    // In dev, serve directly from public folder
    return `/uploads/${type}/${fileName}`;
}
