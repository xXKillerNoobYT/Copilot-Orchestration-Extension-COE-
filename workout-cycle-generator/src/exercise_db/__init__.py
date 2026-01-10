"""
Exercise database module.

Exports exercise repository and fixtures.
"""

from .repository import ExerciseRepository
from .fixtures import (
    get_exercises_for_goal,
)

__all__ = [
    "ExerciseRepository",
    "get_exercises_for_goal",
]
