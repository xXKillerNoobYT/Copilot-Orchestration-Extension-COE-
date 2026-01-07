"""
Enums for the workout cycle generator module.

Defines all enumeration types used throughout the application for
consistent, type-safe representation of categorical values.
"""

from enum import Enum


class TrainingGoal(str, Enum):
    """Training goals that shape the structure of a training cycle."""
    
    STRENGTH = "strength"
    HYPERTROPHY = "hypertrophy"
    ENDURANCE = "endurance"
    POWER = "power"
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value


class FitnessLevel(str, Enum):
    """Athlete's fitness level affecting rep ranges and intensity."""
    
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ELITE = "elite"
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value


class Periodization(str, Enum):
    """Periodization models for training structure."""
    
    LINEAR = "linear"
    UNDULATING = "undulating"
    BLOCK = "block"
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value


class ExerciseModality(str, Enum):
    """Types of exercise modalities used in training."""
    
    COMPOUND = "compound"
    ISOLATION = "isolation"
    ACCESSORY = "accessory"
    PLYOMETRIC = "plyometric"
    CARDIO = "cardio"
    MOBILITY = "mobility"
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value


class RestPeriod(str, Enum):
    """Rest period categories for exercise recovery."""
    
    SHORT = "short"      # 30-60 seconds
    MODERATE = "moderate"  # 60-90 seconds
    LONG = "long"        # 2-3 minutes
    EXTENDED = "extended"  # 3-5 minutes
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value


class ExerciseStatus(str, Enum):
    """Status of an exercise in a workout."""
    
    PLANNED = "planned"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value


class WorkoutStatus(str, Enum):
    """Status of a workout in a phase."""
    
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value


class PhaseType(str, Enum):
    """Types of training phases."""
    
    PREPARATION = "preparation"
    HYPERTROPHY = "hypertrophy"
    STRENGTH = "strength"
    POWER = "power"
    PEAKING = "peaking"
    DELOAD = "deload"
    CONDITIONING = "conditioning"
    
    def __str__(self) -> str:
        """Return the string value of the enum."""
        return self.value
