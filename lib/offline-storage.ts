'use client';

import { openDB, DBSchema } from 'idb';

interface PDFDB extends DBSchema {
    pdfs: {
        key: string;
        value: {
            id: string;
            blob: Blob;
            savedAt: number;
        };
    };
}

const DB_NAME = 'todo-pdf-offline';
const STORE_NAME = 'pdfs';

export const offlineStorage = {
    async init() {
        return openDB<PDFDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    },

    async savePDF(id: string, blob: Blob) {
        const db = await this.init();
        await db.put(STORE_NAME, {
            id,
            blob,
            savedAt: Date.now(),
        });
    },

    async getPDF(id: string) {
        const db = await this.init();
        return db.get(STORE_NAME, id);
    },

    async deletePDF(id: string) {
        const db = await this.init();
        await db.delete(STORE_NAME, id);
    },

    async isSaved(id: string) {
        const db = await this.init();
        const item = await db.get(STORE_NAME, id);
        return !!item;
    }
};
