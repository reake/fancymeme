import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';

// Static template data for matching (will be replaced with database templates later)
import { MEME_TEMPLATES } from '@/shared/blocks/meme/editor/templates-data';

interface TextArea {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text: string;
}

interface GeneratedMeme {
  id: string;
  templateId: string;
  templateName: string;
  imageUrl: string;
  textAreas: TextArea[];
  caption?: string;
}

// Template metadata for AI matching
const TEMPLATE_METADATA: Record<
  string,
  { emotions: string[]; useCases: string[]; description: string }
> = {
  'drake-hotline-bling': {
    emotions: ['disapproval', 'preference', 'rejection'],
    useCases: ['comparison', 'choice', 'preference'],
    description:
      'Two-panel meme showing rejection of one thing and approval of another',
  },
  'distracted-boyfriend': {
    emotions: ['temptation', 'betrayal', 'jealousy'],
    useCases: ['comparison', 'desire', 'temptation'],
    description:
      'Three people showing someone being distracted by something new while ignoring their current situation',
  },
  'two-buttons': {
    emotions: ['indecision', 'stress', 'dilemma'],
    useCases: ['choice', 'dilemma', 'decision'],
    description:
      'Sweating person having to choose between two difficult options',
  },
  'change-my-mind': {
    emotions: ['confident', 'challenging', 'provocative'],
    useCases: ['opinion', 'debate', 'controversial'],
    description: 'Person sitting with a sign challenging others to change their opinion',
  },
  'expanding-brain': {
    emotions: ['enlightenment', 'sarcasm', 'absurdity'],
    useCases: ['progression', 'escalation', 'irony'],
    description:
      'Four-panel meme showing increasingly enlightened or absurd ideas',
  },
  'surprised-pikachu': {
    emotions: ['shock', 'surprise', 'disbelief'],
    useCases: ['obvious-outcome', 'predictable-result', 'reaction'],
    description: 'Surprised face reacting to an obvious or predictable outcome',
  },
  'uno-draw-25': {
    emotions: ['stubbornness', 'refusal', 'determination'],
    useCases: ['refusal', 'stubbornness', 'choice'],
    description: 'Choosing to draw 25 cards rather than do something',
  },
  'this-is-fine': {
    emotions: ['denial', 'acceptance', 'calm-in-chaos'],
    useCases: ['crisis', 'denial', 'acceptance'],
    description: 'Dog sitting in burning room saying everything is fine',
  },
  'woman-yelling-at-cat': {
    emotions: ['anger', 'confusion', 'confrontation'],
    useCases: ['argument', 'misunderstanding', 'confrontation'],
    description: 'Woman yelling at confused cat at dinner table',
  },
  'roll-safe': {
    emotions: ['clever', 'smug', 'sarcastic'],
    useCases: ['life-hack', 'loophole', 'clever-thinking'],
    description: 'Man tapping head with a clever but flawed logic',
  },
  'panik-kalm-panik': {
    emotions: ['panic', 'relief', 'anxiety'],
    useCases: ['situation-change', 'plot-twist', 'realization'],
    description:
      'Three-panel showing panic, then calm, then panic again',
  },
  'bernie-asking': {
    emotions: ['pleading', 'requesting', 'demanding'],
    useCases: ['request', 'asking', 'demanding'],
    description: 'Bernie Sanders asking for something once again',
  },
};

const SYSTEM_PROMPT = `You are a meme caption generator. Your job is to create funny, relatable meme captions based on user input.

Given a user's text input (which could be a topic, situation, or feeling), you will:
1. Analyze the sentiment and context
2. Select the most appropriate meme template from the available options
3. Generate funny captions that fit the template's format

Available templates and their formats:
- drake-hotline-bling: Two captions - first shows what to reject, second shows what to prefer
- distracted-boyfriend: Three captions - girlfriend (current thing), boyfriend (person distracted), other woman (tempting thing)
- two-buttons: Two captions - two difficult choices
- change-my-mind: One caption - a controversial or challenging opinion
- expanding-brain: Four captions - increasingly absurd or "enlightened" ideas
- surprised-pikachu: Two captions - setup then "surprised" at obvious outcome
- uno-draw-25: One caption - something someone refuses to do (implying they'd rather draw 25)
- this-is-fine: One caption - a crisis situation being ignored
- woman-yelling-at-cat: Two captions - woman's angry argument, cat's confused response
- roll-safe: Two captions - setup then clever but flawed logic
- panik-kalm-panik: Three captions - panic situation, false relief, return to panic
- bernie-asking: One caption - what is being asked for "once again"

Rules:
1. Keep captions SHORT and punchy (max 10-15 words per caption)
2. Use internet humor and relatable situations
3. Match the template's emotional tone
4. Be creative but appropriate (no offensive content)
5. Use ALL CAPS for classic meme style when appropriate

Respond ONLY with valid JSON in this exact format:
{
  "templateId": "template-id-here",
  "captions": ["caption1", "caption2", ...],
  "reasoning": "brief explanation of why this template was chosen"
}`;

export async function POST(request: Request) {
  try {
    const { text, count = 3 } = await request.json();

    if (!text || typeof text !== 'string') {
      throw new Error('text is required');
    }

    if (text.length > 500) {
      throw new Error('text is too long (max 500 characters)');
    }

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

    // Generate multiple meme variations
    const generatedMemes: GeneratedMeme[] = [];
    const usedTemplates = new Set<string>();

    // Generate requested number of memes (max 6)
    const actualCount = Math.min(count, 6);

    for (let i = 0; i < actualCount; i++) {
      try {
        // Build prompt with exclusion of already used templates
        let userPrompt = `User input: "${text}"`;
        if (usedTemplates.size > 0) {
          userPrompt += `\n\nDo NOT use these templates (already used): ${Array.from(usedTemplates).join(', ')}`;
        }

        const result = await generateText({
          model: openrouter.chat('openai/gpt-4o-mini'),
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.8 + i * 0.1, // Increase randomness for variety
        });

        // Parse the response
        const responseText = result.text.trim();
        let parsed: { templateId: string; captions: string[]; reasoning?: string };

        try {
          // Try to extract JSON from the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch {
          console.error('Failed to parse LLM response:', responseText);
          continue;
        }

        // Find the matching template
        const template = MEME_TEMPLATES.find((t) => t.id === parsed.templateId);
        if (!template) {
          console.error('Template not found:', parsed.templateId);
          continue;
        }

        // Mark template as used
        usedTemplates.add(parsed.templateId);

        // Map captions to text areas
        const textAreas: TextArea[] = (template.defaultTextBoxes || []).map(
          (box, index) => ({
            x: box.x,
            y: box.y,
            width: box.width,
            text: parsed.captions[index] || '',
          })
        );

        generatedMemes.push({
          id: getUuid(),
          templateId: template.id,
          templateName: template.name,
          imageUrl: template.imageUrl,
          textAreas,
          caption: parsed.reasoning,
        });
      } catch (error) {
        console.error('Error generating meme variation:', error);
      }
    }

    if (generatedMemes.length === 0) {
      throw new Error('Failed to generate any memes');
    }

    return respData({
      memes: generatedMemes,
      isAuthenticated: !!user,
      // Add watermark info for unauthenticated users
      requiresWatermark: !user,
    });
  } catch (e: any) {
    console.error('generate-from-text failed:', e);
    return respErr(e.message);
  }
}
