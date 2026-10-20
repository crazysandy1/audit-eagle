
'use client';

import type { ResultRow } from '@/types/audit';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Brain,
  Palette,
  Cpu,
  Sparkles,
  Gauge,
  HelpCircle,
  Loader2,
  Mail, 
  Phone, 
  SheetIcon, // For Google Sheet status
  UploadCloudIcon, // Placeholder, consider better icon
} from 'lucide-react';

interface ResultsTableProps {
  results: ResultRow[];
}

const StatusIcon = ({ status, sheetUpdateStatus }: { status: ResultRow['status'], sheetUpdateStatus?: ResultRow['sheetUpdateStatus'] }) => {
  if (status === 'saving_to_sheet') {
    if (sheetUpdateStatus === 'pending') {
      return <span title='Saving to Sheet...'><Loader2 className="h-4 w-4 text-blue-500 animate-spin" /></span>;
    } else if (sheetUpdateStatus === 'success') {
      return <span title='Saved to Sheet'><CheckCircle2 className="h-4 w-4 text-green-500" /></span>;
    } else if (sheetUpdateStatus === 'error') {
      return <span title='Sheet Save Error'><AlertTriangle className="h-4 w-4 text-red-500" /></span>;
    }
  }

  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'scanning':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'rating':
      return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const RatingCell = ({ label, value, icon: Icon }: { label: string, value?: number, icon: React.ElementType }) => {
  if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger className="flex items-center space-x-1 justify-center">
          <Icon className="h-4 w-4 mr-1 text-primary" />
          <span>{value}/10</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}: {value}/10</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ResultsTable({ results }: ResultsTableProps) {
  if (!results || results.length === 0) {
    return <p className="text-center text-muted-foreground">No results to display yet. Upload a CSV and start the audit.</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px] min-w-[200px]">URL</TableHead>
            <TableHead className="w-[150px] min-w-[120px]">Status</TableHead>
            <TableHead className="text-center min-w-[100px]">Design</TableHead>
            <TableHead className="text-center min-w-[100px]">Tech Stack</TableHead>
            <TableHead className="text-center min-w-[100px]">Modernity</TableHead>
            <TableHead className="text-center min-w-[100px]">Efficiency</TableHead>
            <TableHead className="min-w-[150px]">Email</TableHead> 
            <TableHead className="min-w-[150px]">Phone</TableHead> 
            <TableHead className="min-w-[150px]">Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium truncate max-w-xs" title={row.url}>
                <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary break-all">
                  {row.url}
                </a>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <StatusIcon status={row.status} sheetUpdateStatus={row.sheetUpdateStatus} />
                  <Badge variant={
                    row.status === 'completed' ? (row.sheetUpdateStatus === 'success' ? 'default' : 'outline') : // Differentiate if saved to sheet
                    row.status === 'error' ? 'destructive' : 
                    row.status === 'saving_to_sheet' ? 'secondary' : 'secondary'
                  } className="capitalize">
                    {row.status === 'saving_to_sheet' ? `Sheet: ${row.sheetUpdateStatus || 'Pending'}` : row.status}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <RatingCell label="Design Rating" value={row.designRating} icon={Palette} />
              </TableCell>
              <TableCell className="text-center">
                 <RatingCell label="Technology Stack Rating" value={row.technologyRating} icon={Cpu} />
              </TableCell>
              <TableCell className="text-center">
                <RatingCell label="Modernity Rating" value={row.modernityRating} icon={Sparkles} />
              </TableCell>
              <TableCell className="text-center">
                <RatingCell label="Efficiency Rating" value={row.efficiencyRating} icon={Gauge} />
              </TableCell>
              <TableCell className="max-w-xs truncate" title={row.email || undefined}> 
                {row.email && row.email !== "N/A" ? (
                  <span className="flex items-center text-primary">
                    <Mail className="h-4 w-4 mr-1 text-muted-foreground" /> {row.email}
                  </span>
                ) : (
                  'N/A'
                )}
              </TableCell>
              <TableCell className="max-w-xs truncate" title={row.phoneNumber || undefined}> 
                 {row.phoneNumber && row.phoneNumber !== "N/A" ? (
                  <span className="flex items-center text-primary">
                    <Phone className="h-4 w-4 mr-1 text-muted-foreground" /> {row.phoneNumber}
                  </span>
                ) : (
                  'N/A'
                )}
              </TableCell>
              <TableCell className="text-destructive max-w-xs truncate" title={row.error}>
                {row.error || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

    
