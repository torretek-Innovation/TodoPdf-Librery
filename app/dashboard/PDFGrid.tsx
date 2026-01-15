'use client';

import PDFCard from './PDFCard';

const samplePDFs = [
    { id: 1, title: 'Manual de Usuario.pdf', size: '2.4 MB', date: 'Hace 2 días', isFavorite: true },
    { id: 2, title: 'Reporte Financiero 2024.pdf', size: '1.8 MB', date: 'Hace 3 días', isFavorite: false },
    { id: 3, title: 'Presentación Proyecto.pdf', size: '5.2 MB', date: 'Hace 1 semana', isFavorite: true },
    { id: 4, title: 'Contrato de Servicios.pdf', size: '890 KB', date: 'Hace 2 semanas', isFavorite: false },
    { id: 5, title: 'Guía de Instalación.pdf', size: '3.1 MB', date: 'Hace 3 semanas', isFavorite: false },
    { id: 6, title: 'Factura #001234.pdf', size: '456 KB', date: 'Hace 1 mes', isFavorite: false },
];

export default function PDFGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {samplePDFs.map((pdf) => (
                <PDFCard
                    key={pdf.id}
                    title={pdf.title}
                    size={pdf.size}
                    date={pdf.date}
                    isFavorite={pdf.isFavorite} filePath={''} uploadDate={''} />
            ))}
        </div>
    );
}