'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type TTSState = 'IDLE' | 'PLAYING' | 'PAUSED';

interface TTSContextType {
    speak: (text: string, metadata?: { title?: string; pdfId?: string; page?: number; onComplete?: () => void }) => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    currentText: string;
    currentMetadata: { title?: string; pdfId?: string; page?: number };
    state: TTSState;
    voice: SpeechSynthesisVoice | null;
    voices: SpeechSynthesisVoice[];
    setVoice: (voice: SpeechSynthesisVoice) => void;
    isMinimized: boolean;
    setIsMinimized: (val: boolean) => void;
    charIndex: number;
    rate: number;
    setRate: (rate: number) => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export function TTSProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<TTSState>('IDLE');
    const [currentText, setCurrentText] = useState('');
    const [currentMetadata, setCurrentMetadata] = useState<{ title?: string; pdfId?: string; page?: number }>({});
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [rate, setRate] = useState(1.0);

    const [charIndex, setCharIndex] = useState(0);

    // Use a ref to hold the utterance so we can control it across renders
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initialize synthesis and load voices
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;

            const loadVoices = () => {
                const availableVoices = synthRef.current?.getVoices() || [];
                setVoices(availableVoices);
                // Prefer Google Español or just the first Spanish voice, else default
                if (!voice) {
                    const esVoice = availableVoices.find(v => v.lang.startsWith('es') && v.name.includes('Google'))
                        || availableVoices.find(v => v.lang.startsWith('es'));
                    if (esVoice) setVoice(esVoice);
                }
            };

            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, [voice]);

    const speak = (text: string, metadata: { title?: string; pdfId?: string; page?: number; onComplete?: () => void } = {}) => {
        if (!synthRef.current) return;

        // Cancel previous
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else {
            utterance.lang = 'es-ES';
        }
        utterance.rate = rate; // Apply current rate

        utterance.onstart = () => {
            setState('PLAYING');
            setCharIndex(0);
        };

        utterance.onboundary = (e) => {
            if (e.name === 'word' || e.name === 'sentence') {
                setCharIndex(e.charIndex);
            }
        };

        utterance.onend = () => {
            setState('IDLE');
            setIsMinimized(false); // Close mini player when done
            setCharIndex(0);
            if (metadata.onComplete) {
                metadata.onComplete();
            }
        };
        utterance.onerror = (e) => {
            // Ignore interruption errors which happen frequently when switching pages or stopping
            if (e.error === 'interrupted') {
                setState('IDLE');
                return;
            }
            console.error('TTS Error Event:', e);
            setState('IDLE');
        };

        utteranceRef.current = utterance;
        setCurrentText(text);
        setCurrentMetadata(metadata);
        setIsMinimized(false); // Initially not minimized if called from viewer

        synthRef.current.speak(utterance);
    };

    const stop = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setState('IDLE');
            setIsMinimized(false);
            setCharIndex(0);
        }
    };

    const pause = () => {
        if (synthRef.current) {
            synthRef.current.pause();
            setState('PAUSED');
        }
    };

    const resume = () => {
        if (synthRef.current) {
            synthRef.current.resume();
            setState('PLAYING');
        }
    };

    return (
        <TTSContext.Provider value={{
            speak,
            stop,
            pause,
            resume,
            currentText,
            currentMetadata,
            state,
            voice,
            voices,
            setVoice,
            rate,
            setRate,
            isMinimized,
            setIsMinimized,
            charIndex
        }}>
            {children}
        </TTSContext.Provider>
    );
}

export const useTTS = () => {
    const context = useContext(TTSContext);
    if (!context) throw new Error('useTTS must be used within a TTSProvider');
    return context;
};
