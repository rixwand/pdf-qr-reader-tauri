import { Button, Popover, Spinner } from "@heroui/react";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { QrCodeResult } from "../lib/scanPdfQrs";
import { FileEntry } from "../types/file";
import CopyableCodeBlock from "./CopyableCodeBlock";

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
              <CopyableCodeBlock overflowing="wrapped" slim key={index}>
                {qr.text}
              </CopyableCodeBlock>
            ))}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
