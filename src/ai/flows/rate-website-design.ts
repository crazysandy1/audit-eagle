'use server';

/**
 * @fileOverview AI flow to rate website design based on scan results.
 *
 * - rateWebsiteDesign - Rates a website's design and technology.
 * - RateWebsiteDesignInput - The input type for rateWebsiteDesign.
 * - RateWebsiteDesignOutput - The output type for rateWebsiteDesign.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RateWebsiteDesignInputSchema = z.object({
  url: z.string().describe('The URL of the website to rate.'),
  scanResults: z
    .string()
    .describe('The scan results containing design and technology elements.'),
});
export type RateWebsiteDesignInput = z.infer<typeof RateWebsiteDesignInputSchema>;

const RateWebsiteDesignOutputSchema = z.object({
  designRating: z
    .number()
    .describe('A rating (1-10) of the website design based on the scan results.'),
  technologyRating: z
    .number()
    .describe('A rating (1-10) of the website technology based on the scan results.'),
  designComments: z.string().describe('Comments on the website design.'),
  technologyComments: z.string().describe('Comments on the website technology.'),
});
export type RateWebsiteDesignOutput = z.infer<typeof RateWebsiteDesignOutputSchema>;

export async function rateWebsiteDesign(input: RateWebsiteDesignInput): Promise<RateWebsiteDesignOutput> {
  return rateWebsiteDesignFlow(input);
}

const rateWebsiteDesignPrompt = ai.definePrompt({
  name: 'rateWebsiteDesignPrompt',
  input: {schema: RateWebsiteDesignInputSchema},
  output: {schema: RateWebsiteDesignOutputSchema},
  prompt: `You are an AI expert in website design and technology.

You will receive scan results of a website and provide a rating (1-10) for its design and technology, along with comments.

URL: {{{url}}}
Scan Results: {{{scanResults}}}

Provide the ratings and comments in the following JSON format:
{
  "designRating": <design rating>,
  "technologyRating": <technology rating>,
  "designComments": "<design comments>",
  "technologyComments": "<technology comments>"
}
`,
});

const rateWebsiteDesignFlow = ai.defineFlow(
  {
    name: 'rateWebsiteDesignFlow',
    inputSchema: RateWebsiteDesignInputSchema,
    outputSchema: RateWebsiteDesignOutputSchema,
  },
  async input => {
    const {output} = await rateWebsiteDesignPrompt(input);
    return output!;
  }
);
