# 식당청소 뺑뺑이 (Dining Hall Cleaning Duty Randomizer)

A Next.js 15 application for randomly generating cleaning duty teams for each meal.

## Features

- Create random teams for meal duties based on a pool of participants
- Set team size, number of rounds, and appearance constraints
- Use date seeds to automatically determine the number of rounds based on weekday/weekend
- Date-based navigation to plan duties for different days
- Fair distribution of duties with customizable appearance limits
- Clean, modern UI with Korean language support

## Technical Details

- Built with Next.js 15, React 19, and TypeScript 5.7
- UI components from shadcn/ui with Tailwind CSS
- Custom randomization algorithm based on Feistel network for deterministic, fair team selection
- Responsive design for all device sizes

## Getting Started

1. Clone this repository
2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration Options

- **참가자 명단 (Pool)**: Comma-separated list of participant names
- **팀 크기 (Team Size)**: Number of participants per team (defaults to 4)
- **라운드 수 (Rounds)**: Number of teams to generate (defaults to 1, or auto-determines based on date)
- **최소 출현 횟수 (Min Appearances)**: Minimum times a participant should be selected (defaults to 0)
- **최대 출현 횟수 (Max Appearances)**: Maximum times a participant can be selected (defaults to number of rounds)
- **시드값 (Seed)**: Random seed for consistent results, can be a number or date in YYYYMMDD format

## Deployment

Hosted at sandbox.mystwiz.net/sikcheong

## Author

원식K (mystwiz)
