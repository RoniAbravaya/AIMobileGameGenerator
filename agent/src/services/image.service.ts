/**
 * Image Generation Service
 * Generates AI images for game splash screens and assets
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { GameSpec } from '../models/GameSpec.js';
import { logger } from '../utils/logger.js';

export interface ImageGenerationResult {
  success: boolean;
  splashPath?: string;
  menuBgPath?: string;
  sceneBgPath?: string;
  error?: string;
}

export interface ImageAsset {
  type: 'splash' | 'menu-bg' | 'scene-bg';
  filename: string;
  size: string; // WIDTHxHEIGHT
  prompt: string;
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
   * Generate all game assets from GameSpec
   */
  async generateGameAssets(spec: GameSpec, outputDir: string): Promise<ImageGenerationResult> {
    logger.info(`Generating AI images for: ${spec.name}`);

    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'your_image_api_key_here') {
      logger.warn('Image API key not configured, using fallback images');
      return await this.useFallbackImages(outputDir);
    }

    try {
      // Build asset prompts
      const assets = this.buildAssetPrompts(spec);

      // Generate each asset
      const splashPath = await this.generateImage(
        assets.find(a => a.type === 'splash')!.prompt,
        outputDir,
        'splash.png',
        '1024x1792'
      );

      const menuBgPath = await this.generateImage(
        assets.find(a => a.type === 'menu-bg')!.prompt,
        outputDir,
        'menu-bg.png',
        '1024x1792'
      );

      const sceneBgPath = await this.generateImage(
        assets.find(a => a.type === 'scene-bg')!.prompt,
        outputDir,
        'scene-bg.png',
        '1792x1024'
      );

      return {
        success: true,
        splashPath,
        menuBgPath,
        sceneBgPath
      };
    } catch (error: any) {
      logger.error('Failed to generate images, using fallbacks', error);
      return await this.useFallbackImages(outputDir);
    }
  }

  /**
   * Build prompts for all game assets
   */
  private buildAssetPrompts(spec: GameSpec): ImageAsset[] {
    const { name, highConcept, visualTheme } = spec;
    const mood = visualTheme.mood || 'energetic';
    const style = visualTheme.style || 'modern';
    const palette = visualTheme.palette || [];
    const colors = palette.slice(0, 3).join(', ');

    // Extract key themes from high concept
    const conceptWords = highConcept.toLowerCase();
    const isSpace = conceptWords.includes('space') || conceptWords.includes('orbit');
    const isNature = conceptWords.includes('nature') || conceptWords.includes('forest') || conceptWords.includes('garden');
    const isCyber = conceptWords.includes('cyber') || conceptWords.includes('neon') || conceptWords.includes('digital');
    const isRetro = conceptWords.includes('retro') || conceptWords.includes('pixel') || conceptWords.includes('arcade');

    // Build splash screen prompt (main title screen)
    const splashPrompt = [
      `A stunning mobile game splash screen for "${name}".`,
      `High concept: ${highConcept}.`,
      `Visual style: ${style}, ${mood} mood.`,
      colors && `Color palette: ${colors}.`,
      isSpace && 'Space theme with stars and planets.',
      isNature && 'Nature theme with organic elements.',
      isCyber && 'Cyberpunk theme with neon lights and technology.',
      isRetro && 'Retro pixel art aesthetic.',
      'Vertical portrait orientation.',
      'Professional mobile game art style.',
      'Cinematic composition.',
      'No text or UI elements.',
      'High quality, detailed, atmospheric.'
    ].filter(Boolean).join(' ');

    // Build menu background prompt (simpler, less busy)
    const menuBgPrompt = [
      `A clean background image for a mobile game menu.`,
      `Theme: ${highConcept}.`,
      `Style: ${style}, ${mood} mood.`,
      colors && `Colors: ${colors}.`,
      'Subtle, not too busy.',
      'Vertical portrait orientation.',
      'Blurred or abstract style.',
      'Perfect as a background for UI elements.',
      'No text.'
    ].filter(Boolean).join(' ');

    // Build gameplay scene background prompt (horizontal for gameplay)
    const sceneBgPrompt = [
      `A gameplay background for a mobile game.`,
      `Game concept: ${highConcept}.`,
      `Visual style: ${style}, ${mood} atmosphere.`,
      colors && `Color scheme: ${colors}.`,
      isSpace && 'Outer space environment.',
      isNature && 'Natural outdoor environment.',
      isCyber && 'Futuristic city or digital world.',
      isRetro && 'Retro game environment.',
      'Horizontal landscape orientation.',
      'Suitable for 2D game overlay.',
      'Depth and layers.',
      'No text, no characters.'
    ].filter(Boolean).join(' ');

    return [
      {
        type: 'splash',
        filename: 'splash.png',
        size: '1024x1792',
        prompt: splashPrompt
      },
      {
        type: 'menu-bg',
        filename: 'menu-bg.png',
        size: '1024x1792',
        prompt: menuBgPrompt
      },
      {
        type: 'scene-bg',
        filename: 'scene-bg.png',
        size: '1792x1024',
        prompt: sceneBgPrompt
      }
    ];
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
    const menuBgPath = path.join(outputDir, 'menu-bg.png');
    const sceneBgPath = path.join(outputDir, 'scene-bg.png');
    
    await this.createFallbackImage(splashPath, '1024x1792', '#1a1a2e');
    await this.createFallbackImage(menuBgPath, '1024x1792', '#16213e');
    await this.createFallbackImage(sceneBgPath, '1792x1024', '#0f3460');
    
    return {
      success: true,
      splashPath,
      menuBgPath,
      sceneBgPath
    };
  }

  /**
   * Create fallback placeholder image
   */
  private async createFallbackImage(targetPath: string, size: string, color: string): Promise<string> {
    // Create a simple placeholder image using ImageMagick if available
    try {
      // Try to use ImageMagick to create a simple colored image
      await execa('convert', [
        '-size', size,
        `xc:${color}`,
        targetPath
      ]);
      
      logger.info(`Created placeholder image: ${targetPath}`);
    } catch (error) {
      // ImageMagick not available, create a minimal PNG file
      // Create a 1x1 transparent PNG as fallback
      const minimalPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);
      
      await fs.writeFile(targetPath, minimalPNG);
      logger.warn(`Created minimal PNG placeholder: ${targetPath}`);
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
