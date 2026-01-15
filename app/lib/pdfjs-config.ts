// Este archivo se usa para configurar pdfjs en el cliente
import { pdfjs } from 'react-pdf';

// Configurar el worker usando CDN de jsDelivr (más confiable)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default pdfjs;
