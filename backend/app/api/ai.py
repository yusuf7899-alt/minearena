"""
AI Pre-Audit Inquiry API.
Exposes real Google Gemini endpoints for grounded auditor inquiries.
"""
from fastapi import APIRouter, HTTPException
from backend.app.services.ai_inquiry_service import (
    ai_inquiry_service,
    AIInquiryRequest,
    AIInquiryResponse,
)

router = APIRouter(prefix="/api/ai", tags=["AI Auditor Inquiries"])

@router.post("/inquire", response_model=AIInquiryResponse)
async def inquire_ai(req: AIInquiryRequest):
    return await ai_inquiry_service.inquire(req)

