# Implementation contract

Frontend: React 18 + Vite + TypeScript, API base `/api`, Vite proxy localhost:8000.
Backend: Python FastAPI in backend/studio; run from backend `uvicorn studio.api:app`.
Data root default repository `data/`, configurable STUDIO_DATA_DIR. Local-only service.

## JSON endpoints

- GET /api/health -> {status, queue_mode, ffmpeg, engines: [{id,available,detail}], device}
- GET /api/voices -> Voice[]
- POST /api/voices/custom multipart: name, gender (female|male), tone, accent, consent=true, reference (audio file); returns Voice. Reference must be 180–600 seconds. No fictional Nigerian samples.
- GET /api/projects -> Project[]
- POST /api/projects {name,script,voice_id,settings} -> Project
- PUT /api/projects/{id} same body -> Project
- DELETE /api/projects/{id} -> 204 (reject while rendering)
- POST /api/jobs {project_id} -> Job
- GET /api/jobs -> Job[] newest first
- GET /api/jobs/{id} -> Job
- POST /api/jobs/{id}/cancel -> Job (cooperative cancel)
- POST /api/previews {voice_id,text,speed?:number} -> Job (cached by settings and text; kind=preview)
- WS /api/jobs/{id}/ws -> full Job snapshots until terminal status (poll fallback supported)
- GET /api/jobs/{id}/download/{format} format=wav|mp3|zip
- GET /api/jobs/{id}/chunks/{index} -> WAV ready chunk
- GET /api/settings -> {lexicon: Record<string,string>}
- PUT /api/settings {lexicon} -> same

Voice: {id,name,gender,accent,tone,engine,model_voice,custom,available,description}
Project: {id,name,script,voice_id,settings,created_at,updated_at}
Settings: {speed:1.0,paragraph_pause_ms:600,section_pause_ms:1200,sentence_pause_ms:300,loudness_lufs:-16,engine:'auto'|'kokoro'|'piper'|'xtts'}
Job: {id,project_id:string|null,project_name,voice_id,voice_name,kind:'render'|'preview',status:'queued'|'running'|'assembling'|'completed'|'failed'|'cancelled',progress:0..100,completed_chunks,total_chunks,eta_seconds:number|null,duration_seconds:number|null,error:string|null,created_at,updated_at,available_formats:string[],chunks:[{index,url,duration_seconds}],audio_url:string|null}

## Backend internal contract

API agent owns config.py, models.py, store.py, api.py, tasks.py, queue.py and tests/test_api.py; coordinates pipeline interfaces with pipeline agent. Pipeline agent owns engines.py, chunking.py, audio.py, pipeline.py and associated tests.

`pipeline.run_job(job_id: str)` loads job/project through store; pipeline agent and API agent agree store helper signatures directly. Engine module exposes `engine_status()` (health list) and `stock_voices()` (catalog); API agent may own catalog if agreed. Do not import model packages at API startup. Default queue mode local thread executor for easy native Windows; production mode Celery+Redis. Job snapshot persisted in SQLite, including input payload to make render settings immutable. Resume stale jobs safely or mark interrupted after restart, never report false success. Test doubles only in tests; never emit tone/silence as if speech.

## Ownership

Root owns frontend/. Setup agent owns README.md, .env.example, .gitignore, setup scripts, scripts/, backend/pyproject.toml, Dockerfile, compose.yaml. Agents can discuss and change this contract but inform root of final frontend shape.
