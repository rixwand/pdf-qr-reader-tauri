import { Key, Tabs } from "@heroui/react";
import { useState } from "react";
import CopyableCodeBlock from "./CopyableCodeBlock";

export default function SplittedQrResult({ result }: { result: string[][] }) {
  const [selectedTab, setSelectedTab] = useState<Key>("1");
  return (
    <Tabs selectedKey={selectedTab} onSelectionChange={setSelectedTab}>
      <Tabs.ListContainer className="w-fit">
        <Tabs.List aria-label="Navigation" className="gap-1 p-0.5">
          {Array.from({ length: result.length }, (_, i) => i + 1).map(v => (
            <Tabs.Tab id={v.toString()} className="h-8 w-8 min-w-0 p-0 flex items-center justify-center rounded-lg">
              {v.toString()}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {result.map((txt, i) => (
          <Tabs.Panel id={(i + 1).toString()}>
            <CopyableCodeBlock>{txt.join("\n")}</CopyableCodeBlock>
          </Tabs.Panel>
        ))}
      </Tabs.ListContainer>
    </Tabs>
  );
  return;
}
