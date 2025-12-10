/**
 * Image Generation Service
 * Generates AI images for game splash screens and assets
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { GameType } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface ImageGenerationRequest {
  gameType: GameType;
  theme: string;
  styleKeywords: string[];
}

export interface ImageGenerationResult {
  success: boolean;
  splashPath?: string;
  iconPath?: string;
  error?: string;
}

export class ImageService {
  private apiKey: string;
  private provider: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.IMAGE_API_KEY || '';
    this.provider = process.env.IMAGE_API_PROVIDER || 'openai';
    this.baseUrl = process.env.IMAGE_API_BASE_URL || 'https://api.openai.com/v1/images/generations';
  }

  /**
   * Generate splash screen and icon for a game
   */
  async generateGameAssets(request: ImageGenerationRequest, outputDir: string): Promise<ImageGenerationResult> {
    logger.info(`Generating AI images for ${request.gameType} game: ${request.theme}`);

    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'your_image_api_key_here') {
      logger.warn('Image API key not configured, using fallback images');
      return await this.useFallbackImages(outputDir);
    }

    try {
      // Generate splash screen
      const splashPrompt = this.buildSplashPrompt(request);
      const splashPath = await this.generateImage(splashPrompt, outputDir, 'splash.png', '1080x1920');

      // Generate icon
      const iconPrompt = this.buildIconPrompt(request);
      const iconPath = await this.generateImage(iconPrompt, outputDir, 'icon.png', '1024x1024');

      return {
        success: true,
        splashPath,
        iconPath
      };
    } catch (error: any) {
      logger.error('Failed to generate images, using fallbacks', error);
      return await this.useFallbackImages(outputDir);
    }
  }

  /**
   * Build splash screen prompt
   */
  private buildSplashPrompt(request: ImageGenerationRequest): string {
    const keywords = request.styleKeywords.join(', ');
    
    const prompts: Record<GameType, string> = {
      [GameType.RUNNER]: `A vibrant neon cyber city runner game splash screen, ${keywords}, neon lights, futuristic cityscape, high contrast colors, vertical portrait orientation, mobile game art style, no text`,
      [GameType.PUZZLE]: `A calm minimalist puzzle game splash screen, ${keywords}, soft pastel colors, zen aesthetic, peaceful nature scene, vertical portrait orientation, mobile game art style, no text`,
      [GameType.WORD]: `A word tower puzzle game splash screen, ${keywords}, letters floating upwards, clean typography, modern design, vertical portrait orientation, mobile game art style, no text`,
      [GameType.CARD]: `A space card game splash screen, ${keywords}, sci-fi aesthetic, card game elements, stars and planets background, elegant design, vertical portrait orientation, mobile game art style, no text`,
      [GameType.PLATFORMER]: `A colorful platform adventure game splash screen, ${keywords}, cartoon style, cheerful nature scene, bright colors, vertical portrait orientation, mobile game art style, no text`,
      [GameType.CASUAL]: `A casual mobile game splash screen, ${keywords}, fun and colorful, simple design, vertical portrait orientation, mobile game art style, no text`,
      [GameType.ARCADE]: `An arcade game splash screen, ${keywords}, retro-modern style, vibrant colors, vertical portrait orientation, mobile game art style, no text`,
      [GameType.RACING]: `A racing game splash screen, ${keywords}, speed and motion, dynamic composition, vertical portrait orientation, mobile game art style, no text`,
      [GameType.ADVENTURE]: `An adventure game splash screen, ${keywords}, exploration theme, epic landscape, vertical portrait orientation, mobile game art style, no text`,
      [GameType.STRATEGY]: `A strategy game splash screen, ${keywords}, tactical theme, clean design, vertical portrait orientation, mobile game art style, no text`
    };

    return prompts[request.gameType] || prompts[GameType.RUNNER];
  }

  /**
   * Build icon prompt
   */
  private buildIconPrompt(request: ImageGenerationRequest): string {
    const theme = request.theme;
    const keywords = request.styleKeywords.slice(0, 3).join(', ');
    
    return `A simple, iconic mobile app icon for a ${request.gameType} game, ${theme}, ${keywords}, minimalist design, centered composition, square format, professional mobile game icon style, no text`;
  }

  /**
   * Generate a single image using the configured provider
   */
  private async generateImage(
    prompt: string,
    outputDir: string,
    filename: string,
    size: string
  ): Promise<string> {
    const outputPath = path.join(outputDir, filename);
    await fs.ensureDir(outputDir);

    if (this.provider === 'openai') {
      return await this.generateWithOpenAI(prompt, outputPath, size);
    } else {
      logger.warn(`Unsupported provider: ${this.provider}, using fallback`);
      return await this.copyFallbackImage(outputPath, filename);
    }
  }

  /**
   * Generate image with OpenAI DALL-E
   */
  private async generateWithOpenAI(prompt: string, outputPath: string, size: string): Promise<string> {
    try {
      // Use curl to call OpenAI API
      const [width, height] = size.split('x').map(Number);
      const apiSize = width === height ? '1024x1024' : '1024x1792'; // DALL-E 3 sizes

      const response = await execa('curl', [
        '-X', 'POST',
        'https://api.openai.com/v1/images/generations',
        '-H', `Authorization: Bearer ${this.apiKey}`,
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: apiSize,
          quality: 'standard'
        })
      ]);

      const result = JSON.parse(response.stdout);
      
      if (result.data && result.data[0] && result.data[0].url) {
        const imageUrl = result.data[0].url;
        
        // Download the image
        await execa('curl', ['-o', outputPath, imageUrl]);
        
        logger.info(`Image generated: ${outputPath}`);
        return outputPath;
      } else {
        throw new Error('No image URL in response');
      }
    } catch (error: any) {
      logger.error('OpenAI image generation failed', error);
      return await this.copyFallbackImage(outputPath, path.basename(outputPath));
    }
  }

  /**
   * Use fallback placeholder images
   */
  private async useFallbackImages(outputDir: string): Promise<ImageGenerationResult> {
    logger.info('Using fallback placeholder images');
    
    await fs.ensureDir(outputDir);
    
    const splashPath = path.join(outputDir, 'splash.png');
    const iconPath = path.join(outputDir, 'icon.png');
    
    await this.copyFallbackImage(splashPath, 'splash.png');
    await this.copyFallbackImage(iconPath, 'icon.png');
    
    return {
      success: true,
      splashPath,
      iconPath
    };
  }

  /**
   * Copy fallback image from template
   */
  private async copyFallbackImage(targetPath: string, filename: string): Promise<string> {
    // Create a simple placeholder image using ImageMagick if available, or just create an empty file
    try {
      const isIcon = filename.includes('icon');
      const size = isIcon ? '1024x1024' : '1080x1920';
      const color = isIcon ? '#4ecca3' : '#1a1a2e';
      
      // Try to use ImageMagick to create a simple colored image
      await execa('convert', [
        '-size', size,
        `xc:${color}`,
        targetPath
      ]);
      
      logger.info(`Created placeholder image: ${targetPath}`);
    } catch (error) {
      // ImageMagick not available, create empty file as placeholder
      await fs.writeFile(targetPath, '');
      logger.warn(`Created empty placeholder: ${targetPath}`);
    }
    
    return targetPath;
  }

  /**
   * Check if image generation is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'your_image_api_key_here');
  }
}
