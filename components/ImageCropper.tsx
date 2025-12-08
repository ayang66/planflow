
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Maximize, Move } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface ImageCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onCrop: (croppedImage: string) => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCancel, onCrop }) => {
  const { themeColor } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Calculate screen aspect ratio to make the crop box match the device
  const [aspectRatio, setAspectRatio] = useState(9/16);

  useEffect(() => {
    setAspectRatio(window.innerWidth / window.innerHeight);
  }, []);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); 
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const generateCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    // Set high resolution output based on screen size
    const screenWidth = window.innerWidth * window.devicePixelRatio;
    const screenHeight = window.innerHeight * window.devicePixelRatio;
    
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = imageRef.current;
    
    // The "crop box" in the UI is centered. We need to calculate what part of the image is inside that box.
    // However, a simpler way is to emulate the CSS transform on the canvas.
    
    // 1. Calculate the scale difference between the UI element and the actual canvas
    // We assume the crop area in UI is roughly 70% width of the viewport, height determined by aspect ratio.
    const cropBoxWidth = containerRef.current.clientWidth;
    const cropBoxHeight = containerRef.current.clientHeight;
    
    const scaleFactorX = screenWidth / cropBoxWidth;
    const scaleFactorY = screenHeight / cropBoxHeight;
    // Use the larger scale factor to cover
    const scaleFactor = Math.max(scaleFactorX, scaleFactorY); // Actually we want to map UI pixels to Canvas pixels

    ctx.save();
    
    // Move to center of canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Apply the same transforms as the CSS, but scaled up to canvas resolution
    // CSS Offset is in UI pixels. Zoom is a multiplier.
    // The image's natural size vs display size matters too.
    
    // Let's rely on the visual calculation:
    // The image is displayed with transform: translate(offset.x, offset.y) scale(zoom)
    // relative to the center of the crop box.
    
    ctx.translate(offset.x * scaleFactorX, offset.y * scaleFactorY);
    ctx.scale(zoom, zoom);
    
    // Draw image centered
    // We need to draw it at its intrinsic size, centered
    ctx.drawImage(img, -img.naturalWidth / 2 * (cropBoxWidth / img.naturalWidth) * (img.naturalWidth / cropBoxWidth), -img.naturalHeight / 2);
    
    // Wait, the drawing logic needs to match the CSS 'object-fit' behavior if we were using it, 
    // but we are using explicit transforms.
    
    // Correct Approach:
    // The image is rendered in DOM. We need to map that DOM state to Canvas.
    
    // 1. Get image rendered dimensions
    const renderedWidth = img.naturalWidth; // It's unstyled in dimensions, manipulated by transform
    const renderedHeight = img.naturalHeight;
    
    // Actually, in the CSS below, I will constrain the image to "max-width: 100%" of container? No, allowing free float.
    // Let's assume the image is rendered at its natural size * zoom, offset by offset.
    
    // To make this robust across resolutions, let's draw the image scaled to fit the canvas width initially, then apply user transforms.
    const initialScale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    
    ctx.scale(initialScale, initialScale); // Scale to 'cover' initially
    
    // Now apply user tweaks
    // User offset is in pixels relative to the small view. 
    // User zoom is relative to the "1.0" state which we need to define.
    // Let's define Zoom 1.0 as "Natural Size" in CSS? No, that's too big usually.
    // Let's Define Zoom 1.0 as "Cover".
    
    ctx.restore();
    
    // RE-STRATEGY: Simplified WYSIWYG
    // We can just draw the image onto the canvas using the computed styles.
    
    // 1. Clear context
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    // 2. Center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // 3. Move by offset (scaled up)
    // The container in UI is e.g. 300px wide. The canvas is 1080px wide. Ratio ~ 3.6.
    const uiRatio = canvas.width / cropBoxWidth;
    ctx.translate(offset.x * uiRatio, offset.y * uiRatio);
    
    // 4. Zoom
    ctx.scale(zoom, zoom);
    
    // 5. Draw Image. 
    // We want the image to "Cover" the canvas when Zoom is 1 and Offset is 0.
    // Calculate scale needed to cover
    const scaleToCover = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    ctx.scale(scaleToCover, scaleToCover);
    
    // 6. Draw centered
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    
    onCrop(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <button onClick={onCancel} className="p-2 bg-white/10 rounded-full text-white">
          <X className="w-6 h-6" />
        </button>
        <span className="text-white font-bold">Adjust Background</span>
        <button onClick={generateCrop} className={`p-2 bg-${themeColor}-600 rounded-full text-white`}>
          <Check className="w-6 h-6" />
        </button>
      </div>

      {/* Crop Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900"
           onMouseDown={handlePointerDown}
           onMouseMove={handlePointerMove}
           onMouseUp={handlePointerUp}
           onMouseLeave={handlePointerUp}
           onTouchStart={handlePointerDown}
           onTouchMove={handlePointerMove}
           onTouchEnd={handlePointerUp}
      >
        {/* The Frame (Visual Guide) */}
        <div 
            ref={containerRef}
            className="relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-2 border-white/50 pointer-events-none z-10"
            style={{
                width: '75%',
                aspectRatio: `${aspectRatio}`,
                maxHeight: '80vh'
            }}
        >
             {/* Grid Lines */}
             <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                 <div className="border-r border-white/50"></div>
                 <div className="border-r border-white/50"></div>
                 <div className="border-r border-transparent"></div>
                 <div className="border-b border-white/50 col-span-3 row-start-1"></div>
                 <div className="border-b border-white/50 col-span-3 row-start-2"></div>
             </div>
        </div>

        {/* The Image (Behind the frame/shadow, but moved by transforms) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* We apply the transform to this wrapper or the image directly. 
                Crucially, we want Zoom 1.0 to mean "Cover the Crop Box".
                Since the image container is full screen, we need to size the image to cover the crop box.
            */}
             <img 
                ref={imageRef}
                src={imageSrc}
                alt="Crop Target"
                className="max-w-none transition-transform duration-75 ease-out select-none"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    // Initial sizing: roughly cover screen to start
                    minWidth: '100%',
                    minHeight: '100%',
                    objectFit: 'cover'
                }}
            />
        </div>
        
        {/* Helper Text */}
        <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none z-20 text-white/50 text-xs font-medium flex items-center justify-center gap-2">
            <Move className="w-3 h-3" />
            <span>Drag to move</span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-slate-900 border-t border-white/10">
         <div className="flex items-center gap-4">
            <Maximize className="w-5 h-5 text-slate-400" />
            <input 
              type="range"
              min="0.5"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-${themeColor}-500`}
            />
            <span className="text-white text-sm w-8 text-right">{Math.round(zoom * 100)}%</span>
         </div>
      </div>
    </div>
  );
};
