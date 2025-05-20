/**
 * 식당청소 뺑뺑이 (Dining Hall Cleaning Duty Team Randomizer)
 * Utility functions for randomization, date handling, and team selection
 */
import dayjs from 'dayjs';
import 'dayjs/locale/ko'; // Import Korean locale

// Initialize dayjs with Korean locale
dayjs.locale('ko');

// ===== TYPES =====

/**
 * Parameters for the team randomization function
 */
interface RandomizationParams {
  pool: string[]; // List of participant names
  teamSize: number; // Number of members per team
  rounds: number; // Number of rounds to generate
  minAppearances: number; // Minimum times a person should be selected
  maxAppearances: number; // Maximum times a person can be selected
  seed: number; // Random seed for deterministic results
}

/**
 * Result of successful team randomization
 */
interface RandomizationResult {
  teams: string[][]; // Teams for each round
  appearances: Record<string, number>; // Number of times each person appears
}

// ===== RANDOM NUMBER GENERATION =====

/**
 * Creates a seeded random number generator for deterministic randomization
 * @param seed - Number to seed the random generator
 * @returns Function that produces random numbers between 0 and 1
 */
export function createRandomGenerator(seed: number) {
  let state = seed;

  // Simple xorshift algorithm for pseudo-random number generation
  return function () {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // Convert to a number between 0 and 1
    return (state >>> 0) / 4294967296;
  };
}

// ===== SEED HANDLING =====

/**
 * Parse seed input and determine if it's a date
 * @param seedInput - String input for seed (can be YYYYMMDD format date)
 * @returns Object with seed number, date flag, and parsed date
 */
export function parseSeed(seedInput: string | null): {
  seed: number;
  isDateSeed: boolean;
  parsedDate: Date | null;
} {
  // If no seed provided, use current timestamp
  if (!seedInput) {
    return {
      seed: Date.now(),
      isDateSeed: false,
      parsedDate: null,
    };
  }

  // Check if it's a valid date in YYYYMMDD format
  if (seedInput.length === 8 && /^\d{8}$/.test(seedInput)) {
    const year = seedInput.substring(0, 4);
    const month = seedInput.substring(4, 6);
    const day = seedInput.substring(6, 8);

    // Use dayjs for more robust date parsing
    const parsedDate = dayjs(`${year}-${month}-${day}`);

    // Check if it's a valid date
    if (parsedDate.isValid()) {
      return {
        seed: parseInt(seedInput, 10),
        isDateSeed: true,
        parsedDate: parsedDate.toDate(),
      };
    }
  }

  // Parse as regular number seed
  let numericSeed: number;
  try {
    numericSeed = seedInput ? parseInt(seedInput, 10) : Date.now();
    // If parsing failed or NaN, use current timestamp
    if (isNaN(numericSeed)) {
      numericSeed = Date.now();
    }
  } catch {
    numericSeed = Date.now();
  }

  return {
    seed: numericSeed,
    isDateSeed: false,
    parsedDate: null,
  };
}

/**
 * Determine how many rounds to generate based on date and user input
 * @param parsedDate - Date from seed (if any)
 * @param userRounds - User-specified rounds (if any)
 * @returns Number of rounds to generate
 */
export function determineRounds(
  parsedDate: Date | null,
  userRounds: number | null,
): number {
  // If user specified rounds, use that
  if (userRounds !== null && userRounds > 0) {
    return userRounds;
  }

  // If there's no date seed, default to 1
  if (!parsedDate) {
    return 1;
  }

  // Check if it's a weekend (0 = Sunday, 6 = Saturday)
  const dayOfWeek = dayjs(parsedDate).day();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 2; // Weekend: brunch & dinner
  } else {
    return 3; // Weekday: breakfast, lunch & dinner
  }
}

// ===== TEAM RANDOMIZATION =====

/**
 * Shuffle an array using the Fisher-Yates algorithm with a seeded random generator
 * @param array - Array to shuffle
 * @param random - Seeded random number generator
 * @returns New shuffled array (original is not modified)
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Main randomization function to generate teams for each round
 * @param params - Parameters for team randomization
 * @returns Randomized teams or error message
 */
export function randomizeTeams(
  params: RandomizationParams,
): RandomizationResult | { error: string } {
  const { pool, teamSize, rounds, minAppearances, maxAppearances, seed } =
    params;

  // === VALIDATION ===
  // Ensure minimum number of participants
  if (pool.length < 2) {
    return { error: '참가자는 최소 2명 이상이어야 합니다.' };
  }

  // Team size cannot exceed pool size
  if (teamSize >= pool.length) {
    return { error: '팀 인원수는 전체 참가자 수보다 작아야 합니다.' };
  }

  const totalSelections = teamSize * rounds;
  const minTotalAppearances = minAppearances * pool.length;

  // Check if min/max constraints can be satisfied
  if (totalSelections < minTotalAppearances) {
    return {
      error: `최소 식청 횟수 설정이 너무 높습니다. ${minAppearances}에서 ${Math.floor(totalSelections / pool.length)} 이하로 설정하세요.`,
    };
  }

  if (maxAppearances * pool.length < totalSelections) {
    return {
      error: `최대 식청 횟수 설정이 너무 낮습니다. ${maxAppearances}에서 ${Math.ceil(totalSelections / pool.length)} 이상으로 설정하세요.`,
    };
  }

  // === INITIALIZATION ===
  // Create random number generator with seed
  const random = createRandomGenerator(seed);

  // Initialize appearance count for each person
  const appearances: Record<string, number> = {};
  pool.forEach((person) => {
    appearances[person] = 0;
  });

  // Initialize teams array
  const teams: string[][] = Array(rounds)
    .fill(null)
    .map(() => []);

  // === TEAM GENERATION ===
  // For each round, select a team
  for (let round = 0; round < rounds; round++) {
    // Keep adding team members until we have exactly teamSize
    while (teams[round].length < teamSize) {
      // Get eligible participants for this round
      const eligible = pool.filter(
        (person) =>
          !teams[round].includes(person) &&
          appearances[person] < maxAppearances,
      );

      // If not enough eligible participants to complete the team
      if (eligible.length < teamSize - teams[round].length) {
        return {
          error:
            '주어진 제약 조건으로는 팀을 구성할 수 없습니다. 최대 식청 횟수를 늘리거나 다른 설정을 조정해 보세요.',
        };
      }

      // Sort eligible participants by priority:
      // 1. Those who haven't met min appearances
      // 2. Those with fewer appearances
      const sortedEligible = [...eligible].sort((a, b) => {
        // First prioritize those under min appearances
        const aUnderMin = appearances[a] < minAppearances ? 1 : 0;
        const bUnderMin = appearances[b] < minAppearances ? 1 : 0;

        if (aUnderMin !== bUnderMin) {
          return bUnderMin - aUnderMin; // Higher priority if under min
        }

        // Then prioritize by fewer appearances
        return appearances[a] - appearances[b];
      });

      // Calculate how many more members needed for this team
      const remainingNeeded = teamSize - teams[round].length;

      // First, select from those under minimum appearances
      const underMinimum = sortedEligible.filter(
        (person) => appearances[person] < minAppearances,
      );

      // Shuffle to randomize selection while preserving priority
      const shuffledUnderMinimum = shuffleArray(underMinimum, random);

      // Select members from under-minimum group (up to how many we need)
      const selectFromUnderMin = Math.min(
        shuffledUnderMinimum.length,
        remainingNeeded,
      );

      for (let i = 0; i < selectFromUnderMin; i++) {
        const person = shuffledUnderMinimum[i];
        teams[round].push(person);
        appearances[person]++;
      }

      // If team is complete, move to next round
      if (teams[round].length >= teamSize) {
        break;
      }

      // If we need more people, select from remaining eligible participants
      const remainingEligible = sortedEligible.filter(
        (person) =>
          !shuffledUnderMinimum.slice(0, selectFromUnderMin).includes(person),
      );

      // Shuffle remaining eligible participants
      const shuffledRemaining = shuffleArray(remainingEligible, random);

      // Calculate how many more needed to complete the team
      const stillNeeded = teamSize - teams[round].length;
      const selectFromRemaining = Math.min(
        shuffledRemaining.length,
        stillNeeded,
      );

      // Select remaining team members
      for (let i = 0; i < selectFromRemaining; i++) {
        const person = shuffledRemaining[i];
        teams[round].push(person);
        appearances[person]++;
      }
    }

    // Verify team size
    if (teams[round].length !== teamSize) {
      return {
        error: `내부 오류: 라운드 ${round + 1}의 팀 인원이 ${teams[round].length}명입니다 (요청된 팀 인원: ${teamSize}명).`,
      };
    }
  }

  // Check if minimum appearances constraint is met
  const minConstraintMet = pool.every(
    (person) => appearances[person] >= minAppearances,
  );
  if (!minConstraintMet) {
    return {
      error:
        '최소 식청 횟수 제약을 만족할 수 없습니다. 최소 식청 횟수를 줄이거나 라운드 수를 늘려보세요.',
    };
  }

  return { teams, appearances };
}

// ===== DATE & FORMATTING UTILITIES =====

/**
 * Get previous, current, and next day in YYYYMMDD format
 * @param currentDate - Reference date
 * @returns Object with adjacent date strings
 */
export function getAdjacentDates(currentDate: Date): {
  previousDate: string;
  currentDateString: string;
  nextDate: string;
} {
  const current = dayjs(currentDate);
  const previous = current.subtract(1, 'day');
  const next = current.add(1, 'day');

  // Format as YYYYMMDD
  const formatDate = (date: dayjs.Dayjs): string => {
    return date.format('YYYYMMDD');
  };

  return {
    previousDate: formatDate(previous),
    currentDateString: formatDate(current),
    nextDate: formatDate(next),
  };
}

/**
 * Format date for display with colored day of week
 * @param date - Date to format
 * @returns Formatted date parts and color information
 */
export function formatDateForDisplay(date: Date): {
  dateText: string;
  dayText: string;
  dayColor: string;
} {
  const dateObj = dayjs(date);
  const dateText = dateObj.format('YYYY년 MM월 DD일');
  const day = dateObj.day(); // 0 is Sunday, 6 is Saturday
  const dayText = dateObj.format('ddd');

  // Determine day color
  let dayColor = 'text-foreground'; // default for weekdays
  if (day === 0) {
    dayColor = 'text-red-500'; // Sunday
  } else if (day === 6) {
    dayColor = 'text-blue-500'; // Saturday
  }

  return { dateText, dayText, dayColor };
}

/**
 * Check if date is a weekend
 * @param date - Date to check
 * @returns True if weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = dayjs(date).day();
  return day === 0 || day === 6;
}

/**
 * Get meal label based on round index and whether it's a weekend
 * @param roundIndex - Zero-based index of the round
 * @param isWeekend - Whether the date is a weekend
 * @returns Korean meal label
 */
export function getMealLabel(roundIndex: number, isWeekend: boolean): string {
  if (isWeekend) {
    return roundIndex === 0 ? '브런치' : '저녁';
  } else {
    switch (roundIndex) {
      case 0:
        return '아침';
      case 1:
        return '점심';
      case 2:
        return '저녁';
      default:
        return `라운드 ${roundIndex + 1}`;
    }
  }
}
