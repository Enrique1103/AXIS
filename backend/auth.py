import os
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def get_user_id(authorization: str = Header(...)) -> str:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    try:
        token = authorization.removeprefix("Bearer ")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
