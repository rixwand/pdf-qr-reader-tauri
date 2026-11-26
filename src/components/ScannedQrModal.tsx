import { Button, Key, Modal, Selection, Spinner, Tabs, UseOverlayStateReturn } from "@heroui/react";
import { LayoutList, QrCode, SquareSplitHorizontal, SquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import { QrCodeResult } from "../lib/scanPdfQrs";
import { FileEntry } from "../types/file";
import CopyableCodeBlock from "./CopyableCodeBlock";

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
  const [selectedTab, setSelectedTab] = useState<Key>("joined");
  const [rawData, setRawData] = useState<Map<string, QrCodeResult[]>>(new Map());
  const [splittedData, setSplittedData] = useState<string[][]>([]);
  useEffect(() => {
    const next = new Map<string, QrCodeResult[]>();

    const keys = selectedKeys === "all" ? files.map(f => f.name) : [...selectedKeys].map(String);

    for (const key of keys) {
      const value = scanned.get(key);
      if (value) next.set(key, value);
    }

    setRawData(next);

    const values = [...next.values()];
    const maxLength = Math.max(0, ...values.map(v => v.length));

    const newSplitted: string[][] = Array.from({ length: maxLength }, (_, i) =>
      values.map(v => v[i]?.text).filter((text): text is string => text !== undefined),
    );

    setSplittedData(newSplitted);
    console.log({ selectedKeys, scanned, files, rawData, splittedData });
  }, [selectedKeys, scanned, files]);
  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable={!scanning} isKeyboardDismissDisabled={scanning} variant="blur">
        <Modal.Container placement="top">
          <Modal.Dialog role={scanning ? "alertdialog" : "dialog"} className=" w-fit min-w-lg max-w-[90vw]">
            {!scanning && <Modal.CloseTrigger aria-label="Close QR code results" />}
            {!scanning && (
              <Modal.Header>
                <Modal.Icon className="bg-default text-foreground">
                  <QrCode className="size-5" />
                </Modal.Icon>
                <Modal.Heading>
                  <div className="flex justify-between items-center">
                    <h1>Isi Kode QR</h1>
                    <span>
                      <Tabs selectedKey={selectedTab} onSelectionChange={setSelectedTab}>
                        <Tabs.ListContainer>
                          <Tabs.List aria-label="Navigation" className="gap-1 p-0.5">
                            <Tabs.Tab
                              id="joined"
                              className="h-8 w-8 min-w-0 p-0 flex items-center justify-center rounded-lg">
                              <SquareText size={16} />
                              <Tabs.Indicator />
                            </Tabs.Tab>
                            <Tabs.Tab
                              id="split"
                              className="h-8 w-8 min-w-0 p-0 flex items-center justify-center rounded-lg">
                              <SquareSplitHorizontal size={16} />
                              <Tabs.Indicator />
                            </Tabs.Tab>
                            <Tabs.Tab
                              id="show-filename"
                              className="h-8 w-8 min-w-0 p-0 flex items-center justify-center rounded-lg">
                              <LayoutList size={16} />
                              <Tabs.Indicator />
                            </Tabs.Tab>
                          </Tabs.List>
                        </Tabs.ListContainer>
                      </Tabs>
                    </span>
                  </div>
                </Modal.Heading>
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
              ) : selectedTab == "split" ? (
                <div className="flex gap-x-2">
                  {splittedData.map(row => (
                    <CopyableCodeBlock>{row.join("\n")}</CopyableCodeBlock>
                  ))}
                </div>
              ) : selectedTab == "show-filename" ? (
                <div className="space-y-1.5">
                  {[...rawData.entries()].map(([filename, qrCodes]) => (
                    <div key={filename}>
                      <h3>{filename}</h3>
                      <div className="space-y-1">
                        {qrCodes.map((qr, index) => (
                          <CopyableCodeBlock slim key={index}>
                            {qr.text}
                          </CopyableCodeBlock>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <CopyableCodeBlock>
                  {[...rawData.values()].flatMap(qrCodes => qrCodes.map(qr => qr.text)).join("\n")}
                </CopyableCodeBlock>
              )}
            </Modal.Body>
            {!scanning && (
              <Modal.Footer>
                <Button className={"dark:bg-cyan-600"} slot="close">
                  Tutup
                </Button>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
