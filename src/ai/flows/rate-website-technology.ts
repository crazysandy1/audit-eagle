'use server';

/**
 * @fileOverview Rates the technology stack of a website based on scan results.
 *
 * - rateWebsiteTechnology - A function that rates the website's technology stack.
 * - RateWebsiteTechnologyInput - The input type for the rateWebsiteTechnology function.
 * - RateWebsiteTechnologyOutput - The return type for the rateWebsiteTechnology function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RateWebsiteTechnologyInputSchema = z.object({
  websiteUrl: z.string().describe('The URL of the website to rate.'),
  scanResults: z.string().describe('The scan results of the website, including technologies used.'),
});
export type RateWebsiteTechnologyInput = z.infer<typeof RateWebsiteTechnologyInputSchema>;

const RateWebsiteTechnologyOutputSchema = z.object({
  modernityRating: z.number().describe('A rating (1-10) of the website technology stack modernity.'),
  efficiencyRating: z.number().describe('A rating (1-10) of the website technology stack efficiency.'),
  summary: z.string().describe('A summary of the website technology stack assessment.'),
});
export type RateWebsiteTechnologyOutput = z.infer<typeof RateWebsiteTechnologyOutputSchema>;

export async function rateWebsiteTechnology(input: RateWebsiteTechnologyInput): Promise<RateWebsiteTechnologyOutput> {
  return rateWebsiteTechnologyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rateWebsiteTechnologyPrompt',
  input: {schema: RateWebsiteTechnologyInputSchema},
  output: {schema: RateWebsiteTechnologyOutputSchema},
  prompt: `You are an expert in web technologies. Analyze the provided scan results of a website and rate its technology stack in terms of modernity and efficiency.

Website URL: {{{websiteUrl}}}
Scan Results: {{{scanResults}}}

Provide a modernityRating (1-10), an efficiencyRating (1-10), and a brief summary of your assessment.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const rateWebsiteTechnologyFlow = ai.defineFlow(
  {
    name: 'rateWebsiteTechnologyFlow',
    inputSchema: RateWebsiteTechnologyInputSchema,
    outputSchema: RateWebsiteTechnologyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
