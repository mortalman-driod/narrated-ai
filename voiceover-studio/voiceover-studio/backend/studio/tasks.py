"""Celery worker entry point: celery -A studio.tasks:celery_app worker --concurrency=1."""

from celery import Celery

from . import config, store

celery_app = Celery("voiceover_studio", broker=config.settings.redis_url)
celery_app.conf.update(
    task_serializer="json", accept_content=["json"], result_serializer="json",
    task_ignore_result=True, worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True, broker_connection_timeout=3,
    broker_transport_options={"visibility_timeout": 24 * 60 * 60,
                              "socket_connect_timeout": 3, "socket_timeout": 3},
    task_track_started=False,
)


@celery_app.task(name="studio.render_job")
def render_job(job_id: str) -> None:
    from .queue import execute_job

    store.initialize()
    execute_job(job_id)
