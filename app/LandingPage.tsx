'use client';

import { useState } from 'react';
import { FiCheck, FiArrowRight, FiShield, FiLayout, FiDownload, FiServer, FiCode } from 'react-icons/fi';

interface LandingPageProps {
    onLoginClick: () => void;
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <img src="/logo/logo_with_letter.png" alt="TorreTek Logo" className="h-10 object-contain" />
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Funciones</a>
                            <a href="#about" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">Acerca de</a>
                            <button
                                onClick={onLoginClick}
                                className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-medium hover:bg-black transition-all transform hover:scale-105"
                            >
                                Iniciar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-50 to-transparent -z-10" />
                <div className="absolute top-20 right-20 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30 animate-pulse" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
                        <div className="lg:col-span-6 text-center lg:text-left mb-12 lg:mb-0">
                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                                <div className="inline-block px-4 py-1.5 bg-purple-50 text-purple-600 rounded-full text-sm font-semibold tracking-wide border border-purple-100 animate-fade-in-up">
                                    GESTOR DE ARCHIVOS PDF
                                </div>
                                <div className="inline-block px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-sm font-semibold tracking-wide border border-green-100 animate-fade-in-up">
                                    VERSIÓN 1.0.0
                                </div>
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
                                TodoPDF <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Library</span>
                            </h1>
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                La solución definitiva desarrollada por <span className="font-bold text-gray-800">TorreTek</span> para organizar, visualizar y gestionar tus documentos PDF. Potencia tu productividad con nuestra biblioteca inteligente.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <button
                                    onClick={onLoginClick}
                                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group"
                                >
                                    Comenzar Ahora
                                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <a
                                    href="#features"
                                    className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center"
                                >
                                    Ver Funcionalidades
                                </a>
                            </div>
                        </div>

                        <div className="lg:col-span-6 relative perspective-1000">
                            {/* Dashboard Screenshot with 3D effect */}
                            <div className="relative z-10 transform rotate-y-12 rotate-x-6 hover:rotate-0 transition-transform duration-700 ease-out preserve-3d">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-2xl opacity-30 transform translate-y-10 translate-x-10"></div>
                                <img
                                    src="/photos_real_project/dashboard.png"
                                    alt="TodoPDF Dashboard Interface"
                                    className="relative rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-white/50 w-full object-cover"
                                />
                                {/* Floating Badge */}
                                <div className="absolute -bottom-10 -left-10 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 animate-float">
                                    <div className="bg-green-100 p-3 rounded-xl">
                                        <FiCheck className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Estado del Sistema</p>
                                        <p className="text-gray-900 font-bold">100% Optimizado</p>
                                    </div>
                                </div>
                            </div>

                            {/* Background Elements */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl animate-pulse"></div>
                            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse delay-700"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Todo lo que necesitas</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">Un sistema completo diseñado para simplificar tu flujo de trabajo con documentos.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            {
                                icon: <FiLayout className="w-8 h-8 text-blue-500" />,
                                title: "Organización Eficiente",
                                desc: "Crea carpetas, categoriza y etiqueta tus PDFs para un acceso rápido y ordenado."
                            },
                            {
                                icon: <FiShield className="w-8 h-8 text-purple-500" />,
                                title: "Seguridad Total",
                                desc: "Tus documentos están protegidos. Gestiona permisos y accesos con total confianza."
                            },
                            {
                                icon: <FiCheck className="w-8 h-8 text-green-500" />,
                                title: "Lectura Inmersiva",
                                desc: "Visor integrado con herramientas de anotación y modos de lectura cómodos."
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 group">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-50 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Interface Preview Section */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:grid lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-3xl blur-3xl opacity-20 transform -rotate-3 scale-105"></div>
                            <img
                                src="/photos_real_project/biblioteca.png"
                                alt="Vista de Biblioteca"
                                className="relative rounded-2xl shadow-2xl border border-gray-100 rotate-2 hover:rotate-0 transition-transform duration-500"
                            />
                        </div>
                        <div className="order-1 lg:order-2 mb-12 lg:mb-0">
                            <span className="text-purple-600 font-bold tracking-wider uppercase text-sm">Interfaz Intuitiva</span>
                            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-6">Tu biblioteca digital, reinventada.</h2>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                Hemos diseñado una experiencia visual que te permite navegar por tu colección de documentos de manera natural. Con vistas previas de portadas generadas automáticamente y metadatos inteligentes.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Vistas previas automáticas de primera página',
                                    'Metadatos inteligentes (autor, fechas, etiquetas)',
                                    'Búsqueda instantánea y filtrado avanzado'
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center text-gray-700">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-4 text-green-600">
                                            <FiCheck size={16} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Deployment & Open Source Context */}
            <section className="py-24 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-[3rem] p-12 lg:p-16 text-white relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                        <div className="relative z-10 text-center max-w-3xl mx-auto mb-16">
                            <span className="inline-block px-4 py-1.5 mb-6 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold tracking-wide border border-blue-500/30">
                                Filosofía Open Source
                            </span>
                            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Tu software, tus reglas.</h2>
                            <p className="text-xl text-gray-300 leading-relaxed">
                                Este proyecto no es un servicio en la nube tradicional. Está diseñado para darte el control absoluto sobre tus datos y tu infraestructura.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 relative z-10">
                            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/10 hover:bg-white/20 transition-colors">
                                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
                                    <FiDownload className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">App de Escritorio</h3>
                                <p className="text-gray-300">
                                    Descarga la aplicación nativa basada en <strong>Electron</strong>. Todo el poder del sistema ejecutándose localmente en tu ordenador, sin depender de internet.
                                </p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/10 hover:bg-white/20 transition-colors">
                                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
                                    <FiServer className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Docker Self-Hosted</h3>
                                <p className="text-gray-300">
                                    ¿Tienes tu propio servidor? Despliega el sistema en segundos utilizando nuestra imagen oficial de <strong>Docker</strong>. Ideal para NAS o VPS personal.
                                </p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/10 hover:bg-white/20 transition-colors">
                                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
                                    <FiCode className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Código Abierto</h3>
                                <p className="text-gray-300">
                                    Creemos en la transparencia. El código fuente está disponible para que la comunidad pueda auditarlo, mejorarlo y adaptarlo a sus necesidades.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About / Tech Section */}
            <section id="about" className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-24 relative overflow-hidden">
                        {/* Abstract Shapes */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-600 to-blue-600 rounded-full blur-[100px] opacity-30"></div>

                        <div className="relative z-10 lg:grid lg:grid-cols-2 gap-16 items-center">
                            <div className="mb-12 lg:mb-0">
                                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Desarrollado por TorreTek</h2>
                                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                                    En TorreTek, nos especializamos en crear soluciones de software robustas y elegantes. TodoPDF Library es el resultado de nuestra pasión por la tecnología y la eficiencia, construido con las últimas tecnologías web para garantizar velocidad y fiabilidad.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {['Tecnología Next.js de vanguardia', 'Diseño UI/UX Profesional', 'Soporte y actualizaciones continuas'].map((item, i) => (
                                        <li key={i} className="flex items-center text-gray-300">
                                            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                                                <FiCheck className="w-3 h-3 text-purple-400" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={onLoginClick} className="px-8 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                                    Únete a la plataforma
                                </button>
                            </div>
                            <div className="flex justify-center">
                                <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl border border-white/20 max-w-sm w-full">
                                    <img src="/logo/logo_with_letter.png" alt="TorreTek Logo" className="w-full h-auto mb-6 invert brightness-0 filter" />
                                    <div className="space-y-4">
                                        <div className="h-2 bg-white/20 rounded-full w-3/4"></div>
                                        <div className="h-2 bg-white/20 rounded-full w-full"></div>
                                        <div className="h-2 bg-white/20 rounded-full w-5/6"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-50 py-12 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} TodoPDF v1.0.0. Desarrollado por <span className="font-bold text-gray-700">TorreTek</span>.</p>
                </div>
            </footer>
        </div>
    );
}
