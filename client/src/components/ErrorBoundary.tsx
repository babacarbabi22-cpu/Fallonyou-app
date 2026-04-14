import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Algo salió mal</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Se produjo un error inesperado. Por favor recarga la página para continuar.
          </p>
          <Button
            onClick={this.handleRetry}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold"
            data-testid="button-retry-error"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar la app
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
