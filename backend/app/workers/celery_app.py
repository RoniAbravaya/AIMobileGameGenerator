"""
Celery Application Configuration

Configures Celery with Redis broker and result backend.
"""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "gamefactory",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.tasks",
        "app.workers.step_executors",
    ],
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Retry settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Concurrency
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
    
    # Result expiration (24 hours)
    result_expires=86400,
    
    # Task routing
    task_routes={
        "app.workers.tasks.process_batch": {"queue": "batch"},
        "app.workers.tasks.execute_step": {"queue": "steps"},
        "app.workers.tasks.generate_assets": {"queue": "assets"},
        "app.workers.tasks.aggregate_daily_metrics": {"queue": "analytics"},
    },
    
    # Task time limits
    task_time_limit=900,  # 15 minutes hard limit
    task_soft_time_limit=600,  # 10 minutes soft limit
    
    # Beat schedule (periodic tasks)
    beat_schedule={
        "aggregate-metrics-daily": {
            "task": "app.workers.tasks.aggregate_daily_metrics",
            "schedule": 86400,  # Daily
            "args": (),
        },
    },
)
