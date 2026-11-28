import { Button, cn } from "@heroui/react";
import { Check, Copy } from "lucide-react";
import { ReactNode, useRef, useState } from "react";

export default function CopyableCodeBlock({
  children,
  overflowing = "scroll",
  slim = false,
}: {
  children: ReactNode;
  slim?: boolean;
  wrapped?: boolean;
  overflowing?: "scroll" | "wrapped" | "folded";
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeRef.current?.textContent ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className={cn(
        "relative group rounded-lg bg-neutral-200 dark:bg-slate-700/50 border border-default-200",
        slim ? "p-1" : "p-4",
      )}>
      {/* Corner Copy Button */}
      <div className={cn("absolute", slim ? "top-0 right-1" : "top-2 right-2")}>
        <Button
          size="sm"
          className={
            "text-neutral-700 dark:text-slate-300 data-[focus-visible=true]:ring-offset-0 data-[focus-visible=true]:ring-0"
          }
          variant="ghost"
          isIconOnly
          aria-label="Copy code"
          onPress={handleCopy}>
          {copied ? <Check size={24} /> : <Copy size={24} />}
        </Button>
      </div>

      {/* Multiline Code Surface */}
      <pre
        className={cn(
          overflowing == "wrapped"
            ? "whitespace-pre-wrap wrap-break-word"
            : overflowing == "folded"
              ? "text-ellipsis overflow-x-hidden text-nowrap"
              : "overflow-x-auto",
          "font-mono text-sm leading-relaxed pr-10 dark:text-slate-300 text-neutral-800",
        )}>
        <code ref={codeRef}>{children}</code>
      </pre>
    </div>
  );
}
