import { ConfirmModal } from "@kanmer/ui";
import "./frame.module.css";

/** The unsaved-work guard, as raised when navigating away from a dirty editor. */
export const DiscardChanges = () => (
  <div style={{ height: 330 }}>
    <ConfirmModal
      message="Discard unsaved changes to API-009?"
      actionLabel="Discard"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  </div>
);

/** Same prompt with a custom cancel label — switching a document tab. */
export const DocumentTab = () => (
  <div style={{ height: 330 }}>
    <ConfirmModal
      message="Discard changes to API-009 plan.md?"
      actionLabel="Discard"
      cancelLabel="Stay on Plan"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  </div>
);
