import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';

// Static template data for matching
import { MEME_TEMPLATES } from '@/shared/blocks/meme/editor/templates-data';

interface TextArea {
  x?: number;
  y?: number;
  width?: number;
  text: string;
}

interface GeneratedMeme {
  id: string;
  templateId: string;
  templateName: string;
  imageUrl: string;
  textAreas: TextArea[];
  angle: string; // The creative angle/perspective used
}

const SYSTEM_PROMPT = `You are a meme topic expert. Given a topic, you will generate multiple creative angles/perspectives that can be turned into funny memes.

For each angle, you will:
1. Think of a unique, funny take on the topic
2. Select the most appropriate meme template
3. Write captions that fit the template format

Available templates and their formats:
- drake-hotline-bling: Two captions - first shows what to reject, second shows what to prefer
- distracted-boyfriend: Three captions - girlfriend (current thing), boyfriend (person distracted), other woman (tempting thing)
- two-buttons: Two captions - two difficult choices
- change-my-mind: One caption - a controversial or challenging opinion
- expanding-brain: Four captions - increasingly absurd or "enlightened" ideas
- surprised-pikachu: Two captions - setup then "surprised" at obvious outcome
- uno-draw-25: One caption - something someone refuses to do
- this-is-fine: One caption - a crisis situation being ignored
- woman-yelling-at-cat: Two captions - woman's angry argument, cat's confused response
- roll-safe: Two captions - setup then clever but flawed logic
- panik-kalm-panik: Three captions - panic situation, false relief, return to panic
- bernie-asking: One caption - what is being asked for "once again"
- epic-handshake: Three captions - left person, shared thing in middle, right person
- tuxedo-winnie-pooh: Two captions - basic version, fancy version
- sleeping-shaq: Two captions - something ignored, then same thing getting attention

Rules:
1. Generate DIVERSE angles - each should be a different perspective on the topic
2. Use DIFFERENT templates for each angle when possible
3. Keep captions SHORT and punchy (max 10-15 words per caption)
4. Use internet humor and relatable situations
5. Be creative but appropriate (no offensive content)
6. Use ALL CAPS for classic meme style when appropriate

Respond ONLY with valid JSON array in this exact format:
[
  {
    "angle": "brief description of the creative angle",
    "templateId": "template-id-here",
    "captions": ["caption1", "caption2", ...]
  },
  ...
]`;

export async function POST(request: Request) {
  try {
    const { topic, count = 6 } = await request.json();

    if (!topic || typeof topic !== 'string') {
      throw new Error('topic is required');
    }

    if (topic.length > 200) {
      throw new Error('topic is too long (max 200 characters)');
    }

    // Validate count
    const actualCount = Math.min(Math.max(count, 3), 12);

    const configs = await getAllConfigs();
    const openrouterApiKey = configs.openrouter_api_key;
    if (!openrouterApiKey) {
      throw new Error('openrouter_api_key is not set');
    }

    const openrouterBaseUrl = configs.openrouter_base_url;

    const openrouter = createOpenRouter({
      apiKey: openrouterApiKey,
      baseURL: openrouterBaseUrl ? openrouterBaseUrl : undefined,
    });

    // Get user info (optional - allow anonymous for preview)
    const user = await getUserInfo();

    // Generate all meme angles in a single LLM call for efficiency
    const result = await generateText({
      model: openrouter.chat('openai/gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      prompt: `Topic: "${topic}"\n\nGenerate ${actualCount} different creative meme angles for this topic. Each angle should offer a unique perspective or take on the topic.`,
      temperature: 0.9,
    });

    // Parse the response
    const responseText = result.text.trim();
    let parsed: Array<{
      angle: string;
      templateId: string;
      captions: string[];
    }>;

    try {
      // Try to extract JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch {
      console.error('Failed to parse LLM response:', responseText);
      throw new Error('Failed to parse AI response');
    }

    // Map parsed results to generated memes
    const generatedMemes: GeneratedMeme[] = [];

    for (const item of parsed) {
      // Find the matching template
      const template = MEME_TEMPLATES.find((t) => t.id === item.templateId);
      if (!template) {
        console.warn('Template not found:', item.templateId);
        continue;
      }

      // Map captions to text areas
      const textAreas: TextArea[] = (template.defaultTextBoxes || []).map(
        (box, index) => ({
          x: box.x,
          y: box.y,
          width: box.width,
          text: item.captions[index] || '',
        })
      );

      generatedMemes.push({
        id: getUuid(),
        templateId: template.id,
        templateName: template.name,
        imageUrl: template.imageUrl,
        textAreas,
        angle: item.angle,
      });
    }

    if (generatedMemes.length === 0) {
      throw new Error('Failed to generate any memes');
    }

    return respData({
      topic,
      memes: generatedMemes,
      totalGenerated: generatedMemes.length,
      isAuthenticated: !!user,
      requiresWatermark: !user,
    });
  } catch (e: any) {
    console.error('generate-by-topic failed:', e);
    return respErr(e.message);
  }
}
