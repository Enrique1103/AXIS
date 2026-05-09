import os
import logging
from fastapi import HTTPException, Header
from jose import jwt, JWTError

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def get_user_id(authorization: str = Header(...)) -> str:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    try:
        token = authorization.removeprefix("Bearer ")
        logger.warning(f"[AUTH] token prefix: {token[:30]}...")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        logger.warning(f"[AUTH] ok, sub={payload['sub']}")
        return payload["sub"]
    except JWTError as e:
        logger.error(f"[AUTH] JWTError: {e}")
        raise HTTPException(status_code=401, detail=f"JWT error: {e}")
