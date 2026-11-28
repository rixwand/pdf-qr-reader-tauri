import {
  Calendar,
  Checkbox,
  DateField,
  DatePicker,
  EmptyState,
  Input,
  Selection,
  SortDescriptor,
  Table,
  TableLayout,
  Virtualizer,
  cn,
  toast,
  useOverlayState,
} from "@heroui/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { FolderOpen, Inbox, ScanQrCode, Search, SlidersHorizontal, X } from "lucide-react";

import { getLocalTimeZone, type CalendarDate } from "@internationalized/date";
import { useMemo, useState } from "react";

import { path } from "@tauri-apps/api";
import { QrCodeResult, scanPdfQrs } from "../lib/scanPdfQrs";
import type { FileEntry, ScanOptions } from "../types/file";
import ScanButton from "./ScanButton";
import ScannedQrModal from "./ScannedQrModal";

function formatFileSize(size: number | null) {
  if (size === null) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModifiedDate(timestamp: number | null) {
  if (timestamp === null) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function DirectoryScanner() {
  const [directory, setDirectory] = useState("");
  const modalState = useOverlayState({ defaultOpen: false });
  const extensions = "pdf";
  const [fileName, setFileName] = useState("");
  const [modifiedAfter, setModifiedAfter] = useState<CalendarDate | null>(null);
  const [modifiedBefore, setModifiedBefore] = useState<CalendarDate | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [scanned, setScanned] = useState<Map<string, QrCodeResult[]>>(() => new Map());
  const [scanningMultiple, setScanningMultiple] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  async function selectDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (typeof selected !== "string") return;

    setDirectory(selected);
    setFiles([]);
    setError("");
  }

  function clearDirectory() {
    setDirectory("");
    setFiles([]);
    setError("");
  }

  async function showFiles() {
    if (!directory) return;

    setLoading(true);
    setError("");

    try {
      const options: ScanOptions = {
        path: directory,
        name: fileName.trim() || undefined,
        extensions: extensions
          .split(",")
          .map(extension => extension.trim())
          .filter(Boolean),
        modifiedAfter: modifiedAfter ? modifiedAfter.toDate(getLocalTimeZone()).getTime() : undefined,
        modifiedBefore: modifiedBefore
          ? modifiedBefore.add({ days: 1 }).toDate(getLocalTimeZone()).getTime() - 1
          : undefined,
      };

      setFiles(await invoke<FileEntry[]>("scan_directory", { options }));
    } catch (scanError) {
      setError(String(scanError));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleScanQr(filePath: string) {
    try {
      const pdfData = await readFile(filePath);
      const qrCodes = await scanPdfQrs(pdfData);
      const fileName = await path.basename(filePath);
      console.log("Array splitted path :", fileName);
      setScanned(current => {
        const next = new Map(current);
        next.set(fileName, qrCodes);
        return next;
      });
    } catch (scanError) {
      toast.danger(`Unable to scan QR codes: ${String(scanError)}`);
    }
  }

  async function handleScanSelectedFile() {
    modalState.open();
    setScanningMultiple(true);
    if (selectedKeys == "all") {
      for (const file of files) {
        if (scanned.has(file.name)) continue;
        await handleScanQr(file.path);
      }
    } else {
      for (let key of selectedKeys) {
        const file = files.find(f => f.name == key);
        if (!file) continue;
        if (scanned.has(file.name)) continue;
        await handleScanQr(file.path);
      }
    }
    setScanningMultiple(false);
  }

  const sortedItems = useMemo(() => {
    return [...files].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof FileEntry];
      const second = b[sortDescriptor.column as keyof FileEntry];
      let cmp = 0;
      if (typeof first === "number" && typeof second === "number") {
        cmp = first - second;
      } else {
        cmp = String(first).localeCompare(String(second));
      }
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, files]);

  return (
    <section className="w-full space-y-4 text-left">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={selectDirectory}
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600">
            Pilih Folder <FolderOpen size={18} aria-hidden="true" />
          </button>

          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300" title={directory || undefined}>
              {directory || "Belum ada folder dipilih"}
            </p>
            {directory && (
              <button
                type="button"
                onClick={clearDirectory}
                className="shrink-0 rounded text-slate-500 transition hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:text-slate-300 dark:hover:text-white"
                aria-label="Hapus folder yang dipilih">
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
          <SlidersHorizontal size={18} aria-hidden="true" />
          Filter pencarian
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200 w-60">
            <span>Nama File</span>
            <Input
              aria-label="Filter files by name"
              fullWidth
              className={
                "rounded-lg border border-slate-300 bg-white text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-400 h-9"
              }
              value={fileName}
              onChange={event => setFileName(event.target.value)}
              placeholder="Ketik nama file"
            />
          </label>
          <div className="flex flex-col text-sm font-medium text-slate-700 dark:text-slate-200 w-60">
            <span>Diubah setelah</span>
            <DatePicker aria-label="Modified after date" value={modifiedAfter} onChange={setModifiedAfter}>
              <DateField.Group
                fullWidth
                className={
                  " rounded-lg border border-slate-300 bg-white text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-400"
                }>
                <DateField.Input>{segment => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateField.Suffix>
                  <DatePicker.Trigger aria-label="Choose modified-after date" className="text-muted">
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DatePicker.Popover>
                <Calendar>
                  <Calendar.Header>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.Heading />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>{day => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
                    <Calendar.GridBody>{date => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar>
              </DatePicker.Popover>
            </DatePicker>
          </div>
          <div className="flex flex-col text-sm font-medium text-slate-700 dark:text-slate-200 w-60">
            <span>Diubah sebelum</span>
            <DatePicker
              aria-label="Modified before date"
              value={modifiedBefore}
              onChange={setModifiedBefore}
              className="w-full">
              <DateField.Group
                fullWidth
                className={
                  " rounded-lg border border-slate-300 bg-white text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-400"
                }>
                <DateField.Input>{segment => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateField.Suffix>
                  <DatePicker.Trigger aria-label="Choose modified-before date" className="text-muted">
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DatePicker.Popover>
                <Calendar>
                  <Calendar.Header>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.Heading />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>{day => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
                    <Calendar.GridBody>{date => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar>
              </DatePicker.Popover>
            </DatePicker>
          </div>
          <button
            type="button"
            disabled={!directory || loading}
            onClick={showFiles}
            className="inline-flex h-fit mt-auto ml-1 w-fit items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 dark:disabled:border-slate-600 dark:disabled:bg-slate-700">
            {loading ? "Memindai..." : "Tampilkan"} <Search size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={selectedKeys != "all" && selectedKeys.size == 0}
            onClick={handleScanSelectedFile}
            className="inline-flex h-fit mt-auto ml-auto w-fit items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 dark:disabled:border-slate-600 dark:disabled:bg-slate-700">
            {loading ? "Memindai..." : "Scan"} <ScanQrCode size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <Virtualizer
        layout={TableLayout}
        layoutOptions={{
          rowHeight: 48,
          headingHeight: 40,
        }}>
        <Table className="bg-transparent">
          <Table.ScrollContainer className="border border-slate-300 shadow-sm dark:border-slate-700 rounded-2xl">
            <Table.Content
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
              aria-label="File list table"
              className="min-w-150 h-[calc(100vh-20rem)] overflow-auto"
              selectedKeys={selectedKeys}
              selectionMode="multiple"
              onSelectionChange={setSelectedKeys}>
              <Table.Header className={"bg-slate-100 dark:bg-slate-800 h-full w-full"}>
                <Table.Column maxWidth={30}>
                  <Checkbox aria-label="Select all" slot="selection" id="custom">
                    <Checkbox.Content>
                      <Checkbox.Control className="dark:bg-slate-600">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                </Table.Column>
                <Table.Column isRowHeader allowsSorting id={"name"}>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>Nama</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column isRowHeader allowsSorting id={"modifiedAt"}>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>Diubah</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column>Ukuran</Table.Column>
                <Table.Column className={"pe-0"} maxWidth={150}>
                  Aksi
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <EmptyState className="flex h-full w-full dark:bg-slate-900 bg-slate-50 flex-col items-center justify-center gap-4 text-center">
                    <Inbox className="size-6 text-muted" />
                    <span className="text-sm text-muted">No results found</span>
                  </EmptyState>
                )}
                className={"rounded-none dark:bg-cyan-700 bg-cyan-600"}>
                {sortedItems.map(file => (
                  <Table.Row key={file.name} id={file.name}>
                    <Table.Cell className={cn("cell")}>
                      <Checkbox id="custom" aria-label={`Select ${file.name}`} slot="selection">
                        <Checkbox.Content>
                          <Checkbox.Control className="dark:bg-slate-600">
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                    </Table.Cell>
                    <Table.Cell
                      className={cn(
                        "cell",
                        selectedKeys === "all" || (selectedKeys as Set<string>).has(file.name) ? "text-white" : "",
                      )}>
                      {file.name}
                    </Table.Cell>
                    <Table.Cell
                      className={cn(
                        "cell",
                        selectedKeys === "all" || (selectedKeys as Set<string>).has(file.name) ? "text-white" : "",
                      )}>
                      {formatModifiedDate(file.modifiedAt)}
                    </Table.Cell>
                    <Table.Cell
                      className={cn(
                        "cell",
                        selectedKeys === "all" || (selectedKeys as Set<string>).has(file.name) ? "text-white" : "",
                      )}>
                      {formatFileSize(file.size)}
                    </Table.Cell>
                    <Table.Cell className={cn("cell flex items-center gap-2 p-0 pl-3")}>
                      <ScanButton {...{ file, scanned, handleScanQr }} key={file.name} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Virtualizer>
      <ScannedQrModal {...{ state: modalState, scanned, files, selectedKeys, scanning: scanningMultiple }} />
    </section>
  );
}
