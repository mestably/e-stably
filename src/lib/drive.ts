/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App specifically for Auth to Google Drive
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request necessary Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initDriveAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in flow
export const googleDriveSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Drive Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const driveLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// --- GOOGLE DRIVE API OPERATIONS ---

export interface BackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  description?: string;
}

// 1. List backup files in Google Drive
export const listBackups = async (): Promise<BackupFile[]> => {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated');

  const q = encodeURIComponent("name contains 'horses_platform_backup_' and trashed = false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime+desc&fields=files(id,name,createdTime,size,description)`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to list backups: ${errorDetails}`);
  }

  const data = await response.json();
  return data.files || [];
};

// 2. Create a backup file in Google Drive
export const createBackup = async (backupData: any, customNote?: string): Promise<BackupFile> => {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated');

  // Step 1: Create the file metadata in Drive
  const filename = `horses_platform_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: filename,
      mimeType: 'application/json',
      description: customNote || 'نسخة احتياطية لملتقى الخيول العربية الأصيلة',
    }),
  });

  if (!metadataResponse.ok) {
    const errorDetails = await metadataResponse.text();
    throw new Error(`Failed to create file metadata: ${errorDetails}`);
  }

  const fileMetadata = await metadataResponse.json();
  const fileId = fileMetadata.id;

  // Step 2: Upload JSON content to fileId
  const contentResponse = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backupData, null, 2),
    }
  );

  if (!contentResponse.ok) {
    const errorDetails = await contentResponse.text();
    throw new Error(`Failed to upload backup content: ${errorDetails}`);
  }

  return {
    id: fileId,
    name: filename,
    createdTime: new Date().toISOString(),
    description: customNote,
  };
};

// 3. Download/read a backup file from Google Drive
export const downloadBackup = async (fileId: string): Promise<any> => {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to download backup: ${errorDetails}`);
  }

  return await response.json();
};

// 4. Delete a backup file from Google Drive
export const deleteBackup = async (fileId: string): Promise<boolean> => {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to delete backup file: ${errorDetails}`);
  }

  return true;
};
