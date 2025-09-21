import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gcsKey = searchParams.get('gcs_key');
    const message = searchParams.get('message');

    if (!gcsKey || !message) {
      return NextResponse.json(
        { error: 'Missing required parameters: gcs_key and message' },
        { status: 400 }
      );
    }

    const dashboardApiUrl = process.env.DASHBOARD_API_URL || "http://34.170.38.22:8000/genaiexchange";
    
    const response = await fetch(
      `${dashboardApiUrl}/chat/message?gcs_key=${encodeURIComponent(gcsKey)}&message=${encodeURIComponent(message)}`,
      { 
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Dashboard API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in chat message API:', error);
    return NextResponse.json(
      { error: 'Failed to send message to dashboard API' },
      { status: 500 }
    );
  }
}
