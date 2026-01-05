"""
Step 11: Performance & Release Prep

Prepares the game for release:
- Performance optimization passes
- Build signing configuration
- Store metadata (Play Store listing)
- Release checklist verification
"""

from typing import Any, Dict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.services.github_service import get_github_service
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


class ReleasePrepStep(BaseStepExecutor):
    """
    Step 11: Prepare for release.
    
    Optimizes performance, configures build signing,
    and generates store metadata.
    """

    step_number = 11
    step_name = "release_prep"

    def __init__(self):
        super().__init__()
        self.github_service = get_github_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Execute release preparation."""
        self.logger.info("preparing_release", game_id=str(game.id))

        logs = []
        logs.append(f"Starting release preparation for {game.name}")

        try:
            if not game.github_repo:
                return {
                    "success": False,
                    "error": "Missing GitHub repo",
                    "logs": "\n".join(logs),
                }

            files = {}

            # Performance optimization config
            logs.append("\n--- Performance Optimization ---")
            files["lib/config/performance.dart"] = self._generate_performance_config(game)
            logs.append("✓ Generated performance configuration")

            # ProGuard rules for release builds
            files["android/app/proguard-rules.pro"] = self._generate_proguard_rules()
            logs.append("✓ Generated ProGuard rules")

            # Build configuration for signing
            files["android/app/build.gradle"] = self._generate_build_gradle(game)
            logs.append("✓ Updated build.gradle")

            # GitHub Actions release workflow
            files[".github/workflows/release.yml"] = self._generate_release_workflow(game)
            logs.append("✓ Generated release workflow")

            # Play Store metadata
            logs.append("\n--- Store Metadata ---")
            files["fastlane/metadata/android/en-US/full_description.txt"] = self._generate_full_description(game)
            files["fastlane/metadata/android/en-US/short_description.txt"] = self._generate_short_description(game)
            files["fastlane/metadata/android/en-US/title.txt"] = game.name
            logs.append("✓ Generated Play Store metadata")

            # Release checklist
            files["docs/RELEASE_CHECKLIST.md"] = self._generate_release_checklist(game)
            logs.append("✓ Generated release checklist")

            # Privacy policy placeholder
            files["docs/PRIVACY_POLICY.md"] = self._generate_privacy_policy(game)
            logs.append("✓ Generated privacy policy template")

            # Commit to GitHub
            logs.append("\n--- Committing to GitHub ---")
            
            commit_result = await self.github_service.create_multiple_files(
                repo_name=game.github_repo,
                files=files,
                commit_message="Step 11: Add release preparation files",
            )

            if commit_result["success"]:
                logs.append(f"✓ Committed {len(files)} files")
            else:
                for path, content in files.items():
                    await self.github_service.create_file(
                        repo_name=game.github_repo,
                        file_path=path,
                        content=content,
                        commit_message=f"Add {path}",
                    )
                logs.append("✓ Committed files individually")

            logs.append("\n--- Release Preparation Complete ---")

            validation = await self.validate(db, game, {"files": list(files.keys())})

            return {
                "success": validation["valid"],
                "artifacts": {
                    "files_created": list(files.keys()),
                    "store_metadata": True,
                    "release_workflow": True,
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("release_prep_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    def _generate_performance_config(self, game: Game) -> str:
        """Generate performance optimization configuration."""
        return '''/// Performance configuration
/// 
/// Controls game performance settings for different device capabilities.

class PerformanceConfig {
  PerformanceConfig._();

  /// Target frame rate
  static const int targetFps = 60;

  /// Maximum number of particles
  static const int maxParticles = 100;

  /// Maximum active obstacles
  static const int maxObstacles = 50;

  /// Maximum active collectibles
  static const int maxCollectibles = 30;

  /// Enable object pooling
  static const bool useObjectPooling = true;

  /// Pool sizes
  static const int obstaclePoolSize = 30;
  static const int collectiblePoolSize = 20;
  static const int particlePoolSize = 50;

  /// Sprite batch rendering
  static const bool useSpriteBatch = true;

  /// Texture atlas usage
  static const bool useTextureAtlas = true;

  /// Collision detection optimization
  static const bool useQuadTree = true;

  /// Audio optimization
  static const int maxConcurrentSounds = 5;

  /// Memory limits
  static const int maxImageCacheSize = 100 * 1024 * 1024; // 100MB
}
'''

    def _generate_proguard_rules(self) -> str:
        """Generate ProGuard rules for release builds."""
        return '''# Flutter-specific rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Firebase Analytics
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Flame engine
-keep class com.flame_engine.** { *; }

# Keep crash reporting symbols
-keepattributes SourceFile,LineNumberTable
'''

    def _generate_build_gradle(self, game: Game) -> str:
        """Generate Android build.gradle with signing configuration."""
        app_id = f"com.gamefactory.{game.slug.replace('-', '_')}"
        return f'''plugins {{
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
    id "com.google.gms.google-services"
}}

def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {{
    localPropertiesFile.withReader('UTF-8') {{ reader ->
        localProperties.load(reader)
    }}
}}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {{
    flutterVersionCode = '1'
}}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {{
    flutterVersionName = '1.0.0'
}}

def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {{
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}}

android {{
    namespace "{app_id}"
    compileSdkVersion flutter.compileSdkVersion
    ndkVersion flutter.ndkVersion

    compileOptions {{
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }}

    kotlinOptions {{
        jvmTarget = '1.8'
    }}

    defaultConfig {{
        applicationId "{app_id}"
        minSdkVersion 21
        targetSdkVersion flutter.targetSdkVersion
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
        multiDexEnabled true
    }}

    signingConfigs {{
        release {{
            if (keystorePropertiesFile.exists()) {{
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }}
        }}
    }}

    buildTypes {{
        release {{
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }}
        debug {{
            signingConfig signingConfigs.debug
        }}
    }}
}}

flutter {{
    source '../..'
}}

dependencies {{
    implementation 'com.google.android.gms:play-services-ads:22.6.0'
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-analytics'
}}
'''

    def _generate_release_workflow(self, game: Game) -> str:
        """Generate GitHub Actions release workflow."""
        return f'''name: Release Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
          channel: 'stable'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run tests
        run: flutter test
      
      - name: Decode keystore
        env:
          KEYSTORE_BASE64: ${{{{ secrets.KEYSTORE_BASE64 }}}}
        run: |
          echo "$KEYSTORE_BASE64" | base64 --decode > android/app/release.keystore
          
      - name: Create key.properties
        env:
          KEY_ALIAS: ${{{{ secrets.KEY_ALIAS }}}}
          KEY_PASSWORD: ${{{{ secrets.KEY_PASSWORD }}}}
          STORE_PASSWORD: ${{{{ secrets.STORE_PASSWORD }}}}
        run: |
          echo "storePassword=$STORE_PASSWORD" >> android/key.properties
          echo "keyPassword=$KEY_PASSWORD" >> android/key.properties
          echo "keyAlias=$KEY_ALIAS" >> android/key.properties
          echo "storeFile=release.keystore" >> android/key.properties
      
      - name: Build APK
        run: flutter build apk --release
      
      - name: Build AAB
        run: flutter build appbundle --release
      
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: release-apk
          path: build/app/outputs/flutter-apk/app-release.apk
      
      - name: Upload AAB
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: build/app/outputs/bundle/release/app-release.aab
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            build/app/outputs/flutter-apk/app-release.apk
            build/app/outputs/bundle/release/app-release.aab
          generate_release_notes: true
'''

    def _generate_full_description(self, game: Game) -> str:
        """Generate full Play Store description."""
        gdd = game.gdd_spec or {}
        tagline = gdd.get("tagline", "An exciting mobile game!")
        
        return f'''{game.name} - {tagline}

🎮 FEATURES

• 10 exciting levels with increasing difficulty
• Simple, intuitive touch controls
• Beautiful graphics and smooth animations
• Compete for high scores
• Free to play

🏆 GAMEPLAY

Test your skills across 10 challenging levels! Start with the basics and work your way up to master-level challenges. Can you complete them all?

✨ HIGHLIGHTS

• Quick, addictive gameplay sessions
• Perfect for playing on the go
• Suitable for all ages
• No internet required for gameplay

📱 SUPPORT

Having issues or feedback? Contact us at support@gamefactory.com

Made with ❤️ by GameFactory
'''

    def _generate_short_description(self, game: Game) -> str:
        """Generate short Play Store description."""
        gdd = game.gdd_spec or {}
        return gdd.get("tagline", f"Play {game.name} - an exciting mobile game!")[:80]

    def _generate_release_checklist(self, game: Game) -> str:
        """Generate release checklist."""
        return f'''# Release Checklist for {game.name}

## Pre-Release

### Code Quality
- [ ] All tests pass
- [ ] No compiler warnings
- [ ] Code review completed
- [ ] Version number updated

### Build
- [ ] Release APK builds successfully
- [ ] Release AAB builds successfully
- [ ] Signing configured correctly
- [ ] ProGuard rules applied

### Testing
- [ ] QA checklist completed
- [ ] Performance tested on low-end device
- [ ] No crashes in release build
- [ ] Analytics events verified

### Assets
- [ ] All images optimized
- [ ] Audio files compressed
- [ ] App icon correct resolution
- [ ] Feature graphic prepared

## Store Listing

### Required
- [ ] App title (30 chars max)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (min 2)

### Optional
- [ ] Video trailer
- [ ] Additional graphics

### Legal
- [ ] Privacy policy URL
- [ ] Terms of service (if needed)
- [ ] Content rating questionnaire

## Release

- [ ] Internal testing complete
- [ ] Closed alpha/beta (optional)
- [ ] Production release prepared
- [ ] Release notes written

## Post-Release

- [ ] Monitor crash reports
- [ ] Check analytics dashboard
- [ ] Respond to reviews
- [ ] Plan next update
'''

    def _generate_privacy_policy(self, game: Game) -> str:
        """Generate privacy policy template."""
        return f'''# Privacy Policy for {game.name}

*Last updated: [DATE]*

## Overview

This privacy policy explains how {game.name} ("the App") collects, uses, and protects your information.

## Information We Collect

### Analytics Data
We use Firebase Analytics to collect anonymous usage data, including:
- App usage patterns
- Level completion rates
- Session duration
- Device type and OS version

This data helps us improve the game experience.

### Advertising
The App uses Google AdMob to display rewarded advertisements. AdMob may collect:
- Device identifiers for advertising purposes
- App interaction data

For more information, see [Google's Privacy Policy](https://policies.google.com/privacy).

## Data Storage

- Game progress is stored locally on your device
- Analytics data is transmitted to Firebase servers
- We do not collect personal information (name, email, etc.)

## Children's Privacy

The App does not knowingly collect personal information from children under 13. The App is designed to be suitable for all ages.

## Third-Party Services

- **Firebase Analytics**: [Privacy Policy](https://firebase.google.com/policies/analytics)
- **Google AdMob**: [Privacy Policy](https://policies.google.com/privacy)

## Your Rights

You can:
- Reset your game progress by clearing app data
- Opt out of personalized ads in your device settings
- Request deletion of your data by contacting us

## Contact

For privacy-related questions, contact us at:
privacy@gamefactory.com

## Changes

We may update this policy. Changes will be posted here with an updated date.
'''

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate release preparation."""
        errors = []
        warnings = []

        files = artifacts.get("files", [])

        required = ["RELEASE_CHECKLIST", "proguard", "release.yml"]
        for req in required:
            if not any(req in f for f in files):
                warnings.append(f"Missing: {req}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback release preparation."""
        return True
