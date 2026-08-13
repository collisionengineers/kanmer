/**
 * The app's one "you are about to lose unsaved work" prompt, extracted at its
 * third occurrence (item navigation, document-tab switch, project switch).
 * Deliberately markup-identical to the modal it replaces so the three guards
 * look and behave the same.
 */
export function ConfirmModal({
  message,
  actionLabel,
  onConfirm,
  onCancel,
  cancelLabel = "Keep editing",
}: {
  message: string;
  actionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
}): JSX.Element {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm" role="alertdialog" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="ghost sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="danger sm" onClick={onConfirm}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
