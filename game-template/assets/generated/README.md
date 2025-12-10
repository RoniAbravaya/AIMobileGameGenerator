# Generated Assets

This folder contains AI-generated images for the game.

## Files

- `splash.png` - Splash screen (1080x1920 portrait)
- `icon.png` - App icon (1024x1024 square)

## Generation

These images are generated automatically during the `generate-game` workflow if IMAGE_API_KEY is configured in `.env`.

If image generation fails or is not configured, placeholder images are used instead.

## Manual Replacement

You can manually replace these images with custom artwork:

1. Create your splash screen (1080x1920 PNG)
2. Create your icon (1024x1024 PNG)
3. Save them with the same filenames in this directory
4. Rebuild the app

## Requirements

- **Splash**: Portrait orientation, 1080x1920px minimum
- **Icon**: Square, 1024x1024px minimum, no transparency for adaptive icon background
