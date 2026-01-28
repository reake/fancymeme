import { NextRequest, NextResponse } from 'next/server';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

import { getAllConfigs } from '@/shared/models/config';
import { MEME_TEMPLATES } from '@/shared/blocks/meme/editor/templates-data';

export const runtime = 'edge';

// Build a searchable index of templates with metadata
const TEMPLATE_INDEX = MEME_TEMPLATES.map((template) => ({
  id: template.id,
  name: template.name,
  textBoxCount: template.defaultTextBoxes?.length || 2,
  // Add semantic keywords based on template names
  keywords: getTemplateKeywords(template.name),
}));

function getTemplateKeywords(name: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'drake': ['choice', 'preference', 'comparison', 'reject', 'accept', 'approve', 'disapprove'],
    'distracted': ['attention', 'cheating', 'looking', 'girlfriend', 'temptation', 'jealous'],
    'button': ['decision', 'choice', 'dilemma', 'sweating', 'hard choice', 'pressure'],
    'change my mind': ['opinion', 'debate', 'argue', 'convince', 'statement', 'controversial'],
    'expanding brain': ['levels', 'intelligence', 'evolution', 'progression', 'ascend', 'enlightened'],
    'batman': ['slap', 'interrupt', 'shut up', 'correction', 'response'],
    'uno': ['refuse', 'reject', 'draw', 'punishment', 'consequence'],
    'balloon': ['escape', 'running', 'chase', 'avoid', 'flee'],
    'spongebob': ['mock', 'sarcasm', 'imitate', 'mimic', 'stupid'],
    'exit': ['leave', 'escape', 'choice', 'turn', 'direction', 'decision'],
    'pigeon': ['question', 'identify', 'confusion', 'misunderstand', 'wrong'],
    'seagull': ['inhale', 'scream', 'yell', 'reaction', 'escalate', 'intensity'],
    'woman': ['yelling', 'cat', 'angry', 'argument', 'confused', 'dinner'],
    'chopper': ['argument', 'fight', 'angry', 'yelling', 'back and forth'],
    'handshake': ['agreement', 'common ground', 'unity', 'together', 'same', 'both'],
    'harold': ['pain', 'hide', 'fake smile', 'suffer', 'pretend', 'okay'],
    'winnie': ['fancy', 'upgrade', 'sophisticated', 'better', 'classy', 'refined'],
    'tom': ['unsettled', 'disturbed', 'uncomfortable', 'shocked', 'newspaper'],
    'nut button': ['slam', 'hit', 'instant', 'immediate', 'reaction', 'urgent'],
    'boardroom': ['meeting', 'suggestion', 'fired', 'thrown out', 'idea', 'reject'],
    'one does not simply': ['impossible', 'difficult', 'mordor', 'warning', 'challenge'],
    'surprised pikachu': ['shock', 'obvious', 'predictable', 'consequence', 'what did you expect'],
    'success kid': ['victory', 'win', 'achievement', 'celebrate', 'yes', 'finally'],
    'first world': ['minor problem', 'complain', 'luxury', 'trivial', 'crying'],
    'disaster girl': ['evil', 'chaos', 'fire', 'sinister', 'smile', 'destruction'],
    'doge': ['wow', 'such', 'very', 'much', 'amaze', 'dog'],
    'think about it': ['smart', 'clever', 'outsmart', 'logic', 'actually', 'point'],
    'roll safe': ['think', 'clever', 'smart', 'workaround', 'loophole', 'hack'],
    'fry': ['not sure', 'suspicious', 'doubt', 'squint', 'skeptical'],
    'confession': ['admit', 'confess', 'secret', 'guilty', 'bear'],
    'grumpy cat': ['no', 'hate', 'disapprove', 'negative', 'angry cat'],
    'bad luck': ['unfortunate', 'unlucky', 'fail', 'disaster', 'brian'],
    'philosoraptor': ['question', 'think', 'wonder', 'philosophical', 'deep thought'],
    'ancient aliens': ['conspiracy', 'aliens', 'explain', 'theory', 'history'],
    'y u no': ['why', 'frustration', 'demand', 'angry', 'rage'],
    'all the things': ['everything', 'all', 'excited', 'hyper', 'do all'],
    'nobody': ['random', 'unprompted', 'suddenly', 'out of nowhere'],
    'stonks': ['profit', 'success', 'business', 'money', 'investment', 'going up'],
    'always has been': ['revelation', 'truth', 'astronaut', 'always', 'gun'],
    'panik kalm': ['panic', 'calm', 'relief', 'worry', 'stages'],
    'bernie': ['asking', 'support', 'once again', 'mittens', 'financial'],
    'trade offer': ['deal', 'exchange', 'offer', 'receive', 'negotiation'],
  };

  const nameLower = name.toLowerCase();
  for (const [key, keywords] of Object.entries(keywordMap)) {
    if (nameLower.includes(key)) {
      return keywords;
    }
  }
  
  // Default keywords based on common meme concepts
  return ['funny', 'humor', 'reaction', 'relatable'];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { code: -1, message: 'Query is required' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || trimmedQuery.length > 200) {
      return NextResponse.json(
        { code: -1, message: 'Query must be between 2 and 200 characters' },
        { status: 400 }
      );
    }

    // Get OpenRouter config
    const configs = await getAllConfigs();
    const openrouterApiKey = configs.openrouter_api_key;

    if (!openrouterApiKey) {
      // Fallback to simple keyword matching if no API key
      return NextResponse.json({
        code: 0,
        data: {
          templates: simpleKeywordSearch(trimmedQuery, limit),
          method: 'keyword',
        },
      });
    }

    // Use LLM to understand the query and find matching templates
    const openrouter = createOpenRouter({ apiKey: openrouterApiKey });
    
    const templateList = TEMPLATE_INDEX.map((t, i) => 
      `${i + 1}. ${t.name} (${t.textBoxCount} text areas) - keywords: ${t.keywords.join(', ')}`
    ).join('\n');

    const { text } = await generateText({
      model: openrouter('openai/gpt-4o-mini'),
      system: `You are a meme template matcher. Given a user's description of what they want to express, find the most suitable meme templates.

Available templates:
${templateList}

Respond with ONLY a JSON array of template numbers (1-indexed) that best match the user's intent, ordered by relevance. Return at most ${limit} templates. Example: [1, 5, 12]

Consider:
- The emotional tone the user wants to convey
- The structure of the meme (number of text areas)
- Common use cases for each template`,
      prompt: `Find meme templates for: "${trimmedQuery}"`,
      maxTokens: 100,
      temperature: 0.3,
    });

    // Parse LLM response
    let matchedIndices: number[] = [];
    try {
      const parsed = JSON.parse(text.trim());
      if (Array.isArray(parsed)) {
        matchedIndices = parsed
          .filter((n): n is number => typeof n === 'number' && n >= 1 && n <= TEMPLATE_INDEX.length)
          .slice(0, limit);
      }
    } catch {
      // Fallback to keyword search if LLM response is invalid
      return NextResponse.json({
        code: 0,
        data: {
          templates: simpleKeywordSearch(trimmedQuery, limit),
          method: 'keyword_fallback',
        },
      });
    }

    // Get the matched templates
    const matchedTemplates = matchedIndices.map((i) => {
      const template = MEME_TEMPLATES[i - 1];
      return {
        id: template.id,
        name: template.name,
        imageUrl: template.imageUrl,
        textBoxCount: template.defaultTextBoxes?.length || 2,
      };
    });

    // If LLM found too few, supplement with keyword search
    if (matchedTemplates.length < Math.min(limit, 3)) {
      const keywordResults = simpleKeywordSearch(trimmedQuery, limit - matchedTemplates.length);
      const existingIds = new Set(matchedTemplates.map((t) => t.id));
      for (const template of keywordResults) {
        if (!existingIds.has(template.id)) {
          matchedTemplates.push(template);
          if (matchedTemplates.length >= limit) break;
        }
      }
    }

    return NextResponse.json({
      code: 0,
      data: {
        templates: matchedTemplates,
        method: 'semantic',
      },
    });
  } catch (error: any) {
    console.error('Template search error:', error);
    return NextResponse.json(
      { code: -1, message: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

function simpleKeywordSearch(query: string, limit: number) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // Score each template based on keyword matches
  const scored = TEMPLATE_INDEX.map((template) => {
    let score = 0;
    const nameLower = template.name.toLowerCase();
    
    // Check name match
    if (nameLower.includes(queryLower)) {
      score += 10;
    }
    
    // Check word matches in name
    for (const word of queryWords) {
      if (word.length > 2 && nameLower.includes(word)) {
        score += 5;
      }
    }
    
    // Check keyword matches
    for (const keyword of template.keywords) {
      if (queryLower.includes(keyword)) {
        score += 3;
      }
      for (const word of queryWords) {
        if (word.length > 2 && keyword.includes(word)) {
          score += 2;
        }
      }
    }
    
    return { template, score };
  });

  // Sort by score and return top matches
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => {
      const t = MEME_TEMPLATES.find((m) => m.id === s.template.id)!;
      return {
        id: t.id,
        name: t.name,
        imageUrl: t.imageUrl,
        textBoxCount: t.defaultTextBoxes?.length || 2,
      };
    });
}
