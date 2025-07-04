"use client";
import { QRCodeCanvas } from "qrcode.react";

interface QRCodeRendererProps {
  text: string;
  size?: number;
  className?: string;
}

export default function QRCodeRenderer({ 
  text, 
  size = 64, 
  className = "" 
}: QRCodeRendererProps) {
  if (!text) return null;
  
  return (
    <div className={`flex-shrink-0 ${className}`}>
      <QRCodeCanvas
        value={text}
        size={size}
        bgColor="#ffffff"
        fgColor="#2563eb"
        level="Q"
        includeMargin
        className="rounded border border-gray-200"
      />
    </div>
  );
}