// src/components/ui/error.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorDisplay({
  message,
  onRetry,
  retryText = '다시 시도하기',
}: ErrorProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-destructive">오류</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{message}</p>
      </CardContent>
      {onRetry && (
        <CardFooter>
          <Button onClick={onRetry} className="w-full">
            {retryText}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
