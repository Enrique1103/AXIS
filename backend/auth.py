import os
from fastapi import HTTPException, Request
from jose import jwt, JWTError

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def get_user_id(request: Request) -> str:
    authorization = request.headers.get("authorization") or request.headers.get("Authorization")
    print(f"[AUTH] authorization present: {bool(authorization)}", flush=True)
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    try:
        token = authorization.removeprefix("Bearer ")
        print(f"[AUTH] token prefix: {token[:40]}...", flush=True)
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        print(f"[AUTH] ok sub={payload['sub']}", flush=True)
        return payload["sub"]
    except JWTError as e:
        print(f"[AUTH] JWTError: {e}", flush=True)
        raise HTTPException(status_code=401, detail=f"JWT error: {e}")
