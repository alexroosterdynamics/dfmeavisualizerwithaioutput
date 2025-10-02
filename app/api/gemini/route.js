// Optional: API route for Gemini (if you prefer server-side calls)
// This keeps the API key more secure on the server side
// To use this, update DFMEAAIAssistant.js to call this endpoint instead

import { NextResponse } from 'next/server';

const GEMINI_API_KEY = 'AIzaSyBIiVho0owJ2QW7EkGLw70BWUrXP8czbp0';

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'Gemini API error' },
        { status: 500 }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}