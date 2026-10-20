
'use server';

import type { ResultRow } from '@/types/audit';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { generateCSV } from '@/lib/csvUtils';
import { scanWebsiteReal } from '@/lib/scanner';

// This is a mock function. In a real application, this would involve
// making a request to the website, parsing its content,
// or using a headless browser service.
async function mockScanWebsite(url: string): Promise<string> {
  console.log(`Simulating scan for: ${url}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 300));

  // Return only the description, without any "Scan results for..." prefix.
  const mockData = [
    "ExampleCorp's website uses React and Tailwind CSS. For inquiries, contact them via their web form.",
    "Minimal Web Design Co. built this static site with Jekyll. It's fast and typography-focused. Email: info@minimalweb.co",
    "This e-commerce site, likely Shopify, is product-centric. Support available via online chat or call (800) 555-0199.",
    "MyAwesomeBlog runs on WordPress with custom themes and SEO plugins. The admin is reachable at admin@myawesomeblog.net or by phone at 555-BLOG-NOW.",
    "OldTech Solutions uses a legacy system with outdated HTML and jQuery. Lacks responsiveness. Contact can be made via help@oldtech.com.",
    "Innovate Solutions Inc. showcases research. For collaboration opportunities, reach out to collaborate@innovatesolutions.io or call their main line: 555-0111.",
    "The Cozy Corner Cafe's site mentions catering services. For bookings, email cozycorner@email.host. No phone number is listed in this summary.",
    "Global Dynamics Ltd official page. For press inquiries, please use the contact form or email press@globaldynamics.com. Main switchboard details are not in this particular description.",
    "Landing page for TechNova Creations. Their app is coming soon. General inquiries can be sent to hello@technova.app.",
    "Local community events website. Organizers can be reached via their social media pages. No direct contact email or phone listed in this description.",
    "Artist's portfolio. For commissions, please use the contact form available on the 'Contact Us' page of their website. No direct email/phone provided here.",
    "Travel blog by a solo adventurer. The author is primarily reachable via Instagram DMs. No email/phone mentioned in the 'About' section blurb."
  ];
  
  try {
    new URL(url); 
    return mockData[Math.floor(Math.random() * mockData.length)];
  } catch (e) {
    console.error(`Invalid URL for scanning: ${url}`);
    return `Error: Could not scan invalid URL: ${url}.`;
  }
}

/**
 * Scans a website and returns a text description for the AI steps.
 * Set AUDIT_MOCK_SCAN=true to use canned sample data instead (demos and offline development).
 */
export async function scanWebsite(url: string): Promise<string> {
  if (process.env.AUDIT_MOCK_SCAN === 'true') return mockScanWebsite(url);
  return scanWebsiteReal(url);
}

// Helper function to extract Spreadsheet ID from URL
function extractSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

const SHEET_HEADERS = [
  'URL',
  'Status',
  'Scan Results',
  'Design Rating (1-10)',
  'Design Comments',
  'Tech Stack Rating (1-10)',
  'Tech Stack Comments',
  'Modernity Rating (1-10)',
  'Efficiency Rating (1-10)',
  'Technology Summary',
  'Email Address',
  'Phone Number',
  'Error',
];

export async function appendDataToGoogleSheet(sheetUrl: string, data: ResultRow): Promise<{ success: boolean; error?: string }> {
  console.log(`Attempting to append data to Google Sheet: ${sheetUrl}`);
  
  const spreadsheetId = extractSpreadsheetIdFromUrl(sheetUrl);
  if (!spreadsheetId) {
    const errMsg = 'Invalid Google Sheet URL. Could not extract Spreadsheet ID.';
    console.error(errMsg);
    return { success: false, error: errMsg };
  }

  let jwtClient: JWT;
  try {
    const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (inlineJson) {
      const creds = JSON.parse(inlineJson);
      jwtClient = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      const credentialsPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH;
      if (!credentialsPathEnv) {
        const errMsg = 'Google credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (recommended) or GOOGLE_APPLICATION_CREDENTIALS_PATH.';
        console.error(errMsg);
        return { success: false, error: errMsg };
      }
      const keyFilePath = path.resolve(process.cwd(), credentialsPathEnv);
      if (!fs.existsSync(keyFilePath)) {
        const errMsg = `Google service account key file not found at path: ${keyFilePath}.`;
        console.error(errMsg);
        return { success: false, error: errMsg };
      }
      jwtClient = new JWT({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }
  } catch (keyError: any) {
    const keyErrorMessage = `Failed to load Google service account credentials: ${keyError.message || 'Unknown error'}`;
    console.error(keyErrorMessage);
    return { success: false, error: keyErrorMessage };
  }

  try {
    await jwtClient.authorize();
    google.options({ auth: jwtClient });
  } catch (authError: any) {
    const authErrorMessage = `Google Sheets API authentication failed: ${authError.message || 'Unknown auth error'}`;
    console.error(authErrorMessage, authError); 
    return { success: false, error: authErrorMessage };
  }

  const sheets = google.sheets('v4');
  const range = 'Sheet1'; 

  const values = [
    [
      data.url,
      data.status === 'saving_to_sheet' ? (data.error ? 'error' : 'completed') : data.status,
      data.scanResults || 'N/A',
      data.designRating === undefined ? 'N/A' : data.designRating,
      data.designComments || 'N/A',
      data.technologyRating === undefined ? 'N/A' : data.technologyRating,
      data.technologyComments || 'N/A',
      data.modernityRating === undefined ? 'N/A' : data.modernityRating,
      data.efficiencyRating === undefined ? 'N/A' : data.efficiencyRating,
      data.technologySummary || 'N/A',
      data.email || 'N/A',
      data.phoneNumber || 'N/A',
      data.error || 'N/A',
    ],
  ];

  try {
    let sheetIsEmptyOrNoHeaders = false;
    try {
      const sheetState = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${range}!A1:M1`, // Check the entire potential header row
      });
      if (!sheetState.data.values || sheetState.data.values.length === 0 || 
          !sheetState.data.values[0] || sheetState.data.values[0].length === 0 ||
          SHEET_HEADERS.some((header, index) => sheetState.data.values![0][index] !== header) ) { 
        sheetIsEmptyOrNoHeaders = true;
      }
    } catch (e: any) {
      // If the sheet or range doesn't exist, an error will be thrown.
      // We assume this means it's empty or doesn't have headers.
      // Common error code for non-existent sheet/range is 400 with "Unable to parse range"
      console.warn(`Could not read from sheet ${spreadsheetId} (range: ${range}!A1:M1), assuming empty or no headers: ${e.message}`);
      sheetIsEmptyOrNoHeaders = true; 
    }

    if (sheetIsEmptyOrNoHeaders) {
      try {
        await sheets.spreadsheets.values.append({ // Use append to be safe, even if it might be an update for an empty sheet
          spreadsheetId,
          range, 
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS', // This will insert new rows
          requestBody: {
            values: [SHEET_HEADERS],
          },
        });
        console.log('Successfully appended headers to Google Sheet:', spreadsheetId);
      } catch (headerErr: any) {
        const headerErrMsg = `Failed to append headers to Google Sheet ${spreadsheetId}: ${headerErr.message || 'Unknown error'}`;
        console.error(headerErrMsg);
        // Don't return here; try to append data anyway, but the sheet might be headerless.
      }
    }

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range, 
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });
    console.log('Google Sheet updated successfully for URL:', data.url, response.data?.updates?.updatedRange);
    return { success: true };
  } catch (err: any) {
    const apiError = err.response?.data?.error;
    const errorMessage = apiError ? 
      `Failed to update Google Sheet for ${data.url}: ${apiError.message} (Code: ${apiError.code}, Status: ${apiError.status})` :
      `Failed to update Google Sheet for ${data.url}: ${err.message || 'Unknown sheet API error'}`;
    console.error('Error updating Google Sheet:', apiError || err.message || err);
    return { success: false, error: errorMessage };
  }
}

export async function saveBatchCSVToServer(batchData: ResultRow[], batchNumber: number): Promise<{ success: boolean; error?: string, filePath?: string }> {
  if (typeof process === 'undefined' || !process.cwd) {
    return { success: false, error: "Server-side file saving is not available in this environment." };
  }
  const outputDir = path.join(process.cwd(), '_audits_output');
  const fileName = `auditeagle_results_batch_${batchNumber}_${new Date().toISOString().split('T')[0]}.csv`;
  const filePath = path.join(outputDir, fileName);

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const csvString = generateCSV(batchData);
    fs.writeFileSync(filePath, csvString, 'utf-8');
    console.log(`Batch CSV ${batchNumber} saved to: ${filePath}`);
    return { success: true, filePath };
  } catch (error: any) {
    console.error(`Error saving batch CSV ${batchNumber} to server:`, error);
    return { success: false, error: error.message || 'Failed to save CSV file locally on server.' };
  }
}
    
