import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;

if (!serviceAccountBase64) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_B64 is not set in .env.local');
}

const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
);

// Initialize Firebase Admin once
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Reuse same credentials for GCS
const gcs = new Storage({
  projectId: serviceAccount.project_id,
  credentials: serviceAccount,
});

const bucket = gcs.bucket(process.env.GCS_BUCKET_NAME);

export async function POST(request) {
  try {
    // Verify ID token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid auth header' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userUid = decodedToken.uid;

    // Handle form data
    const formData = await request.formData();
    const files = formData.getAll('documents');
    const sessionId = formData.get('sessionId');
    const startupName = formData.get('name'); // Get startup name from formData

    if (!files.length) {
      return NextResponse.json({ message: 'No files uploaded' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ message: 'Missing sessionId' }, { status: 400 });
    }

    if (!startupName) {
      return NextResponse.json({ message: 'Missing startup name' }, { status: 400 });
    }

    // Generate filenames using startup name + number format
    const uploaded = await Promise.all(
      files.map(async (file, index) => {
        // Get file extension from original filename
        const originalName = file.name;
        const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
        
        // Create new filename: startupName_number.extension
        const newFileName = `${startupName.replace(/[^a-zA-Z0-9]/g, '_')}_${index + 1}${fileExtension}`;
        const gcsPath = `${userUid}/${sessionId}/${newFileName}`;
        
        const blob = bucket.file(gcsPath);
        await blob.save(Buffer.from(await file.arrayBuffer()), { resumable: false });
        return gcsPath;
      })
    );

    return NextResponse.json({ message: 'Upload success', paths: uploaded });
  } catch (err) {
    console.error('Upload Error:', err);
    return NextResponse.json({ message: 'Upload failed', error: err.message }, { status: 500 });
  }
}
