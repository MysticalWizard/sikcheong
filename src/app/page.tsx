'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import dayjs from 'dayjs';

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold">식당청소 뺑뺑이</h1>
              <p className="mt-2 text-muted-foreground">
                사다리 억까는 이제 그만!
              </p>
            </div>
            <div className="h-64 w-full animate-pulse bg-muted rounded-md"></div>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    pool: '',
    size: '4',
    rounds: '',
    min: '0',
    max: '',
    seed: '',
  });

  // Use ref to track if form has been filled with URL params
  const initialParamsApplied = useRef(false);

  // Fill form with query parameters if they exist
  useEffect(() => {
    // Skip if we've already applied the initial params
    if (initialParamsApplied.current) return;

    // Check for each parameter and update form state
    const currentFormData = { ...formData };
    let updated = false;

    // Check each form field for corresponding URL parameter
    Object.keys(currentFormData).forEach((key) => {
      const paramValue = searchParams.get(key);
      if (paramValue !== null) {
        currentFormData[key as keyof typeof currentFormData] = paramValue;
        updated = true;
      }
    });

    // Only update state if we found parameters
    if (updated) {
      setFormData(currentFormData);
      // Mark that we've applied the initial params
      initialParamsApplied.current = true;
    }
    // We intentionally don't include formData in dependencies to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.pool.trim()) {
      alert('참가자 명단을 입력해주세요');
      return;
    }

    setIsLoading(true);

    // Create query string for the URL
    const params = new URLSearchParams();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    // Redirect to result page
    router.push(`/result?${params.toString()}`);

    // Note: No need to reset isLoading since we're navigating away
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">식당청소 뺑뺑이</h1>
          <p className="mt-2 text-muted-foreground">사다리 억까는 이제 그만!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="pool" className="block text-sm font-medium">
              참가자 명단 <span className="text-destructive">*</span>
            </label>
            <textarea
              id="pool"
              name="pool"
              value={formData.pool}
              onChange={handleChange}
              placeholder="홍길동, 식케이, 전준태, ..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              쉼표(,)로 구분하여 입력해주세요
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="size" className="block text-sm font-medium">
                팀 인원수
              </label>
              <input
                id="size"
                name="size"
                type="number"
                min="1"
                value={formData.size}
                onChange={handleChange}
                placeholder="4"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="rounds" className="block text-sm font-medium">
                라운드 수
              </label>
              <input
                id="rounds"
                name="rounds"
                type="number"
                min="1"
                value={formData.rounds}
                onChange={handleChange}
                placeholder="1"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="min" className="block text-sm font-medium">
                최소 식청 횟수
              </label>
              <input
                id="min"
                name="min"
                type="number"
                min="0"
                value={formData.min}
                onChange={handleChange}
                placeholder="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="max" className="block text-sm font-medium">
                최대 식청 횟수
              </label>
              <input
                id="max"
                name="max"
                type="number"
                min="0"
                value={formData.max}
                onChange={handleChange}
                placeholder="라운드 수와 동일"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="seed" className="block text-sm font-medium">
              시드 값
            </label>
            <div className="flex gap-2">
              <input
                id="seed"
                name="seed"
                type="text"
                value={formData.seed}
                onChange={handleChange}
                placeholder="랜덤 또는 YYYYMMDD 형식의 날짜"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="border border-input bg-background hover:bg-muted p-2 rounded-md"
                  >
                    <CalendarIcon className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    onSelect={(date) => {
                      if (date) {
                        setFormData((prev) => ({
                          ...prev,
                          seed: dayjs(date).format('YYYYMMDD'),
                        }));
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground">
              빈칸으로 두면 랜덤 시드 사용, YYYYMMDD 형식으로 날짜 입력 가능
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-3 px-4 rounded-md font-medium transition-colors relative',
              'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70',
            )}
          >
            {isLoading ? (
              <>
                <span className="opacity-0">뽑기</span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              </>
            ) : (
              '뽑기'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
