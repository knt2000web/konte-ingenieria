
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import ServiceAni from './pages/ServiceAni';
import Projects from './pages/Projects';
import Contact from './pages/Contact';
import ClientDashboard from './pages/ClientDashboard';
import LoginModal from './components/LoginModal';
import { Page } from './types';
import { MessageCircle, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  // Refs for gesture handling (Pinch-to-Zoom)
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  const prevDist = useRef<number | null>(null);
  const lastPan = useRef<{ x: number, y: number } | null>(null);

  // Dark Mode Logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('konte-theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('konte-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('konte-theme', 'light');
    }
  }, [isDarkMode]);

  // Reset Zoom on Image Change or Close
  useEffect(() => {
    if (!lightboxImage) {
      setTransform({ scale: 1, x: 0, y: 0 });
      pointers.current.clear();
      prevDist.current = null;
      lastPan.current = null;
    }
  }, [lightboxImage]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage(Page.DASHBOARD);
  };

  const openLightbox = (src: string) => {
    setLightboxImage(src);
  };

  // --- Zoom Controls (Buttons) ---
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.5, 4) }));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTransform(prev => {
        const newScale = Math.max(prev.scale - 0.5, 1);
        return newScale === 1 ? { scale: 1, x: 0, y: 0 } : { ...prev, scale: newScale };
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTransform({ scale: 1, x: 0, y: 0 });
  };

  // --- Mouse Wheel Zoom Handler ---
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    
    setTransform(prev => {
      // Determine direction: negative deltaY is scrolling up (Zoom In), positive is down (Zoom Out)
      const direction = e.deltaY > 0 ? -1 : 1;
      const zoomFactor = 0.2; // Adjust zoom speed
      let newScale = prev.scale + (direction * zoomFactor);
      
      // Clamp scale between 1 and 4
      newScale = Math.min(Math.max(1, newScale), 4);
      
      // If zooming out to 1, reset position (center image)
      if (newScale === 1) return { scale: 1, x: 0, y: 0 };
      
      return { ...prev, scale: newScale };
    });
  };

  // --- Gesture Handlers (Pinch & Pan) ---
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); 
    // Capture pointer on the container to avoid losing it when dragging fast
    e.currentTarget.setPointerCapture(e.pointerId);
    
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Setup Pan (1 finger)
    if (pointers.current.size === 1) {
      lastPan.current = { x: e.clientX, y: e.clientY };
    } 
    // Setup Pinch (2 fingers)
    else if (pointers.current.size === 2) {
      const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      prevDist.current = dist;
      lastPan.current = null; // Disable pan while pinch initiates
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!pointers.current.has(e.pointerId)) return;

    // Update current pointer position
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // PINCH LOGIC (2 fingers)
    if (pointers.current.size === 2) {
      const points = Array.from(pointers.current.values()) as { x: number; y: number }[];
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      
      if (prevDist.current !== null) {
        const delta = dist - prevDist.current;
        setTransform(prev => {
          // Sensitivity factor 0.01
          const newScale = Math.min(Math.max(1, prev.scale + delta * 0.01), 4);
          return { ...prev, scale: newScale };
        });
      }
      prevDist.current = dist;
    } 
    // PAN LOGIC (1 finger and zoomed in)
    else if (pointers.current.size === 1 && transform.scale > 1 && lastPan.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastPan.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) {
      prevDist.current = null;
    }
    
    // Smooth transition from Pinch to Pan
    if (pointers.current.size === 1) {
      const p = pointers.current.values().next().value;
      lastPan.current = { x: p.x, y: p.y };
    } else {
      lastPan.current = null;
    }

    // Snap back if scale is 1
    if (pointers.current.size === 0 && transform.scale <= 1) {
       setTransform({ scale: 1, x: 0, y: 0 });
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.HOME:
        return <Home setPage={setCurrentPage} openLightbox={openLightbox} />;
      case Page.ABOUT:
        return <About setPage={setCurrentPage} openLightbox={openLightbox} />;
      case Page.SERVICES:
        return <Services setPage={setCurrentPage} openLightbox={openLightbox} />;
      case Page.SERVICE_ANI:
        return <ServiceAni setPage={setCurrentPage} openLightbox={openLightbox} />;
      case Page.PROJECTS:
        return <Projects openLightbox={openLightbox} />;
      case Page.CONTACT:
        return <Contact openLightbox={openLightbox} />;
      case Page.DASHBOARD:
        return isLoggedIn ? <ClientDashboard /> : <Home setPage={setCurrentPage} openLightbox={openLightbox} />;
      default:
        return <Home setPage={setCurrentPage} openLightbox={openLightbox} />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'bg-bg-dark text-gray-100' : 'bg-bg-light text-text-main'} relative`}>
      <Navbar 
        currentPage={currentPage} 
        setPage={setCurrentPage} 
        onLoginClick={() => setLoginModalOpen(true)}
        isLoggedIn={isLoggedIn}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
      
      <main className="flex-grow">
        {renderPage()}
      </main>

      <Footer setPage={setCurrentPage} />

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Global Lightbox Modal - Updated with Zoom */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center overflow-hidden touch-none"
          onClick={() => setLightboxImage(null)}
        >
          {/* Controls - Subtle Overlay */}
          <div className="absolute top-6 right-6 z-[110] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
             {/* Desktop Zoom Controls */}
             <div className="flex bg-white/10 rounded-full p-1 backdrop-blur-md border border-white/20 mr-2">
                 <button onClick={handleZoomOut} className="p-2 text-white hover:bg-white/20 rounded-full" disabled={transform.scale <= 1}>
                    <ZoomOut className="w-5 h-5" />
                 </button>
                 <button onClick={handleResetZoom} className="p-2 text-white hover:bg-white/20 rounded-full" title="Reset">
                    <RotateCcw className="w-4 h-4" />
                 </button>
                 <button onClick={handleZoomIn} className="p-2 text-white hover:bg-white/20 rounded-full" disabled={transform.scale >= 4}>
                    <ZoomIn className="w-5 h-5" />
                 </button>
             </div>

             <button 
                className="text-white/70 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20"
                onClick={() => setLightboxImage(null)}
             >
                <X className="w-8 h-8" />
             </button>
          </div>

          {/* Interactive Image Container */}
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            onClick={(e) => e.stopPropagation()} 
          >
            <img 
              ref={imageRef}
              src={lightboxImage} 
              alt="Vista completa" 
              className="max-w-full max-h-[90vh] object-contain select-none will-change-transform rounded-lg shadow-2xl"
              style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                cursor: transform.scale > 1 ? 'grab' : 'default',
                touchAction: 'none' // Critical for gestures
              }}
              draggable={false}
              onDoubleClick={(e) => {
                 e.stopPropagation();
                 transform.scale > 1 ? handleResetZoom() : handleZoomIn();
              }}
            />
          </div>
          
          {/* Helper text for mobile */}
          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none opacity-50 text-white text-xs">
             {transform.scale === 1 ? 'Doble toque, pellizcar o rueda del mouse para zoom' : ''}
          </div>
        </div>
      )}

      {/* Persistent Floating Contact Button */}
      <button
        onClick={() => setCurrentPage(Page.CONTACT)}
        className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-green-500/50 hover:scale-110 transition-all duration-300 group"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-8 h-8 fill-current" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          ¿Necesitas ayuda?
        </span>
      </button>

      {/* Persistent Cookie Banner Style CTA */}
      {!isLoggedIn && (
        <div className="fixed bottom-0 w-full bg-primary text-white p-4 z-30 shadow-lg border-t border-blue-800 animate-in slide-in-from-bottom-full duration-1000 delay-1000 fill-mode-forwards hidden md:block">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs md:text-sm">
            <p className="mb-3 md:mb-0 md:mr-6 text-center md:text-left">
              Utilizamos cookies para mejorar su experiencia. Al continuar navegando, acepta nuestra política de privacidad y tratamiento de datos.
              <a href="#" className="underline hover:text-gray-200 ml-1">Más información</a>
            </p>
            <button 
              onClick={(e) => e.currentTarget.parentElement?.parentElement?.remove()}
              className="px-6 py-2 bg-white text-primary rounded font-bold hover:bg-gray-100 transition-colors whitespace-nowrap shadow-sm text-gray-900"
            >
              Acepto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
