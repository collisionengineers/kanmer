import { Welcome } from "@kanmer/ui";
import "./frame.module.css";

const noop = () => {};
const recents = ["C:/work/kanmer", "C:/work/acme-api", "D:/oss/site"];

/** First run — the empty welcome screen. It fills its parent, so give it a height. */
export const FirstRun = () => (
  <div style={{ height: 360 }}>
    <Welcome recentProjects={[]} onPick={noop} onOpen={noop} error={null} />
  </div>
);

/** With recent projects listed under the primary action. */
export const WithRecents = () => (
  <div style={{ height: 420 }}>
    <Welcome recentProjects={recents} onPick={noop} onOpen={noop} error={null} />
  </div>
);

/** An open that failed: the error line under the recents; `opening` disables the buttons while a folder loads. */
export const OpenFailed = () => (
  <div style={{ height: 420 }}>
    <Welcome
      recentProjects={recents}
      onPick={noop}
      onOpen={noop}
      error="D:/oss/site is not a folder (was it moved?)"
      opening={false}
    />
  </div>
);
