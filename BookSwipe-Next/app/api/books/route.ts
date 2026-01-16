import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const books = db
    .prepare(`
      SELECT
        id,
        title,
        author,
        genres,
        published_at,
        annotation,
        series_title,
        series_number,
        cover_url
      FROM Book
    `)
    .all();

  return NextResponse.json(books);
}
