'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseSeed,
  determineRounds,
  randomizeTeams,
  getAdjacentDates,
  formatDateForDisplay,
  getMealLabel,
  isWeekend,
  createRandomGenerator,
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

// Parse disabled participants from URL
const parseDisabledFromUrl = (disabledParam: string | null) => {
  if (!disabledParam) return {};

  const disabled: Record<number, Set<string>> = {};
  try {
    // Format: round1:person1,person2;round2:person3,person4
    const rounds = disabledParam.split(';');
    rounds.forEach((roundData) => {
      const [roundStr, peopleStr] = roundData.split(':');
      if (roundStr && peopleStr) {
        const roundNum = parseInt(roundStr.replace('round', ''), 10) - 1;
        const people = peopleStr.split(',').filter(Boolean);
        disabled[roundNum] = new Set(people);
      }
    });
  } catch (error) {
    console.error('Error parsing disabled participants:', error);
  }
  return disabled;
};

// Format disabled participants for URL
const formatDisabledForUrl = (disabled: Record<number, Set<string>>) => {
  const parts: string[] = [];
  Object.entries(disabled).forEach(([round, people]) => {
    if (people.size > 0) {
      parts.push(`round${parseInt(round) + 1}:${Array.from(people).join(',')}`);
    }
  });
  return parts.length > 0 ? parts.join(';') : null;
};

// Calculate appearances from current teams
const calculateAppearances = (teams: string[][]) => {
  const appearances: Record<string, number> = {};
  teams.forEach((team) => {
    team.forEach((person) => {
      appearances[person] = (appearances[person] || 0) + 1;
    });
  });
  return appearances;
};

// Find replacement for a team member
const findReplacement = (
  currentTeam: string[],
  removedPerson: string,
  round: number,
  allTeams: string[][],
  pool: string[],
  disabled: Set<string>,
  seed: number,
  minAppearances: number,
  maxAppearances: number,
): string | null => {
  // Calculate current appearances
  const appearances: Record<string, number> = {};
  pool.forEach((person) => {
    appearances[person] = 0;
  });
  allTeams.forEach((team, idx) => {
    if (idx !== round) {
      team.forEach((person) => {
        appearances[person] = (appearances[person] || 0) + 1;
      });
    }
  });

  // Get eligible replacements
  const eligible = pool.filter(
    (person) =>
      person !== removedPerson &&
      !currentTeam.includes(person) &&
      !disabled.has(person) &&
      appearances[person] < maxAppearances,
  );

  if (eligible.length === 0) return null;

  // Sort by priority: those under min appearances first, then by fewest appearances
  eligible.sort((a, b) => {
    const aUnderMin = appearances[a] < minAppearances ? 1 : 0;
    const bUnderMin = appearances[b] < minAppearances ? 1 : 0;

    if (aUnderMin !== bUnderMin) {
      return bUnderMin - aUnderMin;
    }

    return appearances[a] - appearances[b];
  });

  // Use seeded random to pick from top candidates
  const random = createRandomGenerator(seed + round);
  const topCandidates = eligible.filter(
    (person) => appearances[person] === appearances[eligible[0]],
  );

  const randomIndex = Math.floor(random() * topCandidates.length);
  return topCandidates[randomIndex];
};

// Regenerate teams with disabled participants
const regenerateTeamsWithDisabled = (
  originalTeams: string[][],
  pool: string[],
  disabled: Record<number, Set<string>>,
  seed: number,
  minAppearances: number,
  maxAppearances: number,
) => {
  const newTeams = originalTeams.map((team) => [...team]);
  const errors: Record<string, string> = {};

  // Process each round
  Object.entries(disabled).forEach(([roundStr, disabledSet]) => {
    const round = parseInt(roundStr, 10);
    if (!newTeams[round]) return;

    // Remove disabled participants from this round's team
    const currentTeam = newTeams[round];
    const toRemove = currentTeam.filter((person) => disabledSet.has(person));

    toRemove.forEach((person) => {
      const idx = currentTeam.indexOf(person);
      if (idx !== -1) {
        currentTeam.splice(idx, 1);

        // Find replacement
        const replacement = findReplacement(
          currentTeam,
          person,
          round,
          newTeams,
          pool,
          disabledSet,
          seed,
          minAppearances,
          maxAppearances,
        );

        if (replacement) {
          currentTeam.push(replacement);
        } else {
          errors[`round-${round}`] = '대체 인원을 찾을 수 없습니다.';
        }
      }
    });
  });

  // Validate constraints
  const appearances = calculateAppearances(newTeams);
  pool.forEach((person) => {
    const count = appearances[person] || 0;
    if (count < minAppearances) {
      errors[person] =
        `최소 ${minAppearances}회 이상 참여해야 합니다. (현재: ${count}회)`;
    } else if (count > maxAppearances) {
      errors[person] =
        `최대 ${maxAppearances}회까지만 참여 가능합니다. (현재: ${count}회)`;
    }
  });

  // Check if all participants are disabled for any round
  newTeams.forEach((team, round) => {
    const disabledForRound = disabled[round] || new Set();
    const availableCount = pool.filter((p) => !disabledForRound.has(p)).length;
    if (availableCount === 0) {
      errors[`round-${round}`] = '모든 참가자가 비활성화되었습니다.';
    }
  });

  return { teams: newTeams, errors, appearances };
};

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
    parsedDate: Date | null;
    pool: string[];
    teams: string[][] | null;
    appearances: Record<string, number> | null;
    error: string | null;
  }>({
    seed: 0,
    isDateSeed: false,
    formattedDate: null,
    parsedDate: null,
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

  const [constraintErrors, setConstraintErrors] = useState<
    Record<string, string>
  >({});

  // Parse disabled participants from URL
  const disabledParticipants = useMemo(() => {
    const disabledParam = searchParams.get('disabled');
    return parseDisabledFromUrl(disabledParam);
  }, [searchParams]);

  const isCustomized = Object.keys(disabledParticipants).length > 0;

  const copyToClipboard = () => {
    try {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const currentUrl = `${baseUrl}?${searchParams.toString()}`;

      if (navigator?.clipboard) {
        navigator.clipboard.writeText(currentUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
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

  // Toggle participant for a specific round
  const toggleParticipant = useCallback(
    (person: string, round: number) => {
      const newParams = new URLSearchParams(searchParams.toString());
      const currentDisabled = parseDisabledFromUrl(
        searchParams.get('disabled'),
      );

      if (!currentDisabled[round]) {
        currentDisabled[round] = new Set();
      }

      if (currentDisabled[round].has(person)) {
        currentDisabled[round].delete(person);
      } else {
        currentDisabled[round].add(person);
      }

      // Clean up empty sets
      if (currentDisabled[round].size === 0) {
        delete currentDisabled[round];
      }

      const disabledStr = formatDisabledForUrl(currentDisabled);
      if (disabledStr) {
        newParams.set('disabled', disabledStr);
      } else {
        newParams.delete('disabled');
      }

      router.replace(`/result?${newParams.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Clear all customizations
  const clearCustomizations = useCallback(() => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('disabled');
    router.replace(`/result?${newParams.toString()}`);
  }, [searchParams, router]);

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
    let adjacentDatesValue = null;
    if (isDateSeed && parsedDate) {
      adjacentDatesValue = getAdjacentDates(parsedDate);
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
      let finalTeams = randomResult.teams;
      let finalAppearances = randomResult.appearances;
      let errors = {};

      // Apply disabled participants if any
      if (Object.keys(disabledParticipants).length > 0) {
        const regenerated = regenerateTeamsWithDisabled(
          randomResult.teams,
          pool,
          disabledParticipants,
          seed,
          minAppearances,
          maxAppearances,
        );
        finalTeams = regenerated.teams;
        finalAppearances = regenerated.appearances;
        errors = regenerated.errors;
      }

      // Batch all state updates
      setResult({
        seed,
        isDateSeed,
        formattedDate,
        parsedDate,
        pool,
        teams: finalTeams,
        appearances: finalAppearances,
        error: null,
      });

      if (adjacentDatesValue) {
        setAdjacentDates(adjacentDatesValue);
      }

      setConstraintErrors(errors);
    }
  }, [searchParams, disabledParticipants]);

  const handleEditClick = () => {
    setIsLoading(true);
    router.push(`/?${searchParams.toString()}`);
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
          {isCustomized && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-full text-sm">
              <span>수동 조정됨</span>
              <button
                onClick={clearCustomizations}
                className="hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                초기화
              </button>
            </div>
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
                {result.teams.map((team, index) => {
                  const disabledForRound =
                    disabledParticipants[index] || new Set();
                  const roundError = constraintErrors[`round-${index}`];

                  return (
                    <div key={index} className="space-y-3">
                      <div
                        className={cn(
                          'p-4 rounded-md bg-card border',
                          roundError ? 'border-destructive' : 'border-border',
                        )}
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
                        {roundError && (
                          <p className="text-sm text-destructive mb-2">
                            {roundError}
                          </p>
                        )}
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
                                  constraintErrors[person] &&
                                    'text-destructive',
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

                      {/* Participant Editor */}
                      <div className="p-3 bg-muted/50 rounded-md">
                        <h5 className="text-sm font-medium mb-2">
                          참가자 편집
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {result.pool.map((person) => {
                            const isInTeam = team.includes(person);
                            const isDisabled = disabledForRound.has(person);
                            const hasError = constraintErrors[person];
                            const currentAppearances =
                              result.appearances?.[person] || 0;

                            return (
                              <button
                                key={person}
                                onClick={() => toggleParticipant(person, index)}
                                className={cn(
                                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative',
                                  isDisabled
                                    ? 'bg-muted text-muted-foreground line-through'
                                    : isInTeam
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-background border border-border hover:bg-muted',
                                  hasError && 'ring-2 ring-destructive',
                                )}
                              >
                                {person}
                                <span
                                  className={cn(
                                    'ml-1 text-xs',
                                    isInTeam && 'text-primary-foreground/70',
                                  )}
                                >
                                  ({currentAppearances})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {Object.entries(constraintErrors).map(
                          ([key, error]) => {
                            if (key.startsWith('round-')) return null;
                            return (
                              <p
                                key={key}
                                className="text-xs text-destructive mt-2"
                              >
                                {key}: {error}
                              </p>
                            );
                          },
                        )}
                      </div>
                    </div>
                  );
                })}
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
                          constraintErrors[person] && 'text-destructive',
                        )}
                        onClick={() =>
                          setHighlightedPerson((current) =>
                            current === person ? null : person,
                          )
                        }
                      >
                        {person}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          constraintErrors[person] && 'text-destructive',
                        )}
                      >
                        {count}회
                      </span>
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
