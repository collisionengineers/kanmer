import { ActivityPanel, KanmerProvider, createDemoClient } from "@kanmer/ui";
import "./frame.module.css";

/** The activity slide-over, newest first: creates, moves, takes, doc writes — click a row to reveal the item. */
export const Recent = () => (
  <div style={{ height: 520, display: "flex" }}>
    <ActivityPanel refreshSignal={0} onSelect={() => {}} onClose={() => {}} />
  </div>
);

const quiet = createDemoClient({ activity: [] });

/** A project with no activity yet. */
export const Empty = () => (
  <KanmerProvider client={quiet}>
    <div style={{ height: 240, display: "flex" }}>
      <ActivityPanel refreshSignal={0} onSelect={() => {}} onClose={() => {}} />
    </div>
  </KanmerProvider>
);
