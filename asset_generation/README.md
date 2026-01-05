# Asset Generation

This directory contains the AI asset generation pipelines for creating game assets.

## Overview

All visual and audio assets for games are AI-generated using various services:

- **Images**: OpenAI DALL-E, Stable Diffusion
- **Audio**: Various AI audio generation services
- **Texture Atlases**: Automated packing from generated sprites

## Asset Types

| Type | Format | Tool |
|------|--------|------|
| Sprites | PNG (transparent) | DALL-E / SD |
| Backgrounds | PNG/JPG | DALL-E / SD |
| UI Elements | PNG (transparent) | DALL-E |
| Particle Textures | PNG | DALL-E |
| Sound Effects | WAV/MP3 | TBD |
| Music Loops | MP3 | TBD |

## Pipeline Structure

```
asset_generation/
├── pipelines/
│   ├── image_pipeline.py      # Image generation
│   ├── audio_pipeline.py      # Audio generation
│   └── atlas_pipeline.py      # Texture atlas creation
├── templates/
│   ├── prompts/              # AI prompt templates
│   └── styles/               # Art style definitions
└── README.md
```

## Usage

Asset generation is triggered in Step 7 of the workflow:

```python
# In step_07_asset_generation.py
assets = await generate_assets(game.gdd_spec["asset_style_guide"])
```

## Prompt Templates

Prompts are customized based on:
- Game genre
- Art style from GDD
- Difficulty tone
- Screen aspect ratios

Example sprite prompt:
```
A [character_type] sprite for a [genre] mobile game,
[art_style] style, [color_palette],
transparent background, 64x64 pixels,
game asset, clean edges, suitable for animation
```

## Output

Generated assets are:
1. Stored locally in `storage/assets/{game_id}/`
2. Metadata saved to `game_assets` table
3. Uploaded to game repository
4. Packed into texture atlases

## Implementation Status

- [ ] Image generation pipeline
- [ ] Audio generation pipeline
- [ ] Texture atlas packing
- [ ] Asset validation
- [ ] CDN upload
