"""
Google Sheets Data Storage Service Layer
Sri Adithya Organics Platform
Provides isolated, resilient, and cached storage on top of Google Sheets API v4.
"""

from backend.app.sheets.service import SheetsService, get_sheets_service

__all__ = ["SheetsService", "get_sheets_service"]

