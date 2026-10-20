export type RowStatus = 'pending' | 'scanning' | 'rating' | 'saving_to_sheet' | 'completed' | 'error';
export type SheetUpdateStatus = 'pending' | 'success' | 'error';

/** One website being audited and everything learned about it. */
export interface ResultRow {
  id: string;
  url: string;
  status: RowStatus;
  scanResults?: string;
  designRating?: number;
  designComments?: string;
  technologyRating?: number;
  technologyComments?: string;
  modernityRating?: number;
  efficiencyRating?: number;
  technologySummary?: string;
  email?: string;
  phoneNumber?: string;
  error?: string;
  sheetUpdateStatus?: SheetUpdateStatus;
}
