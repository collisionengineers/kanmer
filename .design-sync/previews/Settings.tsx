import { Settings, demoBoard, demoItems } from "@kanmer/ui";
import "./frame.module.css";

const noop = () => {};

/** The Settings dialog on its Board tab: stage / area / priority column editors with usage counts. Other tabs: Documents, Appearance, Git, Connect. */
export const BoardTab = () => (
  <div style={{ height: 700 }}>
    <Settings
      board={demoBoard}
      items={demoItems}
      theme="dark"
      notifications={true}
      preferences={{ cardDensity: "comfortable", confirmOnDelete: true, defaultPriority: "medium", defaultArea: "" }}
      onSaveBoard={async () => {}}
      onSetTheme={noop}
      onSetNotifications={noop}
      onSetPreferences={noop}
      onClose={noop}
    />
  </div>
);
