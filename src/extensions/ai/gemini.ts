import { nanoid } from 'nanoid';

import { getUuid } from '@/shared/lib/hash';

import {
  AIConfigs,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from './types';

/**
 * Gemini configs
 */
export interface GeminiConfigs extends AIConfigs {
  apiKey: string;
}

/**
 * Gemini provider
 */
export class GeminiProvider implements AIProvider {
  // provider name
  readonly name = 'gemini';
  // provider configs
  configs: GeminiConfigs;

  // init provider
  constructor(configs: GeminiConfigs) {
    this.configs = configs;
  }

  // generate task
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options } = params;

    if (mediaType !== AIMediaType.IMAGE) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const requestParts: any[] = [
      {
        text: prompt,
      },
    ];

    if (options && options.image_input && Array.isArray(options.image_input)) {
      for (const imageUrl of options.image_input) {
        try {
          const imageResp = await fetch(imageUrl);
          if (imageResp.ok) {
            const arrayBuffer = await imageResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString('base64');
            const mimeType =
              imageResp.headers.get('content-type') || 'image/jpeg';

            requestParts.push({
              inlineData: {
                mimeType,
                data: base64Image,
              },
            });
          }
        } catch (e) {
          console.error('failed to fetch image input', imageUrl, e);
        }
      }
    }

    const { image_input, ...rawGenerationConfig } = options || {};
    const generationConfig: Record<string, any> = { ...rawGenerationConfig };

    if (
      Object.prototype.hasOwnProperty.call(generationConfig, 'response_modalities') &&
      !Object.prototype.hasOwnProperty.call(generationConfig, 'responseModalities')
    ) {
      generationConfig.responseModalities = generationConfig.response_modalities;
      delete generationConfig.response_modalities;
    }

    if (!Object.prototype.hasOwnProperty.call(generationConfig, 'responseModalities')) {
      generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    }

    const payload: Record<string, any> = {
      contents: [
        {
          role: 'user',
          parts: requestParts,
        },
      ],
    };

    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.configs.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(
        `request failed with status: ${resp.status}, body: ${errorText}`
      );
    }

    const data = await resp.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('no candidates returned');
    }

    const taskId = nanoid(); // Gemini API doesn't return a task ID for synchronous generation
    const candidate = data.candidates[0];
    const parts = candidate.content?.parts;

    if (!parts || parts.length === 0) {
      throw new Error('no parts returned');
    }

    const imagePart = parts.find((p: any) => p.inlineData || p.inline_data);

    if (!imagePart) {
      throw new Error('no image part returned');
    }

    const inlineData = imagePart.inlineData || imagePart.inline_data;

    const mimeType = inlineData?.mimeType || inlineData?.mime_type;
    const base64Data = inlineData?.data;

    if (!mimeType || !base64Data) {
      throw new Error('invalid image data returned');
    }

    // upload to storage
    const { getStorageService } = await import('@/shared/services/storage');
    const storageService = await getStorageService();
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] || 'png';
    const key = `gemini/image/${getUuid()}.${ext}`;

    const uploadResult = await storageService.uploadFile({
      body: buffer,
      key,
      contentType: mimeType,
    });

    if (!uploadResult || !uploadResult.url) {
      throw new Error('upload image failed');
    }

    // replace base64 data with url to save db space
    if (inlineData) {
      inlineData.data = uploadResult.url;
    }

    // Ensure the original data object is updated
    const partIndex = parts.findIndex((p: any) => p === imagePart);
    if (partIndex !== -1 && data.candidates?.[0]?.content?.parts) {
      const targetPart = data.candidates[0].content.parts[partIndex];
      if (targetPart?.inlineData) {
        targetPart.inlineData.data = uploadResult.url;
        targetPart.inlineData.thoughtSignature = '';
      }
      if (targetPart?.inline_data) {
        targetPart.inline_data.data = uploadResult.url;
        targetPart.inline_data.thoughtSignature = '';
      }
    }

    const image: AIImage = {
      id: nanoid(),
      createTime: new Date(),
      imageType: mimeType,
      imageUrl: uploadResult.url,
    };

    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId: taskId,
      taskInfo: {
        images: [image],
        status: 'success',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }
}
