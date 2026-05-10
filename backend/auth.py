from fastapi import HTTPException, Request
from database import get_db


def get_user_id(request: Request) -> str:
    authorization = request.headers.get("authorization") or request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        db = get_db()
        response = db.auth.get_user(token)
        user = response.user
        if user:
            print(f"[AUTH] ok sub={user.id}", flush=True)
            return str(user.id)
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH] error: {e}", flush=True)
        raise HTTPException(status_code=401, detail="Token validation failed")
