"""
Exercise repository for querying and filtering exercises.

Provides the ExerciseRepository class for exercise lookup and filtering.
"""

from typing import Optional, List
from .fixtures import get_exercises_for_goal
from ..models.exercise import Exercise
from ..models.enums import (
    TrainingGoal,
    ExerciseModality,
)


class ExerciseRepository:
    """
    Repository for querying exercises from the database.
    
    Manages exercise lookups, filtering, and retrieval operations.
    """
    
    def __init__(self) -> None:
        """Initialize repository and load all exercises."""
        self._exercises = get_exercises_for_goal(TrainingGoal.STRENGTH)
        # Add exercises from other goals
        for goal in [
            TrainingGoal.HYPERTROPHY,
            TrainingGoal.ENDURANCE,
            TrainingGoal.POWER,
        ]:
            for ex in get_exercises_for_goal(goal):
                if ex.id not in [e.id for e in self._exercises]:
                    self._exercises.append(ex)
    
    def get_all_exercises(self) -> List[Exercise]:
        """
        Get all exercises in the database.
        
        Returns:
            List of all Exercise objects
        """
        return self._exercises.copy()
    
    def get_by_id(self, exercise_id: str) -> Optional[Exercise]:
        """
        Get exercise by ID.
        
        Args:
            exercise_id: Exercise ID to look up
            
        Returns:
            Exercise if found, None otherwise
        """
        for ex in self._exercises:
            if ex.id == exercise_id:
                return ex
        return None
    
    def get_by_name(self, name: str) -> Optional[Exercise]:
        """
        Get exercise by name (exact match).
        
        Args:
            name: Exercise name
            
        Returns:
            Exercise if found, None otherwise
        """
        for ex in self._exercises:
            if ex.name.lower() == name.lower():
                return ex
        return None
    
    def search_by_name(self, search_term: str) -> List[Exercise]:
        """
        Search exercises by name (partial match).
        
        Args:
            search_term: Search term to find in exercise names
            
        Returns:
            List of matching exercises
        """
        search_lower = search_term.lower()
        return [
            ex for ex in self._exercises
            if search_lower in ex.name.lower()
        ]
    
    def get_by_muscle_group(self, muscle_group: str) -> List[Exercise]:
        """
        Get exercises targeting a specific muscle group.
        
        Args:
            muscle_group: Primary muscle group name
            
        Returns:
            List of exercises targeting that muscle
        """
        muscle_lower = muscle_group.lower()
        return [
            ex for ex in self._exercises
            if ex.primary_muscle_group.lower() == muscle_lower
        ]
    
    def get_by_secondary_muscle(self, muscle_group: str) -> List[Exercise]:
        """
        Get exercises with secondary targeting of a muscle group.
        
        Args:
            muscle_group: Secondary muscle group name
            
        Returns:
            List of exercises targeting that muscle secondarily
        """
        muscle_lower = muscle_group.lower()
        return [
            ex for ex in self._exercises
            if muscle_lower in [m.lower() for m in ex.secondary_muscle_groups]
        ]
    
    def get_by_modality(self, modality: ExerciseModality) -> List[Exercise]:
        """
        Get exercises by modality type.
        
        Args:
            modality: ExerciseModality enum
            
        Returns:
            List of exercises of that modality
        """
        return [
            ex for ex in self._exercises
            if ex.modality == modality
        ]
    
    def get_compound_exercises(self) -> List[Exercise]:
        """
        Get all compound exercises.
        
        Returns:
            List of compound exercises
        """
        return self.get_by_modality(ExerciseModality.COMPOUND)
    
    def get_isolation_exercises(self) -> List[Exercise]:
        """
        Get all isolation exercises.
        
        Returns:
            List of isolation exercises
        """
        return self.get_by_modality(ExerciseModality.ISOLATION)
    
    def get_accessory_exercises(self) -> List[Exercise]:
        """
        Get all accessory exercises.
        
        Returns:
            List of accessory exercises
        """
        return self.get_by_modality(ExerciseModality.ACCESSORY)
    
    def get_plyometric_exercises(self) -> List[Exercise]:
        """
        Get all plyometric exercises.
        
        Returns:
            List of plyometric exercises
        """
        return self.get_by_modality(ExerciseModality.PLYOMETRIC)
    
    def get_cardio_exercises(self) -> List[Exercise]:
        """
        Get all cardio exercises.
        
        Returns:
            List of cardio exercises
        """
        return self.get_by_modality(ExerciseModality.CARDIO)
    
    def get_by_difficulty(self, min_level: int, max_level: int) -> List[Exercise]:
        """
        Get exercises within a difficulty range.
        
        Args:
            min_level: Minimum difficulty (1-10)
            max_level: Maximum difficulty (1-10)
            
        Returns:
            List of exercises in difficulty range
        """
        return [
            ex for ex in self._exercises
            if min_level <= ex.difficulty_level <= max_level
        ]
    
    def get_for_goal(self, goal: TrainingGoal) -> List[Exercise]:
        """
        Get exercises recommended for a training goal.
        
        This is based on modality recommendations for each goal.
        
        Args:
            goal: TrainingGoal enum
            
        Returns:
            List of exercises for that goal
        """
        return get_exercises_for_goal(goal)
    
    def filter(
        self,
        muscle_group: Optional[str] = None,
        modality: Optional[ExerciseModality] = None,
        min_difficulty: Optional[int] = None,
        max_difficulty: Optional[int] = None,
    ) -> List[Exercise]:
        """
        Filter exercises by multiple criteria.
        
        Args:
            muscle_group: Primary muscle group to filter by
            modality: Exercise modality to filter by
            min_difficulty: Minimum difficulty level
            max_difficulty: Maximum difficulty level
            
        Returns:
            List of filtered exercises
        """
        results = self._exercises.copy()
        
        if muscle_group:
            muscle_lower = muscle_group.lower()
            results = [
                ex for ex in results
                if ex.primary_muscle_group.lower() == muscle_lower
            ]
        
        if modality:
            results = [
                ex for ex in results
                if ex.modality == modality
            ]
        
        if min_difficulty is not None:
            results = [
                ex for ex in results
                if ex.difficulty_level >= min_difficulty
            ]
        
        if max_difficulty is not None:
            results = [
                ex for ex in results
                if ex.difficulty_level <= max_difficulty
            ]
        
        return results
    
    def get_exercise_count(self) -> int:
        """
        Get total number of exercises.
        
        Returns:
            Number of exercises in repository
        """
        return len(self._exercises)
    
    def get_muscles_available(self) -> set[str]:
        """
        Get set of all primary muscle groups available.
        
        Returns:
            Set of muscle group names
        """
        return {ex.primary_muscle_group for ex in self._exercises}
