import QRCode from "qrcode";

export interface QrOptions { size?: number; margin?: number; dark?: string; light?: string }

const opts = (o: QrOptions = {}) => ({
  errorCorrectionLevel: "H" as const,
  margin: o.margin ?? 2,
  width: Math.min(Math.max(o.size ?? 1024, 128), 4096),
  color: { dark: o.dark ?? "#000000", light: o.light ?? "#FFFFFF" },
});

export const qrPng = (text: string, o?: QrOptions): Promise<Buffer> =>
  QRCode.toBuffer(text, { type: "png", ...opts(o) });

export const qrSvg = (text: string, o?: QrOptions): Promise<string> =>
  QRCode.toString(text, { type: "svg", ...opts(o) });

export const qrDataUrl = (text: string, o?: QrOptions): Promise<string> =>
  QRCode.toDataURL(text, opts(o));
