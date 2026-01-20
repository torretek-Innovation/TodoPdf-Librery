'use client';
import { useEffect } from 'react';

// Using a custom component to isolate the DOM manipulation side effect
export default function TTSHighlighter({ active, charIndex, pageRef }: { active: boolean, charIndex: number, pageRef: React.RefObject<HTMLDivElement> }) {
    useEffect(() => {
        if (!active || !pageRef.current) return;

        // Find the text layer container
        const textLayer = pageRef.current.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return;

        const spans = Array.from(textLayer.children) as HTMLElement[];
        if (spans.length === 0) return;

        // Logic to map charIndex to span
        // We assume the text was joined by spaces.
        let runningLength = 0;
        let activeSpanIndex = -1;

        for (let i = 0; i < spans.length; i++) {
            const spanText = spans[i].textContent || '';
            // The text extraction usually adds a space, or we did. 
            // In PDFViewer we did: .map(item => item.str).join(' ');
            // The spans usually correspond 1:1 to items.

            const segmentLength = spanText.length + 1; // +1 for the space we assumed

            if (charIndex >= runningLength && charIndex < runningLength + segmentLength) {
                activeSpanIndex = i;
                break;
            }
            runningLength += segmentLength;
        }

        // Apply highlight
        spans.forEach((span, i) => {
            if (i === activeSpanIndex) {
                span.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                span.style.borderRadius = '2px';
                span.style.transform = 'scale(1.05)';
                span.style.transition = 'all 0.2s';
            } else {
                span.style.backgroundColor = '';
                span.style.transform = '';
            }
        });

    }, [active, charIndex, pageRef]);

    return null;
}
