import QRCode from "qrcode";

export async function toDataURL(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "Q",
      margin: 1,
      width: 128,
      color: { 
        light: "#ffffff", 
        dark: "#2563eb" 
      }
    });
  } catch (error) {
    console.error('QR code generation failed:', error);
    return null;
  }
}

export function generateMapLink(locationText: string): string {
  const cleanText = locationText.replace(/^\d{2}:\d{2}\s*[-–]\s*/, ''); // Remove time prefix
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanText)}`;
}