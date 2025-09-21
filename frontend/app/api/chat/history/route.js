import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gcsKey = searchParams.get('gcs_key');

    if (!gcsKey) {
      return NextResponse.json(
        { error: 'Missing required parameter: gcs_key' },
        { status: 400 }
      );
    }

    const dashboardApiUrl = process.env.DASHBOARD_API_URL || "http://34.170.38.22:8000/genaiexchange";
    
    const response = await fetch(
      `${dashboardApiUrl}/history?gcs_key=${encodeURIComponent(gcsKey)}`,
      {
        method: 'GET',
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
    console.error('Error in chat history API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history from dashboard API' },
      { status: 500 }
    );
  }
}
