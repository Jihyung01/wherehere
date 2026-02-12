"""Models module - Phase 1 simplified"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RoleType(str, Enum):
    EXPLORER = "explorer"
    HEALER = "healer"
    ARCHIVIST = "archivist"
    RELATION = "relation"
    ACHIEVER = "achiever"
