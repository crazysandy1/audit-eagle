
'use server';
/**
 * @fileOverview AI flow to extract contact information (email, phone) from website description.
 *
 * - extractContactInfo - Extracts contact information.
 * - ExtractContactInfoInput - The input type for extractContactInfo.
 * - ExtractContactInfoOutput - The output type for extractContactInfo.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractContactInfoInputSchema = z.object({
  url: z.string().describe('The URL of the website. This is FOR CONTEXT ONLY and MUST NOT be used to infer contact details not explicitly present in the websiteDescription.'),
  websiteDescription: z
    .string()
    .describe('A general description of the website, its content, or purpose. This is the SOLE source of information for extraction.'),
});
export type ExtractContactInfoInput = z.infer<typeof ExtractContactInfoInputSchema>;

const ExtractContactInfoOutputSchema = z.object({
  email: z.string().describe('The extracted email address. Must be the exact string "N/A" if not explicitly found in the websiteDescription.'),
  phoneNumber: z.string().describe('The extracted phone number. Must be the exact string "N/A" if not explicitly found in the websiteDescription.'),
});
export type ExtractContactInfoOutput = z.infer<typeof ExtractContactInfoOutputSchema>;

export async function extractContactInfo(input: ExtractContactInfoInput): Promise<ExtractContactInfoOutput> {
  return extractContactInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractContactInfoPrompt',
  input: {schema: ExtractContactInfoInputSchema},
  output: {schema: ExtractContactInfoOutputSchema},
  prompt: `You are a highly skilled data extraction specialist. Your task is to identify a primary contact email address and phone number using *ONLY* the provided 'websiteDescription'.

Contextual URL (DO NOT use for extraction unless details are also in websiteDescription): {{{url}}}
Website Description (Your ONLY source for extraction):
{{{websiteDescription}}}

Instructions:
1.  Your SOLE source of information for extraction is the 'websiteDescription' provided above.
2.  Meticulously scan the 'websiteDescription' for any explicitly stated email addresses (e.g., "email us at contact@example.com", "info@company.net") or phone numbers (e.g., "call us on +1-555-123-4567", "(123) 456-7890").
3.  If an email address is explicitly stated, extract it exactly as it appears.
4.  If a phone number is explicitly stated, extract it exactly as it appears.
5.  DO NOT INVENT or GUESS email addresses or phone numbers. Do not try to derive them from company names, the URL, or any other source if they are not explicitly written out as contact details in the 'websiteDescription'.
6.  If an email address is NOT explicitly found in the 'websiteDescription', the value for 'email' MUST be the exact string "N/A". Do not return an empty string or null.
7.  If a phone number is NOT explicitly found in the 'websiteDescription', the value for 'phoneNumber' MUST be the exact string "N/A". Do not return an empty string or null.
8.  You MUST return a JSON object with both 'email' and 'phoneNumber' fields. Each field must contain the extracted information or the exact string "N/A".

Examples of how to respond:

If 'websiteDescription' is "Reach out to support@example.com or call 123-456-7890 for help.":
{
  "email": "support@example.com",
  "phoneNumber": "123-456-7890"
}

If 'websiteDescription' is "Our main contact is help@domain.org. We do not list a phone number.":
{
  "email": "help@domain.org",
  "phoneNumber": "N/A"
}

If 'websiteDescription' is "Phone: (555) 000-1111. For email, use our web form.":
{
  "email": "N/A",
  "phoneNumber": "(555) 000-1111"
}

If 'websiteDescription' is "This website provides general information but no direct contact details are listed in this summary.":
{
  "email": "N/A",
  "phoneNumber": "N/A"
}

If 'websiteDescription' is "Welcome to Example Site. Our team is happy to help.":
{
  "email": "N/A",
  "phoneNumber": "N/A"
}
`,
  config: {
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

const extractContactInfoFlow = ai.defineFlow(
  {
    name: 'extractContactInfoFlow',
    inputSchema: ExtractContactInfoInputSchema,
    outputSchema: ExtractContactInfoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure that if output is null (e.g. safety reasons, rare model issue), we still conform to the schema with "N/A"
    return output || { email: "N/A", phoneNumber: "N/A" };
  }
);

