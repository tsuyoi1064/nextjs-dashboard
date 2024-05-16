'use server'

import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

export async function GET() {
  noStore();
  const url: string = `http://localhost:8080/movies`;
  try {
    const res = await fetch(url)
    const data = await res.json()
    return Response.json({ data })
  } catch (error) {
    console.log('API Error');
    redirect('/');
  }
}
