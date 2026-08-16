import { TicketCreate, demoBoard, demoItems } from "@kanmer/ui";
import "./frame.module.css";

const create = async () => null;

/** The full add-ticket dialog: every CreateItemInput field plus the governing-docs row. */
export const NewTicket = () => (
  <div style={{ height: 740 }}>
    <TicketCreate board={demoBoard} items={demoItems} onClose={() => {}} onCreate={create} />
  </div>
);

/** Preferences pre-select the area and priority a new ticket starts with. */
export const WithDefaults = () => (
  <div style={{ height: 740 }}>
    <TicketCreate
      board={demoBoard}
      items={demoItems}
      defaultArea="gui"
      defaultPriority="high"
      onClose={() => {}}
      onCreate={create}
    />
  </div>
);
