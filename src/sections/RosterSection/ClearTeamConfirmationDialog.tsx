import { useEffect, type RefObject } from "react";
import { AlertTriangle } from "lucide-react";

export type ClearTeamDialogRefs = {
  dialogRef: RefObject<HTMLDivElement | null>;
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  triggerButtonRef: RefObject<HTMLButtonElement | null>;
};

export function ClearTeamConfirmationDialog({
  cancelButtonRef,
  dialogRef,
  error,
  isDeleting,
  isOpen,
  teamName,
  onCancel,
  onDelete,
}: {
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  error: string | null;
  isDeleting: boolean;
  isOpen: boolean;
  teamName: string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        aria-describedby="clear-team-dialog-description"
        aria-labelledby="clear-team-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-[var(--danger)]/25 bg-[var(--card)] p-5 shadow-2xl"
        ref={dialogRef}
        role="alertdialog"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              className="text-xl font-semibold text-foreground"
              id="clear-team-dialog-title"
            >
              Permanently delete {teamName}?
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]"
              id="clear-team-dialog-description"
            >
              This deletes the team, roster, games, and stats from the database.
              This action cannot be undone.
            </p>
          </div>
        </div>
        {error ? (
          <p
            className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="btn-base btn-secondary min-h-11 px-4 text-sm"
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn-base btn-danger min-h-11 px-4 text-sm"
            disabled={isDeleting}
            onClick={onDelete}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete Team Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useClearTeamDialogFocus({
  isDeletingTeam,
  isOpen,
  onClose,
  refs,
}: {
  isDeletingTeam: boolean;
  isOpen: boolean;
  onClose: () => void;
  refs: ClearTeamDialogRefs;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const triggerElement = refs.triggerButtonRef.current;
    refs.cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeletingTeam) {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        trapFocus(event, refs.dialogRef);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [
    isDeletingTeam,
    isOpen,
    onClose,
    refs.cancelButtonRef,
    refs.dialogRef,
    refs.triggerButtonRef,
  ]);
}

function trapFocus(
  event: KeyboardEvent,
  dialogRef: RefObject<HTMLDivElement | null>,
) {
  const elements = Array.from(
    dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
    ) ?? [],
  );

  if (!elements.length) {
    return;
  }

  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}
