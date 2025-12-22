import React from 'react';

interface IzaraLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const IzaraLogo: React.FC<IzaraLogoProps> = ({ 
  className = '', 
  width = 60, 
  height = 20 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/components/icons/IzaraLogo.png" 
        alt="Izara Anywhere" 
        width={width}
        height={height}
        className="object-contain"
        onError={(e) => {
          // Fallback to text if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      <div 
        className="hidden text-2xl font-bold text-emerald-600"
        style={{ display: 'none' }}
      >
        <span className="text-blue-900">Izara</span>
        <span className="text-emerald-500"> Anywhere</span>
      </div>
    </div>
  );
};