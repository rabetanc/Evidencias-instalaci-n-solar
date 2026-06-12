import React, { useState, useEffect } from 'react';
import { Camera, FileDown, CheckCircle, Image as ImageIcon, Loader2, MapPin, CheckSquare, Zap, HardHat, FileText } from 'lucide-react';
import { processImage } from './lib/watermark';
import { jsPDF } from 'jspdf';

export default function App() {
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [footerDataUrl, setFooterDataUrl] = useState<string | null>(null);
  const [templateDataUrl, setTemplateDataUrl] = useState<string | null>(null);

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
    loadImg('/Plantilla.png', setTemplateDataUrl); // Plantilla de registro fotográfico
  }, []);

  const [projectInfo, setProjectInfo] = useState({
    name: '',
    address: '',
    capacity: '',
    panelsCount: '',
    panelRef: '',
    inverterRef: '',
    leader: '',
    date: ''
  });

  const [photos, setPhotos] = useState([
    { id: 'cubierta', label: 'Cubierta solar (Paneles instalados)', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'inversor_placa', label: 'Inversor (Placa. Serial y referencia)', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'inversor_funcionando', label: 'Inversor (Funcionando)', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'inversor_cno', label: 'Inversor (Configuración parametros CNO)', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'pruebas_voc', label: 'Pruebas Voc por String', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'ac', label: 'Caja eléctrica y protecciones AC', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'dc', label: 'Caja eléctrica y protecciones DC', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'spt', label: 'Sistema de Puesta a Tierra (SPT)', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'medidor', label: 'Medidor Bidireccional', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
    { id: 'etiquetado', label: 'Etiquetado de Seguridad', dataUrls: [] as { url: string; notes: string }[], details: '', loading: false },
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
      const newItems: { url: string; notes: string }[] = [];
      for (const file of files) {
        const dataUrl = await processImage(file as File);
        newItems.push({ url: dataUrl, notes: '' });
      }
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, dataUrls: [...p.dataUrls, ...newItems], loading: false } : p));
    } catch (err) {
      console.error(err);
      alert('Error procesando la imagen o no se aprobó la geolocalización. ' + (err instanceof Error ? err.message : ''));
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, loading: false } : p));
    }
  };

  const removePhoto = (id: string, indexToRemove: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, dataUrls: p.dataUrls.filter((_, idx) => idx !== indexToRemove) } : p));
  };

  const handleDetailsChange = (id: string, text: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, details: text } : p));
  };

  const handleIndividualNoteChange = (id: string, index: number, note: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? {
      ...p,
      dataUrls: p.dataUrls.map((item, idx) => idx === index ? { ...item, notes: note } : item)
    } : p));
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

      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);

      const spacing = 11;
      let yOffset = 50;

      doc.setFont('helvetica', 'bold');
      doc.text('Nombre del proyecto:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.name || 'N/A', 100, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.address || 'N/A', 100, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Capacidad en kWp:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.capacity || 'N/A', 100, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Cantidad de paneles:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.panelsCount || 'N/A', 100, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Referencia del panel:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.panelRef || 'N/A', 100, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Inversor (Marca-Referencia-Potencia):', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.inverterRef || 'N/A', 100, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Líder técnico en campo:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.leader || 'N/A', 100, yOffset);
      yOffset += spacing;

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha de puesta en marcha:', 20, yOffset);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.date || 'N/A', 100, yOffset);
      yOffset += spacing * 1.5;

      // Lista de evidencias reportadas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Evidencias Registradas:', 20, yOffset);
      yOffset += spacing;
      doc.setFont('helvetica', 'normal');
      
      let photosAdded = 0;
      for (const photo of photos) {
         if (photo.dataUrls.length > 0) {
            photosAdded++;
            doc.setFontSize(11);
            doc.text(`• ${photo.label}`, 25, yOffset);
            yOffset += spacing * 0.6;
            
            // Build text of details + individual notes
            const notesList: string[] = [];
            photo.dataUrls.forEach((it, idx) => {
              if (it.notes) {
                notesList.push(`[Foto ${idx + 1}]: ${it.notes}`);
              }
            });
            if (photo.details) {
              notesList.unshift(`Detalles: ${photo.details}`);
            }

            if (notesList.length > 0) {
               doc.setFontSize(9);
               doc.setTextColor(110, 110, 110);
               const textToPrint = notesList.join(' | ');
               const splitDetails = doc.splitTextToSize(textToPrint, 160);
               doc.text(splitDetails, 30, yOffset);
               yOffset += (splitDetails.length * 4.5) + 3;
               doc.setTextColor(50, 50, 50);
            } else {
               yOffset += 3;
            }
         }
      }

      // Plantilla Overlay (Rotada a retrato y con fotos centradas)
      if (templateDataUrl && photosAdded > 0) {
         doc.addPage();
         try {
            const tImg = await new Promise<HTMLImageElement>((resolve, reject) => {
               const img = new Image();
               img.onload = () => resolve(img);
               img.onerror = reject;
               img.src = templateDataUrl;
            });

            const cvs = document.createElement('canvas');
            const origW = tImg.width;
            const origH = tImg.height;

            // 1. Lienzo en modo horizontal (Landscape original) para componer exacto
            cvs.width = origW;
            cvs.height = origH;
            const ctx = cvs.getContext('2d');

            if (ctx) {
               ctx.drawImage(tImg, 0, 0, origW, origH);

               // Dimensiones de referencia aportadas por el usuario
               const baseW = 1408;
               const baseH = 768;

               // Centros exactos especificados por el usuario en base a 1408x768
               const centers: Record<string, {cx: number, cy: number, w: number, h: number}> = {
                  'cubierta': { cx: 708, cy: 158, w: 220, h: 140 },
                  'inversor': { cx: 208, cy: 295, w: 220, h: 140 },
                  'ac':       { cx: 131, cy: 482, w: 180, h: 130 },
                  'dc':       { cx: 284, cy: 482, w: 180, h: 130 },
                  'spt':      { cx: 682, cy: 645, w: 220, h: 140 },
                  'medidor':  { cx: 1221, cy: 278, w: 220, h: 140 }
               };

               for (const key of Object.keys(centers)) {
                  let imgDataUrl: string | null = null;
                  if (key === 'inversor') {
                     const invIds = ['inversor_placa', 'inversor_funcionando', 'inversor_cno', 'pruebas_voc'];
                     for (const id of invIds) {
                        const p = photos.find(x => x.id === id);
                        if (p && p.dataUrls.length > 0) {
                           imgDataUrl = p.dataUrls[0].url;
                           break;
                        }
                     }
                  } else {
                     const p = photos.find(x => x.id === key);
                     if (p && p.dataUrls.length > 0) {
                        imgDataUrl = p.dataUrls[0].url;
                     }
                  }

                  if (imgDataUrl) {
                     const box = centers[key];
                     const thumbImg = await new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = reject;
                        img.src = imgDataUrl!;
                     });

                     const scaleX = origW / baseW;
                     const scaleY = origH / baseH;

                     const boxW_px = box.w * scaleX;
                     const boxH_px = box.h * scaleY;
                     const centerX = box.cx * scaleX;
                     const centerY = box.cy * scaleY;

                     ctx.save();
                     ctx.translate(centerX, centerY);

                     // No rotar la imagen
                     const rFit = Math.min(boxW_px / thumbImg.width, boxH_px / thumbImg.height);
                     const rw = thumbImg.width * rFit;
                     const rh = thumbImg.height * rFit;

                     // Borde ajustado exactamente al tamaño visual de la foto
                     ctx.lineWidth = Math.max(1.5, origW * 0.002);
                     ctx.strokeStyle = '#1e40af';
                     ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
                     
                     ctx.drawImage(thumbImg, -rw / 2, -rh / 2, rw, rh);
                     ctx.restore();
                  }
               }

               // Generar la imagen final sin rotar (landscape original)
               const finalTemplateDataUrl = cvs.toDataURL('image/jpeg', 0.9);
               
               const pW = doc.internal.pageSize.getWidth();
               const pH = doc.internal.pageSize.getHeight();
               
               const pdfW = pW - 20;
               const pdfH = pH - 50; // Dejar margen para footer
               const tRatio = Math.min(pdfW / origW, pdfH / origH);
               const drawTW = origW * tRatio;
               const drawTH = origH * tRatio;
               const tX = (pW - drawTW) / 2;
               const tY = 15;
               
               doc.addImage(finalTemplateDataUrl, 'JPEG', tX, tY, drawTW, drawTH);

               if (footerDataUrl) {
                  const fProps = doc.getImageProperties(footerDataUrl);
                  const fRatio = pW / fProps.width;
                  doc.addImage(footerDataUrl, 'PNG', 0, pH - (fProps.height * fRatio), pW, fProps.height * fRatio);
               }
            }
         } catch(e) {
            console.error('Error al insertar plantilla compuesta en PDF', e);
         }
      }

      // Photos
      for (const photo of photos) {
        if (photo.dataUrls.length > 0) {
          for (let i = 0; i < photo.dataUrls.length; i++) {
            const item = photo.dataUrls[i];
            const dataUrl = item.url;
            const note = item.notes;
            doc.addPage();
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text(`${photo.label} (${i + 1}/${photo.dataUrls.length})`, 20, 20);
            
            let explanation = '';
            if (note) {
              explanation = `Nota individual: ${note}`;
            } else if (photo.details && i === 0) {
              explanation = `Detalles: ${photo.details}`;
            }

            if (explanation) {
              doc.setFontSize(11);
              doc.setTextColor(50, 50, 50);
              const split = doc.splitTextToSize(explanation, 160);
              doc.text(split, 20, 27);
            }

            const imgProps = doc.getImageProperties(dataUrl);
            const pdfW = doc.internal.pageSize.getWidth() - 40;
            const pdfH = doc.internal.pageSize.getHeight() - 45 - 20; // Espacios para titulo, detalle y footer
            
            const ratio = Math.min(pdfW / imgProps.width, pdfH / imgProps.height);
            const drawW = imgProps.width * ratio;
            const drawH = imgProps.height * ratio;
            
            doc.addImage(dataUrl, 'JPEG', 20, 38, drawW, drawH);

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

      // Signature page
      doc.addPage();
      
      // Header for signatures
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text('Cierre y Firmas de Conformidad', 20, 30);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('En señal de conformidad con la instalación y puesta en marcha del proyecto,', 20, 42);
      doc.text('se disponen los siguientes campos de firma para constancia física de entrega:', 20, 48);

      const sigY = 110; // Y coordinate for the lines to leave plenty of space for handwritten signatures
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);

      // Left: Cliente
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('Por el Cliente:', 25, sigY - 20);

      doc.line(25, sigY, 90, sigY); // Signature line

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text('Firma:', 25, sigY + 6);
      doc.text('Nombre: _________________________________', 25, sigY + 14);
      doc.text('CC: _____________________________________', 25, sigY + 22);

      // Right: Lider Proyectos MasLightSolar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('Por MasLightSolar:', 115, sigY - 20);

      doc.line(115, sigY, 180, sigY); // Signature line

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text('Firma:', 115, sigY + 6);
      doc.text('Líder Proyectos MasLightSolar', 115, sigY + 14);
      doc.text('Nombre: _________________________________', 115, sigY + 22);
      doc.text('CC: _____________________________________', 115, sigY + 30);

      // Add footer to signature page if available
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
          console.warn('Could not add footer on signature page', e);
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
                <label className="text-sm font-semibold text-slate-600">Nombre del proyecto</label>
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
                <label className="text-sm font-semibold text-slate-600">Capacidad en kWp</label>
                <input 
                  type="number" name="capacity" value={projectInfo.capacity} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: 5.4"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Cantidad de paneles</label>
                <input 
                  type="number" name="panelsCount" value={projectInfo.panelsCount || ''} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: 10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Referencia del panel</label>
                <input 
                  type="text" name="panelRef" value={projectInfo.panelRef} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: Jinko-550W"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Inversor (Marca-Referencia-Potencia)</label>
                <input 
                  type="text" name="inverterRef" value={projectInfo.inverterRef} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: Fronius-Symo-5.0kW"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Líder técnico en campo</label>
                <input 
                  type="text" name="leader" value={projectInfo.leader} onChange={handleInfoChange}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Nombre del ingeniero"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">Fecha de puesta en marcha</label>
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
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {photo.dataUrls.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="relative rounded overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={item.url} alt={`${photo.label} ${idx + 1}`} className="w-full h-24 sm:h-32 object-cover" />
                            <button
                              onClick={() => removePhoto(photo.id, idx)}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded hover:scale-110 active:scale-95 transition-all text-xs z-10"
                              title="Eliminar foto"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleIndividualNoteChange(photo.id, idx, e.target.value)}
                            placeholder={`Nota para Foto ${idx + 1}...`}
                            className="w-full text-xs border border-slate-300 rounded p-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <textarea
                        value={photo.details || ''}
                        onChange={(e) => handleDetailsChange(photo.id, e.target.value)}
                        placeholder="Detalles adicionales (Marca, Modelo, etc)..."
                        className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        rows={2}
                      />
                    </div>
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
