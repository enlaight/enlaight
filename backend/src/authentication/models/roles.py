from enum import Enum


class UserRole(str, Enum):
    ADMINISTRATOR = "ADMINISTRATOR"
    MANAGER = "MANAGER"
    USER = "USER"
