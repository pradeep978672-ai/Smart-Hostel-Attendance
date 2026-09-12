import { NextResponse } from 'next/server';

/**
 * GET /api/server-time
 * Returns the current server time so clients can display and validate
 * the attendance window using server clock, not the student's device clock.
 */
export async function GET() {
  const now = new Date();
  return NextResponse.json(
    {
      iso: now.toISOString(),
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      timestamp: now.getTime(),
    },
    {
      headers: {
        // Never cache — always return fresh server time
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
