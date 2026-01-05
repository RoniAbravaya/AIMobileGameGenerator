"""
Step 5: Analytics Implementation

Implements the analytics service wrapper in the game:
- Firebase Analytics integration
- Backend event forwarding
- Debug logging for development
- Event validation
"""

from typing import Any, Dict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.services.github_service import get_github_service
from app.workers.step_executors.base import BaseStepExecutor

logger = structlog.get_logger()


class AnalyticsImplStep(BaseStepExecutor):
    """
    Step 5: Implement analytics service in the game.
    
    Creates the analytics wrapper with Firebase integration
    and backend event forwarding.
    """

    step_number = 5
    step_name = "analytics_impl"

    def __init__(self):
        super().__init__()
        self.github_service = get_github_service()

    async def execute(self, db: AsyncSession, game: Game) -> Dict[str, Any]:
        """Implement analytics service."""
        self.logger.info("implementing_analytics", game_id=str(game.id))

        logs = []
        logs.append(f"Starting analytics implementation for {game.name}")

        try:
            if not game.github_repo:
                return {
                    "success": False,
                    "error": "Missing GitHub repo",
                    "logs": "\n".join(logs),
                }

            analytics_spec = game.gdd_spec.get("analytics_spec", {}) if game.gdd_spec else {}

            # Generate analytics service implementation
            logs.append("\n--- Generating Analytics Service ---")
            
            files = {
                "lib/services/analytics_service.dart": self._generate_analytics_service(game, analytics_spec),
                "lib/services/backend_service.dart": self._generate_backend_service(game),
                "lib/config/analytics_config.dart": self._generate_analytics_config(game),
            }

            logs.append(f"Generated {len(files)} analytics files")

            # Commit to GitHub
            commit_result = await self.github_service.create_multiple_files(
                repo_name=game.github_repo,
                files=files,
                commit_message="Step 5: Implement analytics service",
            )

            if commit_result["success"]:
                logs.append("✓ Analytics service committed to GitHub")
            else:
                for path, content in files.items():
                    result = await self.github_service.create_file(
                        repo_name=game.github_repo,
                        file_path=path,
                        content=content,
                        commit_message=f"Add {path}",
                    )
                    if result["success"]:
                        logs.append(f"✓ Committed: {path}")

            logs.append("\n--- Analytics Implementation Complete ---")

            validation = await self.validate(db, game, {"files": list(files.keys())})

            return {
                "success": validation["valid"],
                "artifacts": {
                    "files_created": list(files.keys()),
                    "firebase_integrated": True,
                    "backend_forwarding": True,
                },
                "validation": validation,
                "logs": "\n".join(logs),
            }

        except Exception as e:
            self.logger.exception("analytics_impl_failed", error=str(e))
            logs.append(f"\n✗ Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "logs": "\n".join(logs),
            }

    def _generate_analytics_service(self, game: Game, spec: Dict) -> str:
        """Generate the full analytics service implementation."""
        return f'''import 'dart:async';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';
import 'analytics_config.dart';
import 'backend_service.dart';

/// Analytics service for {game.name}
/// 
/// Handles all analytics tracking via Firebase Analytics
/// with automatic backend forwarding for GameFactory metrics.
class AnalyticsService {{
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();

  late FirebaseAnalytics _analytics;
  late BackendService _backendService;
  bool _initialized = false;
  String? _userId;
  String? _sessionId;

  /// Initialize the analytics service
  Future<void> initialize() async {{
    if (_initialized) return;
    
    _analytics = FirebaseAnalytics.instance;
    _backendService = BackendService();
    await _backendService.initialize();
    
    // Generate session ID
    _sessionId = DateTime.now().millisecondsSinceEpoch.toString();
    
    _initialized = true;
    
    if (kDebugMode) {{
      print('[Analytics] Initialized for {game.name}');
    }}
  }}

  /// Set user ID for analytics
  void setUserId(String userId) {{
    _userId = userId;
    _analytics.setUserId(id: userId);
  }}

  /// Log a custom event with parameters
  Future<void> logEvent(String name, Map<String, dynamic>? params) async {{
    if (!_initialized) return;

    final enrichedParams = _enrichParams(params ?? {{}});
    
    // Log to Firebase
    await _analytics.logEvent(
      name: name,
      parameters: enrichedParams.map((k, v) => MapEntry(k, v.toString())),
    );

    // Forward to backend if enabled
    if (AnalyticsConfig.forwardToBackend) {{
      await _backendService.sendEvent(name, enrichedParams);
    }}

    if (kDebugMode) {{
      print('[Analytics] $name: $enrichedParams');
    }}
  }}

  Map<String, dynamic> _enrichParams(Map<String, dynamic> params) {{
    return {{
      ...params,
      'session_id': _sessionId,
      'user_id': _userId ?? 'anonymous',
      'timestamp': DateTime.now().toIso8601String(),
      'app_version': AnalyticsConfig.appVersion,
    }};
  }}

  // ============ Standard Events ============

  Future<void> logGameStart() async {{
    await logEvent('game_start', {{}});
  }}

  Future<void> logLevelStart(int level, {{int attemptNumber = 1}}) async {{
    await logEvent('level_start', {{
      'level': level,
      'attempt_number': attemptNumber,
    }});
  }}

  Future<void> logLevelComplete(int level, int score, int timeSeconds, {{int stars = 0}}) async {{
    await logEvent('level_complete', {{
      'level': level,
      'score': score,
      'time_seconds': timeSeconds,
      'stars_earned': stars,
    }});
  }}

  Future<void> logLevelFail(int level, int score, String reason, int timeSeconds) async {{
    await logEvent('level_fail', {{
      'level': level,
      'score': score,
      'fail_reason': reason,
      'time_seconds': timeSeconds,
    }});
  }}

  Future<void> logUnlockPromptShown(int level) async {{
    await logEvent('unlock_prompt_shown', {{
      'level': level,
      'prompt_type': 'rewarded_ad',
    }});
  }}

  Future<void> logRewardedAdStarted(int level) async {{
    await logEvent('rewarded_ad_started', {{
      'level': level,
      'ad_placement': 'level_unlock',
    }});
  }}

  Future<void> logRewardedAdCompleted(int level) async {{
    await logEvent('rewarded_ad_completed', {{
      'level': level,
      'reward_type': 'level_unlock',
      'reward_value': 1,
    }});
  }}

  Future<void> logRewardedAdFailed(int level, String reason) async {{
    await logEvent('rewarded_ad_failed', {{
      'level': level,
      'failure_reason': reason,
    }});
  }}

  Future<void> logLevelUnlocked(int level) async {{
    await logEvent('level_unlocked', {{
      'level': level,
      'unlock_method': 'rewarded_ad',
    }});
  }}
}}
'''

    def _generate_backend_service(self, game: Game) -> str:
        """Generate backend service for event forwarding."""
        return f'''import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'analytics_config.dart';

/// Backend service for forwarding events to GameFactory
class BackendService {{
  static final BackendService _instance = BackendService._internal();
  factory BackendService() => _instance;
  BackendService._internal();

  bool _initialized = false;
  final List<Map<String, dynamic>> _eventQueue = [];
  bool _isSending = false;

  Future<void> initialize() async {{
    _initialized = true;
    // Start periodic flush
    _startPeriodicFlush();
  }}

  void _startPeriodicFlush() {{
    Future.doWhile(() async {{
      await Future.delayed(const Duration(seconds: 30));
      await _flushEvents();
      return _initialized;
    }});
  }}

  /// Send a single event to the backend
  Future<void> sendEvent(String name, Map<String, dynamic> params) async {{
    if (!_initialized || !AnalyticsConfig.forwardToBackend) return;

    _eventQueue.add({{
      'game_id': AnalyticsConfig.gameId,
      'event_name': name,
      'event_params': params,
      'timestamp': DateTime.now().toIso8601String(),
    }});

    // Flush if queue is large
    if (_eventQueue.length >= 10) {{
      await _flushEvents();
    }}
  }}

  Future<void> _flushEvents() async {{
    if (_eventQueue.isEmpty || _isSending) return;

    _isSending = true;
    final events = List<Map<String, dynamic>>.from(_eventQueue);
    _eventQueue.clear();

    try {{
      final response = await http.post(
        Uri.parse('${{AnalyticsConfig.backendUrl}}/api/v1/events/batch'),
        headers: {{
          'Content-Type': 'application/json',
          'X-API-Key': AnalyticsConfig.apiKey,
        }},
        body: jsonEncode({{'events': events}}),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {{
        // Re-queue failed events
        _eventQueue.addAll(events);
        if (kDebugMode) {{
          print('[Backend] Failed to send events: ${{response.statusCode}}');
        }}
      }}
    }} catch (e) {{
      // Re-queue on error
      _eventQueue.addAll(events);
      if (kDebugMode) {{
        print('[Backend] Error sending events: $e');
      }}
    }} finally {{
      _isSending = false;
    }}
  }}
}}
'''

    def _generate_analytics_config(self, game: Game) -> str:
        """Generate analytics configuration."""
        return f'''/// Analytics configuration for {game.name}
class AnalyticsConfig {{
  AnalyticsConfig._();

  /// Game identifier
  static const String gameId = '{game.id}';
  
  /// App version
  static const String appVersion = '1.0.0';
  
  /// Backend URL for event forwarding
  static const String backendUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'https://api.gamefactory.com',
  );
  
  /// API key for backend authentication
  static const String apiKey = String.fromEnvironment(
    'API_KEY',
    defaultValue: '',
  );
  
  /// Whether to forward events to backend
  static const bool forwardToBackend = true;
  
  /// Debug mode logging
  static const bool debugLogging = bool.fromEnvironment('DEBUG', defaultValue: false);
}}
'''

    async def validate(
        self,
        db: AsyncSession,
        game: Game,
        artifacts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate analytics implementation."""
        errors = []
        warnings = []

        files = artifacts.get("files", [])
        
        required_files = [
            "lib/services/analytics_service.dart",
            "lib/services/backend_service.dart",
        ]

        for required in required_files:
            if required not in files:
                errors.append(f"Missing file: {required}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    async def rollback(self, db: AsyncSession, game: Game) -> bool:
        """Rollback analytics implementation."""
        self.logger.info("analytics_impl_rollback", game_id=str(game.id))
        return True
