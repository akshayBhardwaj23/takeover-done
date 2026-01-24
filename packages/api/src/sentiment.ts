/**
 * Sentiment Analysis Service
 * Uses OpenAI GPT-4o-mini to analyze customer sentiment from text
 */

export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED' | 'ANGRY';
  score: number; // -1.0 to 1.0
  topics?: string[];
  keywords?: string[];
  confidence: number; // 0.0 to 1.0
  reasoning?: string;
}

export interface SentimentAnalysisContext {
  source?: 'EMAIL' | 'ORDER' | 'RETURN_REQUEST';
  orderStatus?: string;
  orderAmount?: number;
  customerHistory?: string;
  previousSentiment?: string;
}

/**
 * Analyze sentiment of a single text using OpenAI
 */
export async function analyzeSentiment(
  text: string,
  context?: SentimentAnalysisContext,
): Promise<SentimentResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback to keyword-based analysis if OpenAI is not configured
    return keywordBasedSentiment(text);
  }

  try {
    // Build context string for better analysis
    let contextStr = '';
    if (context) {
      if (context.source === 'ORDER') {
        contextStr += `This is feedback about an order. `;
        if (context.orderStatus) {
          contextStr += `Order status: ${context.orderStatus}. `;
        }
      } else if (context.source === 'RETURN_REQUEST') {
        contextStr += `This is a return/refund request. `;
      }
      if (context.customerHistory) {
        contextStr += `Customer history: ${context.customerHistory}. `;
      }
    }

    const prompt = `Analyze the sentiment of the following customer message. Consider the context and determine if the customer is:
- POSITIVE: Happy, satisfied, appreciative, enthusiastic
- NEUTRAL: Factual, informational, no strong emotion
- NEGATIVE: Unhappy, disappointed, but not extremely upset
- FRUSTRATED: Annoyed, irritated, experiencing repeated issues
- ANGRY: Very upset, furious, demanding immediate action

${contextStr ? `Context: ${contextStr}\n` : ''}Customer Message:
${text}

Respond with a JSON object containing:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "FRUSTRATED" | "ANGRY",
  "score": -1.0 to 1.0 (where -1.0 is most negative, 0 is neutral, 1.0 is most positive),
  "topics": ["array", "of", "main", "topics", "mentioned"],
  "keywords": ["key", "words", "that", "indicate", "sentiment"],
  "confidence": 0.0 to 1.0 (how confident you are in this analysis),
  "reasoning": "brief explanation of why this sentiment was chosen"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a sentiment analysis expert. Analyze customer messages and return structured JSON responses only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent sentiment analysis
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sentiment] OpenAI API error:', errorText);
      // Fallback to keyword-based analysis
      return keywordBasedSentiment(text);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      return keywordBasedSentiment(text);
    }

    // Extract JSON from response (handle cases where response includes markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    try {
      const result = JSON.parse(jsonStr) as SentimentResult;
      
      // Validate and normalize the result
      if (!['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'ANGRY'].includes(result.sentiment)) {
        return keywordBasedSentiment(text);
      }

      // Ensure score is in valid range
      result.score = Math.max(-1.0, Math.min(1.0, result.score || 0));
      result.confidence = Math.max(0.0, Math.min(1.0, result.confidence || 0.5));

      return result;
    } catch (parseError) {
      console.error('[Sentiment] Failed to parse OpenAI response:', parseError);
      return keywordBasedSentiment(text);
    }
  } catch (error) {
    console.error('[Sentiment] Error analyzing sentiment:', error);
    // Fallback to keyword-based analysis
    return keywordBasedSentiment(text);
  }
}

/**
 * Fallback keyword-based sentiment analysis
 */
function keywordBasedSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();

  // Angry keywords
  const angryWords =
    /(angry|furious|terrible|awful|horrible|worst|hate|disgusted|ridiculous|unacceptable|outraged|fuming)/.test(
      lowerText,
    );

  // Frustrated keywords
  const frustratedWords =
    /(frustrated|annoyed|disappointed|upset|concerned|worried|problem|issue|wrong|broken|again|still|yet|waiting)/.test(
      lowerText,
    );

  // Positive keywords
  const positiveWords =
    /(thank|thanks|appreciate|great|excellent|love|happy|pleased|satisfied|perfect|amazing|wonderful|fantastic)/.test(
      lowerText,
    );

  // Negative keywords (but not as strong as angry/frustrated)
  const negativeWords =
    /(bad|poor|slow|late|missing|damaged|defective|wrong|incorrect|unhappy|dissatisfied)/.test(
      lowerText,
    );

  let sentiment: SentimentResult['sentiment'] = 'NEUTRAL';
  let score = 0;
  const topics: string[] = [];
  const keywords: string[] = [];

  if (angryWords) {
    sentiment = 'ANGRY';
    score = -0.9;
    keywords.push('angry', 'furious');
  } else if (frustratedWords && !positiveWords) {
    sentiment = 'FRUSTRATED';
    score = -0.6;
    keywords.push('frustrated', 'annoyed');
  } else if (negativeWords && !positiveWords) {
    sentiment = 'NEGATIVE';
    score = -0.3;
    keywords.push('negative');
  } else if (positiveWords && !frustratedWords && !angryWords) {
    sentiment = 'POSITIVE';
    score = 0.7;
    keywords.push('positive', 'satisfied');
  }

  // Extract topics
  if (/(refund|return|exchange|cancel)/.test(lowerText)) {
    topics.push('refund/return');
  }
  if (/(shipping|delivery|delayed|tracking|ship)/.test(lowerText)) {
    topics.push('shipping');
  }
  if (/(payment|charge|billing|card|paid)/.test(lowerText)) {
    topics.push('payment');
  }
  if (/(quality|damaged|defective|broken|wrong item)/.test(lowerText)) {
    topics.push('product quality');
  }

  return {
    sentiment,
    score,
    topics: topics.length > 0 ? topics : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    confidence: 0.6, // Lower confidence for keyword-based analysis
  };
}

/**
 * Batch analyze multiple texts (for efficiency)
 */
export async function batchAnalyzeSentiments(
  items: Array<{ text: string; context?: SentimentAnalysisContext }>,
): Promise<SentimentResult[]> {
  // For now, process sequentially to avoid rate limits
  // Could be optimized to batch API calls if needed
  const results: SentimentResult[] = [];

  for (const item of items) {
    try {
      const result = await analyzeSentiment(item.text, item.context);
      results.push(result);
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error('[Sentiment] Error in batch analysis:', error);
      // Add fallback result
      results.push(keywordBasedSentiment(item.text));
    }
  }

  return results;
}
