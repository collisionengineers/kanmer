import { KanmerProvider, Standup, createDemoClient, demoBoard, demoItems } from "@kanmer/ui";
import "./frame.module.css";

/** The human's standup over a mid-sprint board: in-flight work, blockers, recent activity — the same report the `kanmer-standup` skill prints. */
export const Report = () => (
  <Standup board={demoBoard} items={demoItems} projectName="kanmer" changeSignal={0} onSelect={() => {}} />
);

const emptyClient = createDemoClient({ items: [], activity: [] });

/** An empty board has nothing to say. */
export const QuietBoard = () => (
  <KanmerProvider client={emptyClient}>
    <Standup board={demoBoard} items={[]} projectName="new-project" changeSignal={0} onSelect={() => {}} />
  </KanmerProvider>
);
