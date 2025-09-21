// app/api/get-signed-url/route.js

import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const gcs = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
});

const bucket = gcs.bucket(process.env.GCS_BUCKET_NAME);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ message: 'File path is required' }, { status: 400 });
    }

    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    };

    const [url] = await file.getSignedUrl(options);

    return NextResponse.json({ url });

  } catch (error) {
    console.error('Signed URL Error:', error);
    return NextResponse.json({ message: 'Could not generate signed URL', error: error.message }, { status: 500 });
  }
}