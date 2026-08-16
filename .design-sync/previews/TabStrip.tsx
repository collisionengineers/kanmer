import { useState } from "react";
import { TabStrip } from "@kanmer/ui";
import type { Tab } from "@kanmer/ui";
import "./frame.module.css";

const tabs: Tab[] = [
  { projectId: "C:/work/kanmer", root: "C:/work/kanmer", name: "kanmer", unread: 0 },
  { projectId: "C:/work/acme-api", root: "C:/work/acme-api", name: "acme-api", unread: 3 },
  { projectId: "C:/work/site", root: "C:/work/site", name: "site", unread: 0 },
];
const noop = () => {};

/** Three open projects: the active tab carries the unsaved-edits dot, a background tab an unread dot. */
export const ThreeProjects = () => {
  const [active, setActive] = useState("C:/work/kanmer");
  return (
    <div className="topbar" style={{ width: 620 }}>
      <span className="brand">Kanmer</span>
      <TabStrip tabs={tabs} activeId={active} dirty={true} onSelect={setActive} onClose={noop} onNew={noop} />
    </div>
  );
};

/** One project, nothing pending. */
export const SingleProject = () => (
  <div className="topbar" style={{ width: 620 }}>
    <span className="brand">Kanmer</span>
    <TabStrip tabs={tabs.slice(0, 1)} activeId="C:/work/kanmer" dirty={false} onSelect={noop} onClose={noop} onNew={noop} />
  </div>
);
