"""
Pytest configuration and fixtures for testing.

Provides common fixtures used across test suite.
"""

import pytest
from datetime import datetime
from src.models import (
    Exercise,
    ExercisePerformance,
    Workout,
    TrainingPhase,
    TrainingCycle,
    TrainingGoal,
    FitnessLevel,
    Periodization,
    ExerciseModality,
    RestPeriod,
    PhaseType,
)


@pytest.fixture
def sample_exercise():
    """Provide a sample exercise."""
    return Exercise(
        id="ex_001",
        name="Barbell Back Squat",
        description="Heavy lower body compound",
        modality=ExerciseModality.COMPOUND,
        primary_muscle_group="Quadriceps",
        secondary_muscle_groups=["Glutes", "Hamstrings"],
        difficulty_level=8,
        rest_period_recommendation=RestPeriod.LONG,
    )


@pytest.fixture
def sample_exercises():
    """Provide multiple sample exercises."""
    return [
        Exercise(
            id=f"ex_{i:03d}",
            name=f"Exercise {i}",
            description=f"Exercise description {i}",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Chest",
            difficulty_level=5,
        )
        for i in range(1, 6)
    ]


@pytest.fixture
def sample_exercise_performance(sample_exercise):
    """Provide a sample exercise performance."""
    return ExercisePerformance(
        exercise_id=sample_exercise.id,
        exercise_name=sample_exercise.name,
        sets=3,
        reps="8-10",
        weight=100.0,
    )


@pytest.fixture
def sample_workout(sample_exercise_performance):
    """Provide a sample workout."""
    workout = Workout(
        id="workout_001",
        name="Leg Day",
        date="2026-01-20",
        duration_minutes=60,
        intensity_level=8,
    )
    workout.add_exercise(sample_exercise_performance)
    return workout


@pytest.fixture
def sample_workouts(sample_exercises):
    """Provide multiple sample workouts."""
    workouts = []
    for i in range(1, 4):
        workout = Workout(
            id=f"workout_{i:03d}",
            name=f"Workout {i}",
            date=f"2026-01-{10 + i:02d}",
        )
        for ex in sample_exercises[:2]:
            perf = ExercisePerformance(
                exercise_id=ex.id,
                exercise_name=ex.name,
                sets=3,
                reps="8-10",
                weight=100.0,
            )
            workout.add_exercise(perf)
        workouts.append(workout)
    return workouts


@pytest.fixture
def sample_phase(sample_workouts):
    """Provide a sample training phase."""
    phase = TrainingPhase(
        id="phase_001",
        name="Hypertrophy Phase",
        phase_type=PhaseType.HYPERTROPHY,
        start_week=1,
        end_week=4,
        intensity_multiplier=0.75,
        volume_multiplier=1.0,
    )
    for workout in sample_workouts:
        phase.add_workout(workout)
    return phase


@pytest.fixture
def sample_phases(sample_workouts):
    """Provide multiple sample phases."""
    phases = []
    for i in range(1, 4):
        start_week = (i - 1) * 4 + 1
        end_week = i * 4
        phase = TrainingPhase(
            id=f"phase_{i:03d}",
            name=f"Phase {i}",
            phase_type=PhaseType.STRENGTH,
            start_week=start_week,
            end_week=end_week,
        )
        for workout in sample_workouts:
            phase.add_workout(workout)
        phases.append(phase)
    return phases


@pytest.fixture
def sample_cycle(sample_phases):
    """Provide a sample training cycle."""
    cycle = TrainingCycle(
        id="cycle_001",
        name="12-Week Strength Cycle",
        goal=TrainingGoal.STRENGTH,
        fitness_level=FitnessLevel.INTERMEDIATE,
        periodization=Periodization.LINEAR,
        duration_weeks=12,
        start_date="2026-01-01",
    )
    for phase in sample_phases:
        cycle.add_phase(phase)
    return cycle


@pytest.fixture
def cycle_generator():
    """Provide a CycleGenerator instance."""
    from src import CycleGenerator
    return CycleGenerator()
