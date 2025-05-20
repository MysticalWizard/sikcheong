'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseSeed,
  determineRounds,
  randomizeTeams,
  getAdjacentDates,
  formatDateForDisplay,
  getMealLabel,
  isWeekend,
} from '@/lib/randomizer';

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center p-6 bg-background">
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold">식당청소 뺑뺑이</h1>
              <div className="mt-2 h-8 w-48 mx-auto bg-muted animate-pulse rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-16 bg-muted animate-pulse rounded-md"></div>
              <div className="h-16 bg-muted animate-pulse rounded-md"></div>
              <div className="space-y-6">
                <div className="flex justify-between">
                  <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="p-4 rounded-md bg-card border border-border h-48 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<{
    seed: number;
    isDateSeed: boolean;
    formattedDate: {
      dateText: string;
      dayText: string;
      dayColor: string;
    } | null;
    parsedDate: Date | null; // Add this field to store the actual Date object
    pool: string[];
    teams: string[][] | null;
    appearances: Record<string, number> | null;
    error: string | null;
  }>({
    seed: 0,
    isDateSeed: false,
    formattedDate: null,
    parsedDate: null, // Initialize the new field
    pool: [],
    teams: null,
    appearances: null,
    error: null,
  });

  const [adjacentDates, setAdjacentDates] = useState<{
    previousDate: string;
    currentDateString: string;
    nextDate: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedPerson, setHighlightedPerson] = useState<string | null>(
    null,
  );

  const copyToClipboard = () => {
    try {
      // Create a display-friendly URL with readable Korean characters
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const displayParams = [];

      // For each parameter, create a readable version
      for (const [key, value] of searchParams.entries()) {
        if (key === 'pool') {
          // Decode the pool parameter to show actual Korean characters
          try {
            const decodedValue = decodeURIComponent(value);
            displayParams.push(`${key}=${decodedValue}`);
          } catch {
            displayParams.push(`${key}=${value}`);
          }
        } else {
          displayParams.push(`${key}=${value}`);
        }
      }

      // Construct a display-friendly URL with readable parameters
      // Note: This URL is for display purposes and will be properly re-encoded when used
      const readableUrl = `${baseUrl}?${displayParams.join('&')}`;

      // Use clipboard API if available
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(readableUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = readableUrl;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  useEffect(() => {
    // Parse URL params
    const poolParam = searchParams.get('pool') || '';
    const pool = poolParam
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    const sizeParam = searchParams.get('size');
    const teamSize = sizeParam ? parseInt(sizeParam, 10) : 4;

    const roundsParam = searchParams.get('rounds');
    const userRounds = roundsParam ? parseInt(roundsParam, 10) : null;

    const minParam = searchParams.get('min');
    const minAppearances = minParam ? parseInt(minParam, 10) : 0;

    const maxParam = searchParams.get('max');

    const seedParam = searchParams.get('seed');
    const { seed, isDateSeed, parsedDate } = parseSeed(seedParam);

    // Determine rounds based on seed date or user input
    const rounds = determineRounds(parsedDate, userRounds);

    // Set max appearances to rounds if not specified
    const maxAppearances = maxParam ? parseInt(maxParam, 10) : rounds;

    // Get adjacent dates if using date seed
    if (isDateSeed && parsedDate) {
      setAdjacentDates(getAdjacentDates(parsedDate));
    }

    let formattedDate = null;
    if (isDateSeed && parsedDate) {
      formattedDate = formatDateForDisplay(parsedDate);
    }

    // Generate teams
    if (pool.length < 2) {
      setResult({
        seed,
        isDateSeed,
        formattedDate,
        parsedDate,
        pool,
        teams: null,
        appearances: null,
        error: '참가자는 최소 2명 이상이어야 합니다.',
      });
      return;
    }

    const randomResult = randomizeTeams({
      pool,
      teamSize,
      rounds,
      minAppearances,
      maxAppearances,
      seed,
    });

    if ('error' in randomResult) {
      setResult({
        seed,
        isDateSeed,
        formattedDate,
        parsedDate,
        pool,
        teams: null,
        appearances: null,
        error: randomResult.error,
      });
    } else {
      setResult({
        seed,
        isDateSeed,
        formattedDate,
        parsedDate,
        pool,
        teams: randomResult.teams,
        appearances: randomResult.appearances,
        error: null,
      });
    }
  }, [searchParams]);

  const handleEditClick = () => {
    // Show loading state
    setIsLoading(true);
    // Preserve current params and go back to edit form
    router.push(`/?${searchParams.toString()}`);
    // Note: No need to reset loading state since we're navigating away
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-6 bg-background">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">식당청소 뺑뺑이</h1>
          {result.formattedDate && (
            <h2 className="mt-2 text-xl font-semibold">
              {result.formattedDate.dateText} (
              <span className={result.formattedDate.dayColor}>
                {result.formattedDate.dayText}
              </span>
              )
            </h2>
          )}
        </div>

        {result.error ? (
          <div className="p-4 rounded-md bg-destructive/10 border border-destructive text-destructive">
            <h3 className="font-semibold">오류 발생</h3>
            <p>{result.error}</p>
          </div>
        ) : (
          <>
            {/* Seed and Pool Info */}
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-muted">
                <h3 className="font-medium mb-2">사용된 시드</h3>
                <p className="font-mono text-sm">{result.seed}</p>
              </div>

              <div className="p-4 rounded-md bg-muted">
                <h3 className="font-medium mb-2">
                  참가자 명단 ({result.pool.length}명)
                </h3>
                <p>{result.pool.join(', ')}</p>
              </div>
            </div>

            {/* Teams */}
            {result.teams && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">팀 구성</h3>
                  {highlightedPerson && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium bg-yellow-200 dark:bg-yellow-700 px-2 py-1 rounded">
                        {highlightedPerson} 선택됨
                      </span>
                      <button
                        onClick={() => setHighlightedPerson(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        초기화
                      </button>
                    </div>
                  )}
                </div>
                {result.teams.map((team, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-md bg-card border border-border"
                  >
                    <h4 className="font-bold mb-3">
                      {result.isDateSeed
                        ? getMealLabel(
                            index,
                            result.parsedDate
                              ? isWeekend(result.parsedDate)
                              : false,
                          )
                        : `라운드 ${index + 1}`}
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {team.map((person, personIndex) => (
                        <li
                          key={personIndex}
                          className="flex items-center gap-2"
                        >
                          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            {personIndex + 1}
                          </span>
                          <span
                            className={cn(
                              'cursor-pointer hover:underline',
                              highlightedPerson === person &&
                                'bg-yellow-200 dark:bg-yellow-700 px-1 rounded',
                            )}
                            onClick={() =>
                              setHighlightedPerson((current) =>
                                current === person ? null : person,
                              )
                            }
                          >
                            {person}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Appearances */}
            {result.appearances && (
              <div className="p-4 rounded-md bg-muted">
                <h3 className="font-medium mb-3">참여 횟수</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(result.appearances).map(([person, count]) => (
                    <div
                      key={person}
                      className="flex items-center justify-between"
                    >
                      <span
                        className={cn(
                          'cursor-pointer hover:underline',
                          highlightedPerson === person &&
                            'bg-yellow-200 dark:bg-yellow-700 px-1 rounded',
                        )}
                        onClick={() =>
                          setHighlightedPerson((current) =>
                            current === person ? null : person,
                          )
                        }
                      >
                        {person}
                      </span>
                      <span className="font-medium">{count}회</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* Copy Link Button */}
          <button
            onClick={copyToClipboard}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors',
              'bg-muted text-foreground hover:bg-muted/80',
            )}
          >
            {copied ? (
              <>
                <Check className="h-5 w-5" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                <span>링크 복사</span>
              </>
            )}
          </button>

          {/* Date Navigation - only show if using date seed */}
          {result.isDateSeed && adjacentDates && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Link
                href={`/result?${new URLSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  seed: adjacentDates.previousDate,
                })}`}
                className={cn(
                  'flex-1 sm:flex-none py-2 px-4 rounded-md font-medium transition-colors text-center',
                  'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                )}
              >
                이전 날짜
              </Link>
              <Link
                href={`/result?${new URLSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  seed: dayjs().format('YYYYMMDD'),
                })}`}
                className={cn(
                  'flex-1 sm:flex-none py-2 px-4 rounded-md font-medium transition-colors text-center',
                  'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                )}
              >
                오늘
              </Link>
              <Link
                href={`/result?${new URLSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  seed: adjacentDates.nextDate,
                })}`}
                className={cn(
                  'flex-1 sm:flex-none py-2 px-4 rounded-md font-medium transition-colors text-center',
                  'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                )}
              >
                다음 날짜
              </Link>
            </div>
          )}

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleEditClick}
              disabled={isLoading}
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-colors relative',
                'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70',
              )}
            >
              {isLoading ? (
                <>
                  <span className="opacity-0">설정 수정하기</span>
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
                '설정 수정하기'
              )}
            </button>
            <Link
              href="/"
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-colors text-center',
                'bg-muted text-foreground hover:bg-muted/80',
              )}
            >
              처음으로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
