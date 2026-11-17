"""Customer-facing, read-only AI support endpoint."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.ai.customer_support import customer_support_agent
from backend.app.d1 import get_d1
from backend.app.deps import get_optional_user

router = APIRouter(prefix="/ai/support", tags=["Customer AI Support"])


class SupportChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    conversation_history: Optional[List[Dict[str, str]]] = None


@router.post("/chat")
async def support_chat(
    payload: SupportChatRequest,
    d1=Depends(get_d1),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    return await customer_support_agent.ask(
        d1=d1,
        question=question,
        user=current_user,
        conversation_history=(payload.conversation_history or [])[-6:],
    )
