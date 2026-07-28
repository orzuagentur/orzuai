"""OrzuAi worker — daily Shorts pipeline."""

from .config import settings

__all__ = ["settings", "run_forever", "process_next_job"]


def __getattr__(name: str):
    if name in {"run_forever", "process_next_job"}:
        from .runner import process_next_job, run_forever

        return {"run_forever": run_forever, "process_next_job": process_next_job}[name]
    raise AttributeError(f"module 'orzuvideo' has no attribute {name!r}")
