"""A single-process local queue, or an opt-in Celery/Redis queue."""

from concurrent.futures import ThreadPoolExecutor
import logging
from threading import Event, Lock, Thread

from . import config, store

logger = logging.getLogger(__name__)
_executor: ThreadPoolExecutor | None = None
_lock = Lock()


def execute_job(job_id: str) -> None:
    job = store.get_job(job_id)
    if not job or job["status"] in store.TERMINAL_STATUSES:
        return
    stopped = Event()

    def heartbeat() -> None:
        while not stopped.wait(10):
            try:
                current = store.get_job(job_id)
                if current is None or current["status"] in store.TERMINAL_STATUSES:
                    return
                store.update_job(job_id, worker_heartbeat_at=store.now())
            except Exception:
                logger.exception("Could not persist worker heartbeat for %s", job_id)

    pulse = Thread(target=heartbeat, name=f"heartbeat-{job_id}", daemon=True)
    pulse.start()
    try:
        from .pipeline import run_job

        run_job(job_id)
    except store.JobCancelled:
        store.update_job(job_id, status="cancelled", eta_seconds=None)
    except Exception as error:
        logger.exception("Render failed for job %s", job_id)
        if store.cancel_requested(job_id):
            store.update_job(job_id, status="cancelled", eta_seconds=None)
        else:
            store.update_job(job_id, status="failed", error=str(error) or type(error).__name__, eta_seconds=None)
    finally:
        stopped.set()
        pulse.join(timeout=1)


def enqueue(job_id: str) -> None:
    global _executor
    if config.settings.queue_mode == "celery":
        from .tasks import render_job

        render_job.apply_async(args=[job_id], retry=False)
        return
    with _lock:
        if _executor is None:
            _executor = ThreadPoolExecutor(max_workers=config.settings.local_workers, thread_name_prefix="voiceover")
        _executor.submit(execute_job, job_id)


def shutdown() -> None:
    global _executor
    with _lock:
        if _executor is not None:
            _executor.shutdown(wait=False, cancel_futures=True)
            _executor = None
