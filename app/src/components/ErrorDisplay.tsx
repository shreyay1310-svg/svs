import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ message = "Something went wrong", onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Error</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}
