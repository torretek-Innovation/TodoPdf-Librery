'use client';

import { useEffect } from 'react';

export default function ThemeInit() {
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const root = window.document.documentElement;

        // Clear previous
        root.classList.remove('light', 'dark');

        if (savedTheme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else if (savedTheme) {
            root.classList.add(savedTheme);
        } else {
            root.classList.add('light'); // Default
        }
    }, []);

    return null;
}
