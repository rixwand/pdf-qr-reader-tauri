import { Button, Code, Popover, Spinner, toast } from "@heroui/react";
import { ClipboardCheck, Copy, QrCode } from "lucide-react";
import { useState } from "react";
import { QrCodeResult } from "../lib/scanPdfQrs";
import { FileEntry } from "../types/file";

export default function ScanButton({
  scanned,
  handleScanQr,
  file,
}: {
  scanned: Map<string, QrCodeResult[]>;
  handleScanQr: (path: string) => Promise<void>;
  file: FileEntry;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [scanState, setscanState] = useState<"idle" | "scanning" | "scanned" | "failed">("idle");

  const handleScan = async () => {
    if (scanned.has(file.name)) {
      setscanState("scanned");
      setIsOpen(true);
      return;
    }

    setscanState("scanning");

    try {
      await handleScanQr(file.path);

      if (scanned.has(file.name)) {
        setscanState("scanned");
        setIsOpen(true);
      } else {
        setscanState("failed");
      }
    } catch (error) {
      setscanState("failed");
      console.error(error);
    }
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        isDisabled={scanState === "scanning"}
        aria-label={`Scan QR codes in ${file.name}`}
        size="sm"
        isIconOnly
        onPress={handleScan}
        variant="secondary">
        {scanState === "scanning" ? <Spinner /> : <QrCode className="size-4" />}
      </Button>

      <Popover.Content className="max-w-3xl" placement="right">
        <Popover.Dialog>
          <Popover.Arrow />
          <Popover.Heading>Menemukan {scanned.get(file.name)?.length} Kode QR</Popover.Heading>

          <div className="flex flex-col gap-y-1">
            {scanned.get(file.name)?.map((qr, index) => (
              <Code key={index} className="flex justify-between gap-x-3 py-1.5 px-2">
                {qr.text}
                <button
                  aria-label={`Copy QR code from ${file.name}`}
                  onClick={() => {
                    navigator.clipboard.writeText(qr.text);
                    toast("Text Disalin", {
                      indicator: <ClipboardCheck size={18} />,
                    });
                  }}>
                  <Copy size={14} />
                </button>
              </Code>
            ))}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
