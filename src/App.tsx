import React, { useState, useEffect } from 'react';
import { Camera, FileDown, CheckCircle, Image as ImageIcon, Loader2, MapPin, CheckSquare, Zap, HardHat, FileText } from 'lucide-react';
import { processImage } from './lib/watermark';
import { jsPDF } from 'jspdf';

export default function App() {
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [footerDataUrl, setFooterDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImg = (src: string, setter: (val: string) => void) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setter(canvas.toDataURL('image/png'));
        }
      };
    };
    loadImg('/logo.png', setLogoDataUrl);
    loadImg('/footer.png', setFooterDataUrl); // Espera que la imagen footer se provea en /footer.png
  }, []);

  const [projectInfo, setProjectInfo] = useState({
    name: '',
    address: '',
    capacity: '',
    leader: '',
    date: ''
  });

  const [photos, setPhotos] = useState([
    { id: 'cubierta', label: 'Cubierta solar (Paneles instalados)', dataUrls: [] as string[], loading: false },
    { id: 'inversor', label: 'Inversor (Pantalla encendida y placa)', dataUrls: [] as string[], loading: false },
    { id: 'ac', label: 'Caja eléctrica y protecciones AC', dataUrls: [] as string[], loading: false },
    { id: 'dc', label: 'Caja eléctrica y protecciones DC', dataUrls: [] as string[], loading: false },
    { id: 'spt', label: 'Sistema de Puesta a Tierra (SPT)', dataUrls: [] as string[], loading: false },
    { id: 'medidor', label: 'Medidor Bidireccional (Si ya está instalado)', dataUrls: [] as string[], loading: false },
    { id: 'etiquetas', label: 'Etiquetado de Seguridad', dataUrls: [] as string[], loading: false },
  ]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectInfo({ ...projectInfo, [e.target.name]: e.target.value });
  };

  const handlePhotoCapture = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setPhotos(prev => prev.map(p => p.id === id ? { ...p, loading: true } : p));
    
    try {
      const newDataUrls: string[] = [];
      for (const file of files) {
        const dataUrl = await processImage(file);
        newDataUrls.push(dataUrl);
      }
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, dataUrls: [...p.dataUrls, ...newDataUrls], loading: false } : p));
    } catch (err) {
      console.error(err);
      alert('Error procesando la imagen o no se aprobó la geolocalización. ' + (err instanceof Error ? err.message : ''));
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, loading: false } : p));
    }
  };

  const removePhoto = (id: string, indexToRemove: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, dataUrls: p.dataUrls.filter((_, idx) => idx !== indexToRemove) } : p));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Portada / Info
      if (logoDataUrl) {
         try {
           const imgProps = doc.getImageProperties(logoDataUrl);
           const maxWidth = 50;
           const maxHeight = 25;
           const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
           const drawW = imgProps.width * ratio;
           const drawH = imgProps.height * ratio;
           // Align to top right
           doc.addImage(logoDataUrl, 'PNG', 190 - drawW, 10, drawW, drawH);
         } catch (e) {
           console.error("Error adding logo", e);
         }
      }

      if (footerDataUrl) {
         try {
           const footerProps = doc.getImageProperties(footerDataUrl);
           const pW = doc.internal.pageSize.getWidth();
           const pH = doc.internal.pageSize.getHeight();
           const fRatio = pW / footerProps.width;
           const fW = pW;
           const fH = footerProps.height * fRatio;
           doc.addImage(footerDataUrl, 'PNG', 0, pH - fH, fW, fH);
         } catch(e) {
           console.warn('Could not add footer to portada', e);
         }
      }

      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text('Evidencia de Instalación', 20, 25);
      doc.text('Proyecto Solar', 20, 33);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 40, 190, 40);

      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);

      const spacing = 12;
      let yOffset = 52;

      doc.setFont('helvetica', 'bold');
      doc.text('Nombre del Proyecto:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.name || 'N/A', 80, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.address || 'N/A', 80, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Capacidad (kWp):', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.capacity || 'N/A', 80, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Líder Técnico:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.leader || 'N/A', 80, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha en Marcha:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.date || 'N/A', 80, yOffset);

      // Photos
      let photosAdded = 0;
      for (const photo of photos) {
        if (photo.dataUrls.length > 0) {
          for (let i = 0; i < photo.dataUrls.length; i++) {
            const dataUrl = photo.dataUrls[i];
            doc.addPage();
            photosAdded++;
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text(`${photo.label} (${i + 1}/${photo.dataUrls.length})`, 20, 20);
            
            const imgProps = doc.getImageProperties(dataUrl);
            const pdfW = doc.internal.pageSize.getWidth() - 40;
            const pdfH = doc.internal.pageSize.getHeight() - 40 - 20; // Dejar espacio para footer
            
            const ratio = Math.min(pdfW / imgProps.width, pdfH / imgProps.height);
            const drawW = imgProps.width * ratio;
            const drawH = imgProps.height * ratio;
            
            doc.addImage(dataUrl, 'JPEG', 20, 30, drawW, drawH);

            // Add footer to page if available
            if (footerDataUrl) {
              try {
                const footerProps = doc.getImageProperties(footerDataUrl);
                const pW = doc.internal.pageSize.getWidth();
                const pH = doc.internal.pageSize.getHeight();
                const fRatio = pW / footerProps.width;
                const fW = pW;
                const fH = footerProps.height * fRatio;
                doc.addImage(footerDataUrl, 'PNG', 0, pH - fH, fW, fH);
              } catch(e) {
                console.warn('Could not add footer', e);
              }
            }
          }
        }
      }

      if (photosAdded === 0) {
        alert('ADVERTENCIA: No se han incluido fotos en el PDF. Toma evidencia antes de generar.');
      }

      doc.save(`Reporte_Solar_${projectInfo.name || 'Proyecto'}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getMissingCount = () => photos.filter(p => p.dataUrls.length === 0).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h1 className="text-xl font-bold">Acta de Puesta en Marcha</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-4">
        
        {/* Section 1: Info */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            <h2 className="font-bold text-slate-800">1. Información del Proyecto</h2>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Nombre del Proyecto</label>
                <input 
                  type="text" name="name" value={projectInfo.name} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: Finca El Sol"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Dirección</label>
                <input 
                  type="text" name="address" value={projectInfo.address} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: Vereda La Linda, Lote 4"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Capacidad (kWp)</label>
                <input 
                  type="number" name="capacity" value={projectInfo.capacity} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: 5.4"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Líder Técnico en Campo</label>
                <input 
                  type="text" name="leader" value={projectInfo.leader} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nombre del ingeniero"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-semibold text-slate-600">Fecha de Puesta en Marcha</label>
                <input 
                  type="date" name="date" value={projectInfo.date} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Evidencias */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-700" />
              <h2 className="font-bold text-slate-800">2. Fotos de Evidencia</h2>
            </div>
            <span className="text-xs bg-white text-slate-600 px-2 py-1 rounded shadow-sm border border-slate-200">
              Faltan {getMissingCount()}
            </span>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> La cámara agregará coordenadas y fecha automáticamente.
            </p>

            {photos.map(photo => (
              <div key={photo.id} className="border border-slate-200 rounded-lg p-3 group hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start gap-3 flex-col sm:flex-row">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      {photo.label}
                      {photo.dataUrls.length > 0 && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-blue-200 flex items-center gap-2 shrink-0">
                      {photo.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      Cámara
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoCapture(photo.id, e)}
                        disabled={photo.loading}
                      />
                    </label>
                    <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-slate-200 flex items-center gap-2 shrink-0">
                      {photo.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      Galería
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden"
                        onChange={(e) => handlePhotoCapture(photo.id, e)}
                        disabled={photo.loading}
                      />
                    </label>
                  </div>
                </div>

                {photo.dataUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photo.dataUrls.map((url, idx) => (
                      <div key={idx} className="relative rounded overflow-hidden border border-slate-200 bg-slate-100 group">
                        <img src={url} alt={`${photo.label} ${idx + 1}`} className="w-full h-24 sm:h-32 object-cover" />
                        <button
                          onClick={() => removePhoto(photo.id, idx)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded hover:scale-110 active:scale-95 transition-all text-xs z-10"
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button 
            onClick={generatePDF}
            disabled={isGenerating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            {isGenerating ? 'Generando PDF...' : 'Generar PDF del Proyecto'}
          </button>
        </div>
      </div>

    </div>
  );
}
