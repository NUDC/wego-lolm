import { useEffect, useRef, useState } from "react";
import type { PageState } from "../types";

interface Props {
  state: PageState;
  onCancel: () => void;
  onOk: (value: string) => void;
}

export default function Page({ state, onCancel, onOk }: Props) {
  const [val, setVal] = useState(state.kind === "input" ? state.value : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.kind === "input") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [state]);

  const confirm = () => (state.kind === "input" ? onOk(val.trim()) : onOk(""));
  const danger = state.kind === "confirm" && state.danger;

  return (
    <div className="page">
      <div className="page-head">
        <button className="back-btn" onClick={onCancel} aria-label="返回">
          ←
        </button>
        <div className="page-title">{state.title}</div>
      </div>

      <div className="page-body">
        {state.kind === "input" ? (
          <div className="field">
            {state.label && <label>{state.label}</label>}
            <input
              ref={inputRef}
              type="text"
              value={val}
              placeholder={state.placeholder}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") onCancel();
              }}
            />
          </div>
        ) : (
          <p className="confirm-msg">{state.message}</p>
        )}
      </div>

      <div className="page-footer">
        <button className="btn btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button
          className={`btn ${danger ? "btn-danger-solid" : "btn-primary"}`}
          onClick={confirm}
        >
          {state.ok}
        </button>
      </div>
    </div>
  );
}
