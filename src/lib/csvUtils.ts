
import type { ResultRow } from '@/types/audit';

export function parseCSV(csvContent: string): string[] {
  const lines = csvContent.split(/\r\n|\n|\r/);
  const urls: string[] = [];
  const potentialHeader = lines[0]?.toLowerCase() || "";
  const startLine = (potentialHeader.includes("url") || potentialHeader.includes("website")) ? 1 : 0;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; 

    const columns = line.split(','); 
    let potentialUrl = columns[0]?.trim();

    if (potentialUrl) {
      if (potentialUrl.startsWith('"') && potentialUrl.endsWith('"')) {
        potentialUrl = potentialUrl.substring(1, potentialUrl.length - 1);
      }
      
      try {
        const urlObj = new URL(potentialUrl.startsWith('http://') || potentialUrl.startsWith('https://') ? potentialUrl : `https://${potentialUrl}`);
        urls.push(urlObj.href);
      } catch (e) {
        console.warn(`Skipping invalid or unparsable URL: ${potentialUrl}`);
      }
    }
  }
  return urls;
}

export function generateCSV(data: ResultRow[]): string {
  if (data.length === 0) return '';

  const headers = [
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
    'Email Address', // New Header
    'Phone Number', // New Header
    'Error',
  ];

  const escapeCSVField = (field: string | number | undefined | null): string => {
    if (field === undefined || field === null) return 'N/A'; // Default to N/A for CSV
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };
  
  const rows = data.map(row =>
    [
      escapeCSVField(row.url),
      escapeCSVField(row.status),
      escapeCSVField(row.scanResults),
      escapeCSVField(row.designRating),
      escapeCSVField(row.designComments),
      escapeCSVField(row.technologyRating),
      escapeCSVField(row.technologyComments),
      escapeCSVField(row.modernityRating),
      escapeCSVField(row.efficiencyRating),
      escapeCSVField(row.technologySummary),
      escapeCSVField(row.email), // New Data
      escapeCSVField(row.phoneNumber), // New Data
      escapeCSVField(row.error),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
