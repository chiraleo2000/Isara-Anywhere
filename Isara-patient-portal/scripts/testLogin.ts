#!/usr/bin/env tsx

/**
 * Test Login Verification Script
 *
 * This script verifies that the demo user can be found and authenticated
 * by reading from GCS just like the authService does.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'izara-telemedicine-dd0b6abe2bc8.json');
const BUCKET = 'izara-users-credentials';

interface ServiceAccountKey {
  private_key: string;
  client_email: string;
}

async function getAccessToken(): Promise<string> {
  const serviceAccountKey: ServiceAccountKey = JSON.parse(
    fs.readFileSync(CREDENTIALS_PATH, 'utf-8')
  );

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.full_control',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(serviceAccountKey.private_key, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await response.json();
  return tokenData.access_token;
}

async function listUsers(token: string): Promise<any[]> {
  const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o?prefix=users/`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  return data.items || [];
}

async function readJSON(token: string, filePath: string): Promise<any> {
  const encodedPath = encodeURIComponent(filePath);
  const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodedPath}?alt=media`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return await response.json();
}

async function testLogin(email: string, password: string): Promise<void> {
  console.log('='.repeat(60));
  console.log('  Login Test');
  console.log('='.repeat(60));
  console.log(`\nTesting login for: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Expected passwordHash: ${Buffer.from(password).toString('base64')}`);
  console.log();

  const token = await getAccessToken();
  console.log('Got access token');

  const files = await listUsers(token);
  console.log(`Found ${files.length} user files in bucket`);

  for (const file of files) {
    // Skip non-JSON files and nested paths
    if (!file.name.endsWith('.json') || file.name.split('/').length > 2) {
      continue;
    }

    console.log(`\nChecking file: ${file.name}`);

    try {
      const storedUser = await readJSON(token, file.name);
      console.log(`  Email in file: ${storedUser.email}`);

      if (storedUser.email === email) {
        console.log('\n  FOUND USER!');
        console.log(`  Stored passwordHash: ${storedUser.passwordHash}`);

        const inputHash = Buffer.from(password).toString('base64');
        console.log(`  Input passwordHash:  ${inputHash}`);

        if (storedUser.passwordHash === inputHash) {
          console.log('\n  PASSWORD MATCH - Login would succeed!');
          console.log('\n  User Profile:');
          console.log(`    ID: ${storedUser.id}`);
          console.log(`    Name: ${storedUser.profile.name}`);
          console.log(`    Email: ${storedUser.profile.email}`);
          console.log(`    Phone: ${storedUser.profile.phone}`);
          console.log(`    Blood Type: ${storedUser.profile.bloodType}`);
        } else {
          console.log('\n  PASSWORD MISMATCH - Login would fail!');
        }
        return;
      }
    } catch (error: any) {
      console.log(`  Error reading file: ${error.message}`);
    }
  }

  console.log('\nUser not found in bucket!');
}

// Run the test
testLogin('demo.test@gmail.com', 'P@ssw0rd').catch(console.error);
