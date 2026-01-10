"""Basic tests for workout cycle generator."""

import pytest
import json
from datetime import datetime
from src.models import (
    TrainingGoal, FitnessLevel, Periodization,
    Exercise, ExercisePerformance, Workout, TrainingPhase, TrainingCycle,
    ExerciseModality, RestPeriod
)
from src.validation import InputValidator
from src.validation.cycle_validator import CycleValidator
from src.exceptions import InvalidInputError, ValidationError


class TestModels:
    """Tests for core data models."""

    def test_exercise_creation(self):
        """Test exercise creation and serialization."""
        ex = Exercise(
            id="ex-1",
            name="Bench Press",
            modality=ExerciseModality.COMPOUND,
            muscle_groups=["chest", "triceps"],
            base_reps=8,
            base_sets=3,
            difficulty=8
        )
        assert ex.name == "Bench Press"
        assert ex.difficulty == 8
        
        # Test serialization
        data = ex.to_dict()
        assert data['name'] == "Bench Press"
        assert data['modality'] == "compound"
        
        # Test deserialization
        restored = Exercise.from_dict(data)
        assert restored.name == ex.name

    def test_workout_creation(self):
        """Test workout creation and validation."""
        ex = Exercise(
            id="ex-1",
            name="Squat",
            modality=ExerciseModality.COMPOUND,
            base_reps=5
        )
        
        perf = ExercisePerformance(
            exercise=ex,
            sets=4,
            reps=5,
            intensity_percent=0.85,
            rest_seconds=120
        )
        
        workout = Workout(
            id="w1",
            week=1,
            day=1,
            training_goal=TrainingGoal.STRENGTH,
            focus_muscles=["quads", "glutes"],
            exercises=[perf],
            duration_minutes=60,
            difficulty_rating=7.5
        )
        
        assert workout.total_sets() == 4
        assert workout.total_volume() == 20  # 4 sets * 5 reps
        errors = workout.validate()
        assert len(errors) == 0

    def test_training_phase_creation(self):
        """Test phase creation."""
        ex = Exercise(
            id="ex-1",
            name="Bench",
            modality=ExerciseModality.COMPOUND
        )
        
        phase = TrainingPhase(
            phase_number=1,
            start_week=1,
            end_week=4,
            duration_weeks=4,
            focus=TrainingGoal.STRENGTH,
            intensity_range=(0.70, 0.80),
            volume_progression="linear",
            primary_exercises=[ex]
        )
        
        assert phase.get_midpoint_intensity() == 0.75
        errors = phase.validate()
        assert len(errors) == 0

    def test_training_cycle_creation(self):
        """Test cycle creation and validation."""
        cycle = TrainingCycle(
            id="cycle-1",
            cycle_name="Strength Focus 8-Week",
            duration_weeks=8,
            training_frequency=4,
            training_goal=TrainingGoal.STRENGTH,
            fitness_level=FitnessLevel.INTERMEDIATE,
            periodization_type=Periodization.LINEAR
        )
        
        assert cycle.training_goal == TrainingGoal.STRENGTH
        # Empty cycle should have validation errors
        errors = cycle.validate()
        assert len(errors) > 0


class TestValidation:
    """Tests for validation logic."""

    def test_valid_input_params(self):
        """Test valid input parameters pass validation."""
        params = {
            'duration_weeks': 8,
            'training_frequency': 4,
            'training_goal': 'strength',
            'fitness_level': 'intermediate',
            'periodization_type': 'linear'
        }
        
        errors = InputValidator.validate_cycle_params(params)
        assert len(errors) == 0

    def test_invalid_duration(self):
        """Test invalid duration fails validation."""
        params = {
            'duration_weeks': 2,  # Too short
            'training_frequency': 4,
            'training_goal': 'strength',
            'fitness_level': 'intermediate',
            'periodization_type': 'linear'
        }
        
        errors = InputValidator.validate_cycle_params(params)
        assert len(errors) > 0
        assert any('duration' in e.lower() for e in errors)

    def test_invalid_frequency(self):
        """Test invalid frequency fails validation."""
        params = {
            'duration_weeks': 8,
            'training_frequency': 10,  # Too high
            'training_goal': 'strength',
            'fitness_level': 'intermediate',
            'periodization_type': 'linear'
        }
        
        errors = InputValidator.validate_cycle_params(params)
        assert len(errors) > 0
        assert any('frequency' in e.lower() for e in errors)

    def test_invalid_input_raises_error(self):
        """Test that invalid input raises exception."""
        params = {
            'duration_weeks': 100,  # Invalid
            'training_frequency': 4,
            'training_goal': 'strength',
            'fitness_level': 'intermediate',
            'periodization_type': 'linear'
        }
        
        with pytest.raises(InvalidInputError):
            InputValidator.validate_and_raise(params)


class TestSerialization:
    """Tests for JSON serialization."""

    def test_exercise_json_roundtrip(self):
        """Test exercise serialization roundtrip."""
        ex = Exercise(
            id="ex-1",
            name="Deadlift",
            modality=ExerciseModality.COMPOUND,
            base_reps=5,
            base_sets=3
        )
        
        # Serialize
        data = ex.to_dict()
        json_str = json.dumps(data)
        
        # Deserialize
        data2 = json.loads(json_str)
        restored = Exercise.from_dict(data2)
        
        assert restored.name == ex.name
        assert restored.base_reps == ex.base_reps
        assert restored.modality == ex.modality

    def test_workout_json_roundtrip(self):
        """Test workout serialization roundtrip."""
        ex = Exercise(
            id="ex-1",
            name="Squat",
            modality=ExerciseModality.COMPOUND
        )
        
        perf = ExercisePerformance(
            exercise=ex,
            sets=4,
            reps=5,
            intensity_percent=0.85,
            rest_seconds=120
        )
        
        workout = Workout(
            id="w1",
            week=1,
            day=1,
            training_goal=TrainingGoal.STRENGTH,
            exercises=[perf]
        )
        
        # Roundtrip
        data = workout.to_dict()
        json_str = json.dumps(data, default=str)
        data2 = json.loads(json_str)
        restored = Workout.from_dict(data2)
        
        assert restored.week == 1
        assert len(restored.exercises) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
