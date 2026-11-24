import { Button, Code, Modal, Selection, Spinner, UseOverlayStateReturn } from "@heroui/react";
import { QrCode } from "lucide-react";
import { Fragment } from "react/jsx-runtime";
import { QrCodeResult } from "../lib/scanPdfQrs";
import { FileEntry } from "../types/file";

export default function ScannedQrModal({
  state,
  files,
  scanned,
  selectedKeys,
  scanning,
}: {
  state: UseOverlayStateReturn;
  selectedKeys: Selection;
  files: FileEntry[];
  scanned: Map<string, QrCodeResult[]>;
  scanning: boolean;
}) {
  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable={!scanning} isKeyboardDismissDisabled={scanning} variant="blur">
        <Modal.Container placement="center" size={scanning ? "xs" : "lg"}>
          <Modal.Dialog role={scanning ? "alertdialog" : "dialog"}>
            {!scanning && <Modal.CloseTrigger aria-label="Close QR code results" />}
            {!scanning && (
              <Modal.Header>
                <Modal.Icon className="bg-default text-foreground">
                  <QrCode className="size-5" />
                </Modal.Icon>
                <Modal.Heading>Isi Kode QR</Modal.Heading>
              </Modal.Header>
            )}
            <Modal.Body className={scanning ? "flex flex-col items-center justify-center gap-3 py-6 text-center" : ""}>
              {scanning ? (
                <Fragment>
                  <Spinner size="xl" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Memindai Kode QR...</p>
                    <p className="text-sm text-muted">Silahkan tunggu</p>
                  </div>
                </Fragment>
              ) : (
                <Code className="whitespace-pre-wrap">
                  {JSON.stringify(
                    selectedKeys == "all"
                      ? files.map(f => scanned.get(f.name))
                      : [...selectedKeys].map(key => scanned.get(key as string)),
                    null,
                    2,
                  )}
                </Code>
              )}
            </Modal.Body>
            {!scanning && (
              <Modal.Footer>
                <Button slot="close">Tutup</Button>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
