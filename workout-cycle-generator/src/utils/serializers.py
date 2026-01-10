"""
Serialization utilities for JSON encoding/decoding.

Provides helpers for converting model objects to/from JSON format.
"""

import json
from typing import Any, Dict, Type, TypeVar
from datetime import datetime

T = TypeVar('T')


def to_json(obj: Any) -> str:
    """
    Serialize an object to JSON string.
    
    Handles dataclass objects with to_dict() method.
    
    Args:
        obj: Object to serialize
        
    Returns:
        JSON string representation
    """
    if hasattr(obj, 'to_dict'):
        return json.dumps(obj.to_dict(), indent=2, default=str)
    elif hasattr(obj, '__dataclass_fields__'):
        from dataclasses import asdict
        return json.dumps(asdict(obj), indent=2, default=str)
    else:
        return json.dumps(obj, indent=2, default=str)


def from_json(json_str: str, model_class: Type[T]) -> T:
    """
    Deserialize JSON string to model object.
    
    Args:
        json_str: JSON string
        model_class: Model class to deserialize to
        
    Returns:
        Deserialized model instance
    """
    data = json.loads(json_str)
    if hasattr(model_class, 'from_dict'):
        return model_class.from_dict(data)
    else:
        return model_class(**data)


def to_json_file(obj: Any, filepath: str) -> None:
    """
    Serialize an object to a JSON file.
    
    Args:
        obj: Object to serialize
        filepath: Path to write to
    """
    json_str = to_json(obj)
    with open(filepath, 'w') as f:
        f.write(json_str)


def from_json_file(filepath: str, model_class: Type[T]) -> T:
    """
    Deserialize a JSON file to model object.
    
    Args:
        filepath: Path to read from
        model_class: Model class to deserialize to
        
    Returns:
        Deserialized model instance
    """
    with open(filepath, 'r') as f:
        json_str = f.read()
    return from_json(json_str, model_class)


def dict_to_pretty_json(data: Dict[str, Any]) -> str:
    """
    Convert dictionary to pretty-printed JSON.
    
    Args:
        data: Dictionary to convert
        
    Returns:
        Pretty JSON string
    """
    return json.dumps(data, indent=2, default=str)


def json_to_dict(json_str: str) -> Dict[str, Any]:
    """
    Convert JSON string to dictionary.
    
    Args:
        json_str: JSON string
        
    Returns:
        Dictionary
    """
    return json.loads(json_str)


class CycleEncoder(json.JSONEncoder):
    """Custom JSON encoder for model objects."""
    
    def default(self, obj: Any) -> Any:
        """
        Handle encoding of custom objects.
        
        Args:
            obj: Object to encode
            
        Returns:
            Encoded representation
        """
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        elif hasattr(obj, '__dataclass_fields__'):
            from dataclasses import asdict
            return asdict(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        else:
            return super().default(obj)


def to_json_with_encoder(obj: Any, indent: int = 2) -> str:
    """
    Serialize object to JSON using CycleEncoder.
    
    Args:
        obj: Object to serialize
        indent: Indentation level
        
    Returns:
        JSON string
    """
    return json.dumps(obj, cls=CycleEncoder, indent=indent)


def validate_json_schema(
    data: Dict[str, Any],
    required_fields: list[str]
) -> bool:
    """
    Validate that data contains required fields.
    
    Args:
        data: Dictionary to validate
        required_fields: List of required field names
        
    Returns:
        True if valid, raises KeyError if not
    """
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise KeyError(f"Missing required fields: {missing}")
    return True
