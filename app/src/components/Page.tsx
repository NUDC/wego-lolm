import type { PageState } from "../types";
import Icon from "./Icon";

interface Props {
  state: PageState;
  onCancel: () => void;
  onOk: () => void;
}

/// 确认页：整页切换，和编辑页一致的导航语感，不用弹窗。
export default function Page({ state, onCancel, onOk }: Props) {
  return (
    <div className="page">
      <div className="page-head">
        <button className="back-btn" onClick={onCancel} aria-label="返回">
          <Icon name="arrowLeft" size={19} />
        </button>
        <div className="page-title">{state.title}</div>
      </div>

      <div className="page-body">
        <p className="confirm-msg">{state.message}</p>
      </div>

      <div className="page-footer">
        <button className="btn btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button
          className={`btn ${state.danger ? "btn-destructive" : "btn-primary"}`}
          onClick={onOk}
        >
          {state.ok}
        </button>
      </div>
    </div>
  );
}
