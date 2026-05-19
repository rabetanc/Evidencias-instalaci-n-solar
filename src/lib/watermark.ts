export async function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
       applyWatermark(file, null, null, resolve, reject);
       return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyWatermark(file, position.coords.latitude, position.coords.longitude, resolve, reject);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        applyWatermark(file, null, null, resolve, reject);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

function applyWatermark(
  file: File,
  lat: number | null,
  lng: number | null,
  resolve: (url: string) => void,
  reject: (err: any) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      ctx.drawImage(img, 0, 0);

      // Determine responsive font size for watermark
      const fontSize = Math.max(32, Math.floor(img.height / 30));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#facc15'; // yellow-400 (good contrast on dark backgrounds)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(2, Math.floor(fontSize / 6));
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'right';

      const dateStr = new Date().toLocaleString('es-CO');
      const geoStr = lat && lng ? `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}` : 'Ubicación GPS no disponible';

      const padding = Math.floor(fontSize * 0.8);
      const x = img.width - padding;
      let y = img.height - padding;

      // Draw from bottom to top
      const lines = [geoStr, dateStr, 'Evidencia: Proyecto Solar'];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        ctx.strokeText(line, x, y);
        ctx.fillText(line, x, y);
        y -= (fontSize + 10);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    if (e.target?.result) {
      img.src = e.target.result as string;
    } else {
      reject(new Error('Filed loading read error'));
    }
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
}
