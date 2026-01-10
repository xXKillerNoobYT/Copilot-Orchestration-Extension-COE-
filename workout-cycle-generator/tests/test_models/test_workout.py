"""
Tests for the Workout model.

Tests workout creation, exercise management, and metrics.
"""

import pytest
from src.models import (
    Workout,
    ExercisePerformance,
    WorkoutStatus,
)


class TestWorkoutCreation:
    """Test workout creation and initialization."""
    
    def test_create_basic_workout(self, sample_workout):
        """Test creating a basic workout."""
        assert sample_workout.id == "workout_001"
        assert sample_workout.name == "Leg Day"
        assert sample_workout.get_exercise_count() == 1
    
    def test_workout_status_defaults(self):
        """Test workout status defaults to PLANNED."""
        workout = Workout(
            id="test",
            name="Test Workout",
            date="2026-01-20",
        )
        assert workout.status == WorkoutStatus.PLANNED


class TestWorkoutExerciseManagement:
    """Test adding and removing exercises."""
    
    def test_add_exercise(self, sample_workout, sample_exercise_performance):
        """Test adding an exercise to workout."""
        initial_count = sample_workout.get_exercise_count()
        sample_workout.add_exercise(sample_exercise_performance)
        assert sample_workout.get_exercise_count() == initial_count + 1
    
    def test_remove_exercise(self, sample_workout):
        """Test removing an exercise."""
        if sample_workout.exercises:
            exercise_id = sample_workout.exercises[0].exercise_id
            assert sample_workout.remove_exercise(exercise_id) is True
    
    def test_remove_nonexistent_exercise(self, sample_workout):
        """Test removing nonexistent exercise."""
        assert sample_workout.remove_exercise("nonexistent") is False


class TestWorkoutMetrics:
    """Test workout metrics calculations."""
    
    def test_get_exercise_count(self, sample_workout):
        """Test getting exercise count."""
        count = sample_workout.get_exercise_count()
        assert count > 0
        assert count == len(sample_workout.exercises)
    
    def test_get_total_volume(self, sample_workout):
        """Test calculating total volume."""
        volume = sample_workout.get_total_volume()
        assert volume >= 0
    
    def test_get_total_sets(self, sample_workout):
        """Test calculating total sets."""
        total_sets = sample_workout.get_total_sets()
        assert total_sets > 0
    
    def test_get_average_rpe(self, sample_workout):
        """Test calculating average RPE."""
        rpe = sample_workout.get_average_rpe()
        # May be None if no RPE is set
        if rpe is not None:
            assert 1 <= rpe <= 10


class TestWorkoutStatus:
    """Test workout status management."""
    
    def test_mark_completed(self, sample_workout):
        """Test marking workout as completed."""
        sample_workout.mark_completed()
        assert sample_workout.status == WorkoutStatus.COMPLETED
    
    def test_mark_in_progress(self, sample_workout):
        """Test marking workout as in progress."""
        sample_workout.mark_in_progress()
        assert sample_workout.status == WorkoutStatus.IN_PROGRESS


class TestWorkoutSerialization:
    """Test workout serialization."""
    
    def test_to_dict(self, sample_workout):
        """Test converting workout to dictionary."""
        data = sample_workout.to_dict()
        assert isinstance(data, dict)
        assert data["id"] == sample_workout.id
        assert data["name"] == sample_workout.name
        assert "exercises" in data
    
    def test_from_dict(self, sample_workout):
        """Test creating workout from dictionary."""
        data = sample_workout.to_dict()
        workout = Workout.from_dict(data)
        assert workout.id == sample_workout.id
        assert workout.get_exercise_count() == sample_workout.get_exercise_count()


class TestWorkoutValidation:
    """Test workout validation."""
    
    def test_invalid_intensity(self):
        """Test invalid intensity level."""
        with pytest.raises(ValueError):
            Workout(
                id="test",
                name="Test",
                date="2026-01-20",
                intensity_level=11,  # Invalid
            )
    
    def test_invalid_duration(self):
        """Test invalid duration."""
        with pytest.raises(ValueError):
            Workout(
                id="test",
                name="Test",
                date="2026-01-20",
                duration_minutes=0,  # Invalid
            )
