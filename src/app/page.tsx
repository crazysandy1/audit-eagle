
'use client';

import type { NextPage } from 'next';
import { useEffect, ChangeEvent, useRef } from 'react';
import { AuditEagleLogo } from '@/components/AuditEagleLogo';
import { ResultsTable } from '@/components/ResultsTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { parseCSV, generateCSV } from '@/lib/csvUtils';
import { scanWebsite, appendDataToGoogleSheet, saveBatchCSVToServer } from './actions';
import type { RateWebsiteDesignOutput } from '@/ai/flows/rate-website-design';
import { rateWebsiteDesign } from '@/ai/flows/rate-website-design';
import type { RateWebsiteTechnologyOutput } from '@/ai/flows/rate-website-technology';
import { rateWebsiteTechnology } from '@/ai/flows/rate-website-technology';
import type { ExtractContactInfoOutput } from '@/ai/flows/extract-contact-info-flow';
import { extractContactInfo } from '@/ai/flows/extract-contact-info-flow';
import { Download, UploadCloud, Loader2, SheetIcon, StopCircle } from 'lucide-react';
import { useAuditContext } from '@/contexts/AuditContext';
import type { ResultRow } from '@/types/audit';
import { AppNavigation } from '@/components/AppNavigation'; 


const BATCH_SIZE = 200;

const Home: NextPage = () => {
  const {
    results, setResults,
    isProcessing, setIsProcessing,
    processedUrlsCount, setProcessedUrlsCount,
    googleSheetUrl, setGoogleSheetUrl,
    currentFile, setCurrentFile,
    totalUrlsToProcess, 
    setTotalUrlsToProcess,
    stopSignal, setStopSignal,
  } = useAuditContext(); 

  const { toast } = useToast();
  const stopSignalRef = useRef(stopSignal); 

  useEffect(() => {
    stopSignalRef.current = stopSignal;
  }, [stopSignal]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setCurrentFile(selectedFile);
        setResults([]);
        setProcessedUrlsCount(0);
        setTotalUrlsToProcess(0);
        setStopSignal(false); 
        toast({
          title: "File Selected",
          description: `${selectedFile.name} is ready for audit.`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a .csv file.",
          variant: "destructive",
        });
        setCurrentFile(null);
        event.target.value = '';
      }
    } else {
      setCurrentFile(null);
    }
  };

  const handleSaveBatchCSV = async (batchData: ResultRow[], batchNumber: number) => {
    if (batchData.length === 0) {
      toast({ title: `Batch ${batchNumber} Empty`, description: 'No results to save for this batch.', variant: 'default'});
      return;
    }
    try {
      const result = await saveBatchCSVToServer(batchData, batchNumber);
      if (result.success) {
        toast({ title: `Batch ${batchNumber} CSV Saved`, description: `File saved locally: ${result.filePath}`});
      } else {
        toast({ title: `Batch ${batchNumber} Save Error`, description: result.error || 'Failed to save batch CSV locally.', variant: 'destructive'});
      }
    } catch (error: any) {
      toast({ title: `Batch ${batchNumber} Save Error`, description: error.message || 'Failed to save batch CSV locally.', variant: 'destructive'});
      console.error(`Error saving batch CSV ${batchNumber}:`, error);
    }
  };

  const processUrls = async (urls: string[]) => {
    setTotalUrlsToProcess(urls.length);
    let currentResultsState: ResultRow[] = urls.map((url): ResultRow => ({
      id: crypto.randomUUID(),
      url,
      status: 'pending' as ResultRow['status'],
    }));
    setResults(currentResultsState);
    setProcessedUrlsCount(0);

    let localProcessedUrlsCount = 0;

    const MAX_REQUESTS_PER_MINUTE = 15;
    const ONE_MINUTE_MS = 60 * 1000;
    let requestCountThisMinute = 0;
    let currentMinuteStartTime = Date.now();

    for (let i = 0; i < currentResultsState.length; i++) {
      if (stopSignalRef.current) {
        toast({
          title: 'Audit Halted by User',
          description: `Processing stopped after ${localProcessedUrlsCount} URLs.`,
          variant: 'default',
        });
        break; 
      }
      
      if (requestCountThisMinute >= MAX_REQUESTS_PER_MINUTE) {
        const elapsedTimeThisMinute = Date.now() - currentMinuteStartTime;
        if (elapsedTimeThisMinute < ONE_MINUTE_MS) {
          const delayNeeded = ONE_MINUTE_MS - elapsedTimeThisMinute;
          toast({
            title: 'Rate Limiting Active',
            description: `Pausing for ${Math.ceil(delayNeeded / 1000)} seconds to respect API limits.`,
            duration: delayNeeded + 1000,
          });
          await new Promise(resolve => setTimeout(resolve, delayNeeded));
        }
        requestCountThisMinute = 0;
        currentMinuteStartTime = Date.now();
      }
      
      const currentRow = currentResultsState[i];
      let accumulatedErrorMessages = "";
      let processedRowData: Partial<ResultRow> = {};
      let scanData = "";

      try {
        currentResultsState = currentResultsState.map(r => r.id === currentRow.id ? { ...r, status: 'scanning' } : r);
        setResults([...currentResultsState]);
        
        scanData = await scanWebsite(currentRow.url);
        
        currentResultsState = currentResultsState.map(r => r.id === currentRow.id ? { ...r, scanResults: scanData, status: 'rating' } : r);
        setResults([...currentResultsState]);

        const [designResult, techResult, contactResult]: [RateWebsiteDesignOutput?, RateWebsiteTechnologyOutput?, ExtractContactInfoOutput?] = await Promise.all([
          rateWebsiteDesign({ url: currentRow.url, scanResults: scanData }).catch(e => {
            console.error(`Error in rateWebsiteDesign for ${currentRow.url}:`, e);
            accumulatedErrorMessages += `Design rating error: ${e.message || 'Unknown AI error'}. `;
            return undefined;
          }),
          rateWebsiteTechnology({ websiteUrl: currentRow.url, scanResults: scanData }).catch(e => {
            console.error(`Error in rateWebsiteTechnology for ${currentRow.url}:`, e);
            accumulatedErrorMessages += `Tech rating error: ${e.message || 'Unknown AI error'}. `;
            return undefined;
          }),
          extractContactInfo({ url: currentRow.url, websiteDescription: scanData }).catch(e => {
            console.error(`Error in extractContactInfo for ${currentRow.url}:`, e);
            accumulatedErrorMessages += `Contact extraction error: ${e.message || 'Unknown AI error'}. `;
            return undefined;
          })
        ]);
        
        processedRowData = {
          designRating: designResult?.designRating,
          designComments: designResult?.designComments,
          technologyRating: designResult?.technologyRating,
          technologyComments: designResult?.technologyComments,
          modernityRating: techResult?.modernityRating,
          efficiencyRating: techResult?.efficiencyRating,
          technologySummary: techResult?.summary,
          email: contactResult?.email,
          phoneNumber: contactResult?.phoneNumber,
        };
        
        if (accumulatedErrorMessages || !(designResult && techResult && contactResult)) {
            processedRowData.status = 'error';
            processedRowData.error = accumulatedErrorMessages || 'One or more AI tasks failed.';
        } else {
            processedRowData.status = 'completed';
        }

      } catch (error: any) { 
        console.error(`Error processing ${currentRow.url}:`, error);
        const scanErrorMessage = `Scan error: ${error.message || 'Unknown scan error'}. `;
        accumulatedErrorMessages += scanErrorMessage;
        processedRowData.status = 'error';
        processedRowData.error = (currentRow.error || "") + accumulatedErrorMessages;
        toast({
          title: `Error processing ${currentRow.url}`,
          description: error.message || 'An unknown error occurred.',
          variant: "destructive",
        });
      } finally {
        let finalRowDataForThisIteration = {
            ...currentRow, 
            ...processedRowData, 
            scanResults: scanData, 
            status: processedRowData.status || (accumulatedErrorMessages ? 'error' : 'completed'),
            error: (currentRow.error || "") + accumulatedErrorMessages + (processedRowData.error || "")
        };
        
        if (googleSheetUrl && finalRowDataForThisIteration.status !== 'error' && !stopSignalRef.current) { 
            finalRowDataForThisIteration = { ...finalRowDataForThisIteration, status: 'saving_to_sheet', sheetUpdateStatus: 'pending' };
            currentResultsState = currentResultsState.map(r => r.id === currentRow.id ? finalRowDataForThisIteration : r);
            setResults([...currentResultsState]);

            const sheetUpdateResult = await appendDataToGoogleSheet(googleSheetUrl, finalRowDataForThisIteration);

            if (sheetUpdateResult.success) {
                finalRowDataForThisIteration = { ...finalRowDataForThisIteration, status: finalRowDataForThisIteration.error ? 'error' : 'completed', sheetUpdateStatus: 'success' };
            } else {
                const sheetErrorMessage = sheetUpdateResult.error || 'Unknown error saving to Google Sheet.';
                finalRowDataForThisIteration = { 
                    ...finalRowDataForThisIteration, 
                    status: 'error', 
                    sheetUpdateStatus: 'error', 
                    error: (finalRowDataForThisIteration.error || "") + `Sheet save error: ${sheetErrorMessage}. ` 
                };
                toast({ title: `Google Sheet Error for ${currentRow.url}`, description: sheetErrorMessage, variant: 'destructive' });
            }
        } else {
             const baseStatus = finalRowDataForThisIteration.error ? 'error' : 'completed';
             finalRowDataForThisIteration = { ...finalRowDataForThisIteration, status: baseStatus };
        }
        
        currentResultsState = currentResultsState.map(r => r.id === currentRow.id ? finalRowDataForThisIteration : r);
        setResults([...currentResultsState]);

        localProcessedUrlsCount++;
        setProcessedUrlsCount(localProcessedUrlsCount); 

        if ((localProcessedUrlsCount % BATCH_SIZE === 0 || i === urls.length - 1) && !stopSignalRef.current) { 
            const batchNumber = Math.ceil(localProcessedUrlsCount / BATCH_SIZE);
            const startIndex = (batchNumber - 1) * BATCH_SIZE;
            const endIndex = localProcessedUrlsCount;
            const batchDataToSave = currentResultsState.slice(startIndex, endIndex);
            
            if (batchDataToSave.length > 0) {
                await handleSaveBatchCSV(batchDataToSave, batchNumber); 
            }
        }
        requestCountThisMinute++;
      }
    }

    if (!stopSignalRef.current && urls.length > 0) { 
      toast({
        title: "Audit Complete",
        description: `All ${urls.length} URLs have been processed. Batch CSVs saved to '_audits_output/' folder if run locally.`,
      });
    }
    setIsProcessing(false); 
    setStopSignal(false); 
  };

  const handleStartAudit = async () => {
    if (!currentFile) {
      toast({
        title: 'No File Selected',
        description: 'Please upload a CSV file first.',
        variant: 'destructive',
      });
      return;
    }
    if (googleSheetUrl) {
        try {
            new URL(googleSheetUrl);
            if (!googleSheetUrl.includes('docs.google.com/spreadsheets/d/')) {
                throw new Error('URL does not appear to be a valid Google Sheets link.');
            }
        } catch (e: any) {
            toast({
                title: 'Invalid Google Sheet URL',
                description: e.message || 'Please enter a valid URL for the Google Sheet.',
                variant: 'destructive',
            });
            return;
        }
    }
    
    setStopSignal(false); 
    setIsProcessing(true); 

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target?.result as string;
      if (!csvContent) {
        toast({ title: 'Error Reading File', description: 'Could not read the CSV file content.', variant: 'destructive'});
        setIsProcessing(false); 
        return;
      }
      try {
        const urls = parseCSV(csvContent);
        if (urls.length === 0) {
          toast({ title: 'No URLs Found', description: 'The CSV file does not contain any valid URLs or is empty.', variant: 'destructive'});
          setIsProcessing(false); 
          return;
        }
        toast({ title: 'Processing Started', description: `Found ${urls.length} URLs to process. Ensure this browser tab remains open.`});
        await processUrls(urls); 
      } catch (error: any) {
        toast({ title: 'CSV Parsing Error', description: error.message || 'Failed to parse CSV content.', variant: 'destructive'});
        setIsProcessing(false); 
      }
    };
    reader.onerror = () => {
        toast({ title: 'File Read Error', description: 'Failed to read the uploaded file.', variant: 'destructive'});
        setIsProcessing(false); 
    }
    reader.readAsText(currentFile);
  };

  const handleStopAudit = () => {
    setStopSignal(true);
    toast({
      title: "Audit Stop Requested",
      description: "The audit will attempt to stop after the current URL is processed. Please wait a moment.",
      variant: "default"
    });
  };

  const handleDownloadAllCSV = () => {
    if (results.length === 0) {
      toast({ title: 'No Results', description: 'There are no results to download.', variant: 'destructive'});
      return;
    }
    try {
      const csvString = generateCSV(results);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `auditeagle_results_all_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Download Started', description: 'All results CSV is downloading.'});
    } catch (error: any) {
      toast({ title: 'Download Error', description: error.message || 'Failed to generate CSV for download.', variant: 'destructive'});
    }
  };
  
  useEffect(() => {
    if (!currentFile) {
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }, [currentFile]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-border shadow-sm sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <AuditEagleLogo />
                <h1 className="text-3xl font-headline font-semibold text-primary">AuditEagle</h1>
            </div>
            <AppNavigation /> 
        </div>
        <p className="max-w-7xl mx-auto mt-1 text-muted-foreground font-body">
          Upload a CSV of website URLs. Batch CSVs (every ${BATCH_SIZE} URLs) are saved to <code>_audits_output/</code> in your project folder when run locally.
        </p>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Upload URLs & Configure</CardTitle>
            <CardDescription className="font-body">Select a CSV file. Optionally provide a Google Sheet URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="csv-upload" className="font-medium">CSV File</Label>
              <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="file:text-primary file:font-semibold" disabled={isProcessing} />
              {currentFile && <p className="text-sm text-muted-foreground">Selected file: {currentFile.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="google-sheet-url" className="font-medium">Google Sheet URL (Optional)</Label>
              <div className="flex items-center space-x-2">
                <SheetIcon className="h-5 w-5 text-muted-foreground" />
                <Input 
                  id="google-sheet-url" 
                  type="url" 
                  placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit" 
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  className="placeholder:text-muted-foreground/70"
                  disabled={isProcessing}
                />
              </div>
               <p className="text-xs text-muted-foreground">Ensure your sheet is shared with the service account email (and it has editor permissions) if using this feature. Ensure `GOOGLE_APPLICATION_CREDENTIALS_PATH` environment variable points to your JSON key file.</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleStartAudit} disabled={isProcessing || !currentFile} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {isProcessing ? `Processing... (${processedUrlsCount} / ${totalUrlsToProcess > 0 ? totalUrlsToProcess: results.length} done)` : 'Start Audit'}
              </Button>
              {isProcessing && (
                <Button onClick={handleStopAudit} variant="destructive" className="w-full sm:w-auto">
                  <StopCircle className="mr-2 h-4 w-4" /> Stop Audit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* This is the section for displaying results and the download button */}
        {results.length > 0 && !isProcessing && ( 
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-headline text-2xl">Audit Results ({results.length} total)</CardTitle>
                <CardDescription className="font-body">Review the scan and AI rating for each website. Batch CSVs (every ${BATCH_SIZE} URLs) are saved locally to <code>_audits_output/</code>.</CardDescription>
              </div>
              <Button onClick={handleDownloadAllCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download All Results CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResultsTable results={results} />
            </CardContent>
          </Card>
        )}
      </main>
      <footer className="py-4 px-4 sm:px-6 lg:px-8 border-t border-border text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} AuditEagle. All rights reserved. 
        Processing requires this browser tab to remain open. <br />
        For deployment on platforms like Vercel/Netlify, true background processing and persistent server-side CSV storage would require a different architecture (e.g., using job queues and cloud storage).
      </footer>
    </div>
  );
};

export default Home;
    

    