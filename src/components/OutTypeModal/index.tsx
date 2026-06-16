"use client";

import type { OutType } from "@/types/game";

type OutTypeModalProps = {
  isOpen: boolean;
  onSelect: (outType: OutType) => void;
  onClose: () => void;
};

const outTypeOptions: Array<{ value: OutType; label: string }> = [
  { value: "GROUNDOUT", label: "Groundout" },
  { value: "FLYOUT", label: "Flyout" },
  { value: "LINEOUT", label: "Lineout" },
  { value: "STRIKEOUT_LOOKING", label: "Strikeout Looking" },
  { value: "STRIKEOUT_SWINGING", label: "Strikeout Swinging" },
  { value: "OTHER_OUT", label: "Other Out" },
];

export function OutTypeModal({ isOpen, onSelect, onClose }: OutTypeModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="out-type-modal" role="presentation">
      <div
        aria-labelledby="out-type-modal-title"
        aria-modal="true"
        className="out-type-modal__panel"
        role="dialog"
      >
        <div className="out-type-modal__header">
          <h2 className="out-type-modal__title" id="out-type-modal-title">
            What kind of out?
          </h2>
          <button className="out-type-modal__close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="out-type-modal__options">
          {outTypeOptions.map((option) => (
            <button
              className="out-type-modal__option"
              key={option.value}
              onClick={() => onSelect(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
