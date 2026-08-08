import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function QrPreview({ value, size = 180, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: "H", margin: 2, width: size * 2 })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(""));
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div className={cn("rounded-lg bg-white p-2", className)} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={`QR code for ${value}`} width={size} height={size} className="h-full w-full" />
      ) : (
        <div className="h-full w-full animate-pulse rounded bg-muted" />
      )}
    </div>
  );
}
