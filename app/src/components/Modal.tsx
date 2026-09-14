import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  initial: string;
  onOk: (value: string) => void;
  onCancel: () => void;
}

export default function Modal({ title, initial, onOk, onCancel }: Props) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="modal" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onOk(value.trim());
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="modal-actions">
          <button className="ghost" onClick={onCancel}>
            取消
          </button>
          <button className="primary" onClick={() => onOk(value.trim())}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
