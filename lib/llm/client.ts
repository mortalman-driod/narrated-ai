import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface LLMRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust Gemini caller with 6-model capacity waterfall and instant rotation on high-demand spikes
 */
async function callGeminiWithRetry(options: LLMRequestOptions, apiKey: string): Promise<any> {
  const configuredModel = process.env.GEMINI_MODEL;
  const verifiedFleet = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite'
  ];

  // Prioritize configured model if provided, then waterfall through all available capacity pools
  const models = configuredModel && !verifiedFleet.includes(configuredModel)
    ? [configuredModel, ...verifiedFleet]
    : [
        ...(configuredModel ? [configuredModel] : []),
        ...verifiedFleet.filter((m) => m !== configuredModel)
      ];

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(
          endpoint,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: `${options.systemPrompt}\n\nTask Directive:\n${options.userPrompt}` }]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxOutputTokens ?? 8192
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 45000
          }
        );

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Empty candidate received from Gemini API');
        console.log(`[Gemini] Successfully generated with model: ${model}`);
        return JSON.parse(rawText);
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const errMsg = err.response?.data?.error?.message || err.message || '';
        const isHighDemand =
          status === 503 ||
          errMsg.toLowerCase().includes('high demand') ||
          errMsg.toLowerCase().includes('overloaded') ||
          errMsg.toLowerCase().includes('temporarily unavailable') ||
          errMsg.toLowerCase().includes('spikes in demand');

        console.warn(`[Gemini] Model ${model} attempt ${attempt}/2 failed (${status || err.message}): ${errMsg.slice(0, 120)}`);

        // If high demand on this model: DO NOT waste time retrying the same congested server. Immediately switch to next model!
        if (isHighDemand) {
          console.log(`[Gemini] Model ${model} is experiencing high demand. Rotating immediately to next model in fleet...`);
          break;
        }

        // If 429 quota or rate limit
        if (status === 429) {
          let waitMs = 1500;
          const matchSeconds = errMsg.match(/retry in ([0-9.]+)s/i);
          const matchMs = errMsg.match(/retry in ([0-9.]+)ms/i);
          if (matchMs && matchMs[1]) {
            waitMs = Math.ceil(parseFloat(matchMs[1])) + 300;
          } else if (matchSeconds && matchSeconds[1]) {
            waitMs = Math.ceil(parseFloat(matchSeconds[1]) * 1000) + 300;
          }

          if (waitMs <= 3000 && attempt === 1) {
            console.log(`[Gemini] Short cooldown: waiting ${waitMs}ms before retry on ${model}...`);
            await sleep(waitMs);
            continue;
          }

          // If longer wait or attempt 2, rotate to the next model pool
          break;
        }

        // Network timeout: brief retry once
        if ((err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') && attempt === 1) {
          await sleep(1000);
          continue;
        }

        break;
      }
    }
  }

  throw lastError || new Error('All Gemini models and retries failed.');
}

/**
 * Universal structured JSON completion caller prioritizing Gemini with OpenAI fallback
 */
export async function callStructuredLLM(options: LLMRequestOptions): Promise<any> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini first (reliable Google API with active model waterfall and 429 backoff)
  if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
    try {
      return await callGeminiWithRetry(options, geminiKey);
    } catch (err: any) {
      console.warn(`[LLM Client] Gemini failed across active models: ${err.message}.`);
      if (!openAiKey || openAiKey.includes('your_openai_api_key') || openAiKey.trim() === '') {
        throw new Error(`Gemini API error: ${err.response?.data?.error?.message || err.message}`);
      }
    }
  }

  // 2. Fallback to OpenAI only if configured and key is present
  if (openAiKey && !openAiKey.includes('your_openai_api_key') && openAiKey.trim() !== '') {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: openAiKey });
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

      const completion = await openai.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userPrompt }
        ],
        temperature: options.temperature ?? 0.7
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');
      return JSON.parse(content);
    } catch (openAiErr: any) {
      console.warn(`[LLM Client] OpenAI fallback failed: ${openAiErr.message}`);
      if (openAiErr.status === 429 || openAiErr.message?.includes('credits')) {
        throw new Error(
          'OpenAI account has no remaining credits (429). Please verify your Gemini API key.'
        );
      }
      throw openAiErr;
    }
  }

  throw new Error('No valid GEMINI_API_KEY configured in environment.');
}
