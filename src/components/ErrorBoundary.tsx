import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || '알 수 없는 오류가 발생했습니다.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF] px-4">
          <div className="max-w-md w-full rounded-2xl bg-white border border-[#E5DAC5] p-6 shadow-sm space-y-4 text-center">
            <h1 className="font-serif-kr text-xl font-bold text-[#1F1B16]">
              일시적인 오류가 발생했습니다
            </h1>
            <p className="text-sm text-[#574D40] leading-relaxed">
              데이터 처리 중 문제가 발생했습니다. 새로고침 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold transition-colors cursor-pointer"
            >
              화면 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
