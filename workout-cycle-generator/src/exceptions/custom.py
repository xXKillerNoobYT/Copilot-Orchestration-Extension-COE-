"""
Custom exceptions for the workout cycle generator.

Defines exception classes for validation and generation errors.
"""


class WorkoutCycleException(Exception):
    """Base exception for the workout cycle generator."""
    
    pass


class InvalidInputError(WorkoutCycleException):
    """Raised when input parameters are invalid."""
    
    pass


class ValidationError(WorkoutCycleException):
    """Raised when validation of data fails."""
    
    pass


class CycleGenerationError(WorkoutCycleException):
    """Raised when cycle generation fails."""
    
    pass


class ExerciseNotFoundError(WorkoutCycleException):
    """Raised when an exercise is not found."""
    
    pass


class PhaseValidationError(WorkoutCycleException):
    """Raised when phase validation fails."""
    
    pass


class WorkoutStructureError(WorkoutCycleException):
    """Raised when workout structure is invalid."""
    
    pass
