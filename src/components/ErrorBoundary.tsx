import { Component } from "react";
import type { ReactNode } from "react";
import { Box, RotateCcw } from "lucide-react";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="recovery-screen" role="alert">
        <Box size={42} />
        <h1>Let’s get your workspace back.</h1>
        <p>
          The console couldn’t open your saved workspace. Make sure browser
          storage is enabled, then reload. Your saved data has not been deleted.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          <RotateCcw size={16} />
          Reload workspace
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
