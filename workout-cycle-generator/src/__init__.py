"""
Workout Cycle Generator - Main Package

A comprehensive Python library for generating personalized training cycles
with support for multiple periodization models, training goals, and fitness levels.

Features:
- 3 periodization models (Linear, Undulating, Block)
- 4 training goals (Strength, Hypertrophy, Endurance, Power)
- Customizable cycle parameters
- 50+ base exercises organized by goal
- Full JSON serialization support
- Comprehensive validation

Example:
    from src import CycleGenerator
    
    generator = CycleGenerator()
    cycle = generator.generate(
        goal="strength",
        fitness_level="intermediate",
        periodization="linear",
        duration_weeks=12,
        workouts_per_week=4,
    )
    
    print(f"Generated {cycle.get_phase_count()} phases")
    print(f"Total workouts: {cycle.get_total_workouts()}")
"""

from .models import (
    TrainingGoal,
    FitnessLevel,
    Periodization,
    ExerciseModality,
    RestPeriod,
    ExerciseStatus,
    WorkoutStatus,
    PhaseType,
    Exercise,
    ExercisePerformance,
    Workout,
    TrainingPhase,
    TrainingCycle,
)

from .generation import (
    CycleGenerator,
    WorkoutBuilder,
    PhaseBuilder,
)

from .validation import (
    InputValidator,
    CycleValidator,
)

from .exceptions import (
    WorkoutCycleException,
    InvalidInputError,
    ValidationError,
    CycleGenerationError,
    ExerciseNotFoundError,
    PhaseValidationError,
    WorkoutStructureError,
)

from .exercise_db import ExerciseRepository

__version__ = "1.0.0"

__all__ = [
    # Enums
    "TrainingGoal",
    "FitnessLevel",
    "Periodization",
    "ExerciseModality",
    "RestPeriod",
    "ExerciseStatus",
    "WorkoutStatus",
    "PhaseType",
    # Models
    "Exercise",
    "ExercisePerformance",
    "Workout",
    "TrainingPhase",
    "TrainingCycle",
    # Generators
    "CycleGenerator",
    "WorkoutBuilder",
    "PhaseBuilder",
    # Validation
    "InputValidator",
    "CycleValidator",
    # Database
    "ExerciseRepository",
    # Exceptions
    "WorkoutCycleException",
    "InvalidInputError",
    "ValidationError",
    "CycleGenerationError",
    "ExerciseNotFoundError",
    "PhaseValidationError",
    "WorkoutStructureError",
]
