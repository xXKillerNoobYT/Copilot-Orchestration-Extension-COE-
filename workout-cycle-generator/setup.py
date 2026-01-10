"""
Setup configuration for workout-cycle-generator package.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="workout-cycle-generator",
    version="1.0.0",
    author="Workout Cycle Generator Contributors",
    description="A comprehensive Python library for generating personalized training cycles",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/workout-cycle-generator",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Intended Audience :: Healthcare Industry",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.9",
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "pylint>=2.15.0",
            "mypy>=1.0.0",
        ],
    },
)
