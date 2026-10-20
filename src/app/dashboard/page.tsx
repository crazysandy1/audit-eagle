
'use client';

import type { NextPage } from 'next';
import Link from 'next/link';
import { AuditEagleLogo } from '@/components/AuditEagleLogo';
import { ResultsTable } from '@/components/ResultsTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Label } from '@/components/ui/label';
import { useAuditContext } from '@/contexts/AuditContext';
import { AppNavigation } from '@/components/AppNavigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, ListChecks, Loader2, SheetIcon, ExternalLink, StopCircle } from 'lucide-react'; // Added StopCircle
import { useToast } from '@/hooks/use-toast'; // Added useToast

const DashboardPage: NextPage = () => {
  const {
    results,
    isProcessing,
    setIsProcessing, // Added for stop button
    setStopSignal,   // Added for stop button
    processedUrlsCount,
    googleSheetUrl,
    currentFile,
    totalUrlsToProcess,
  } = useAuditContext();

  const { toast } = useToast(); // Initialize toast

  const errorsCount = results.filter(r => r.status === 'error').length;
  const completedCount = results.filter(r => r.status === 'completed' || r.sheetUpdateStatus === 'success').length;
  const progressPercentage = totalUrlsToProcess > 0 ? (processedUrlsCount / totalUrlsToProcess) * 100 : 0;

  const getOverallStatus = () => {
    if (isProcessing) return { text: "Audit in Progress...", icon: <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-500" />, color: "text-blue-500" };
    if (results.length > 0 && !isProcessing) return { text: "Audit Complete", icon: <CheckCircle className="h-5 w-5 mr-2 text-green-500" />, color: "text-green-500" };
    return { text: "No Audit Active", icon: <ListChecks className="h-5 w-5 mr-2 text-muted-foreground" />, color: "text-muted-foreground" };
  };

  const overallStatus = getOverallStatus();

  const handleStopAuditOnDashboard = () => {
    setStopSignal(true);
    toast({
      title: "Audit Stop Requested from Dashboard",
      description: "The audit will attempt to stop after the current URL is processed. Please wait a moment.",
      variant: "default"
    });
    // setIsProcessing(false) will be handled by the processUrls function in page.tsx
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-border shadow-sm sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AuditEagleLogo />
            <h1 className="text-3xl font-headline font-semibold text-primary">AuditEagle - Dashboard</h1>
          </div>
          <AppNavigation />
        </div>
         <p className="max-w-7xl mx-auto mt-1 text-muted-foreground font-body">
          Monitor the progress of your current website audit and access full history.
        </p>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center">
              {overallStatus.icon}
              <CardTitle className={`font-headline text-2xl ${overallStatus.color}`}>Current Audit: {overallStatus.text}</CardTitle>
            </div>
            {isProcessing && (
              <Button onClick={handleStopAuditOnDashboard} variant="destructive" size="sm">
                <StopCircle className="mr-2 h-4 w-4" /> Stop Audit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
          <CardDescription className="font-body">
              {isProcessing && currentFile ? `Processing file: ${currentFile.name}. ` : ''}
              {!isProcessing && results.length > 0 && currentFile ? `Results for file: ${currentFile.name}. ` : ''}
              {!isProcessing && results.length === 0 ? 'Upload a file on the Audit Setup page to begin. ': ''}
              {googleSheetUrl && (isProcessing || results.length > 0) ? `Current session results are being saved to: ${googleSheetUrl}` : ''}
            </CardDescription>
            {(isProcessing || results.length > 0) && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <Card className="p-4">
                    <CardDescription>Total URLs</CardDescription>
                    <CardTitle className="text-2xl">{totalUrlsToProcess}</CardTitle>
                  </Card>
                  <Card className="p-4">
                    <CardDescription>Processed</CardDescription>
                    <CardTitle className="text-2xl">{processedUrlsCount}</CardTitle>
                  </Card>
                   <Card className="p-4">
                    <CardDescription className="text-green-600">Successful</CardDescription>
                    <CardTitle className="text-2xl text-green-600">{completedCount}</CardTitle>
                  </Card>
                  <Card className="p-4">
                    <CardDescription className="text-destructive">Errors</CardDescription>
                    <CardTitle className="text-2xl text-destructive">{errorsCount}</CardTitle>
                  </Card>
                </div>
                <div>
                  <Label htmlFor="audit-progress" className="text-sm font-medium">
                    Overall Progress ({processedUrlsCount} / {totalUrlsToProcess})
                  </Label>
                  <Progress id="audit-progress" value={progressPercentage} className="w-full mt-1 h-3" />
                   <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercentage.toFixed(0)}% Complete</p>
                </div>
              </>
            )}
            {(isProcessing || results.length > 0) && (
              <div>
                <h3 className="text-xl font-semibold mb-3 mt-6">Detailed Results (Current Session):</h3>
                <ResultsTable results={results} />
              </div>
            )}
            {!isProcessing && results.length === 0 && (
              <div className="text-center py-10">
                <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-lg font-medium text-muted-foreground">No current audit data to display.</p>
                <p className="text-sm text-muted-foreground">Please start an audit from the 'Audit Setup' page.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <div className="flex items-center">
              <SheetIcon className="h-6 w-6 mr-2 text-primary" />
              <CardTitle className="font-headline text-2xl">Full Audit History</CardTitle>
            </div>
            <CardDescription className="font-body">
              All completed audit results are permanently stored in your designated Google Sheet. This provides a comprehensive log of all past audits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {googleSheetUrl ? (
              <>
                <p className="mb-4 text-sm ">
                  Your primary audit log is maintained in the following Google Sheet:
                  <br />
                  <a href={googleSheetUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all font-medium inline-flex items-center">
                    {googleSheetUrl} <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </p>
                <Button asChild>
                  <a href={googleSheetUrl} target="_blank" rel="noopener noreferrer" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <SheetIcon className="mr-2 h-4 w-4" />
                    Open Google Sheet Log
                  </a>
                </Button>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                <SheetIcon className="mx-auto h-10 w-10 mb-2 text-primary/70" />
                <p className="font-medium">Persistent Audit History Not Configured</p>
                <p className="text-sm mt-1">
                  To maintain a persistent history of all your audits, please provide a Google Sheet URL on the{' '}
                  <Link href="/" className="text-primary hover:underline font-semibold">
                    Audit Setup page
                  </Link>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
       <footer className="py-4 px-4 sm:px-6 lg:px-8 border-t border-border text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} AuditEagle. All rights reserved. 
        Audit processing requires the application browser tab to remain open.
      </footer>
    </div>
  );
};

export default DashboardPage;
