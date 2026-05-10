import os
import httpx
from fastapi import HTTPException, Request
from jose import jwt, jwk, JWTError

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
JWT_SECRET   = os.getenv("SUPABASE_JWT_SECRET", "")

_jwks: dict | None = None


async def _fetch_jwks() -> dict | None:
    global _jwks
    if _jwks is not None:
        return _jwks
    if not SUPABASE_URL:
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{SUPABASE_URL}/.well-known/jwks.json", timeout=5)
            _jwks = r.json()
            print(f"[AUTH] JWKS loaded: {[k.get('kid') for k in _jwks.get('keys', [])]}", flush=True)
    except Exception as e:
        print(f"[AUTH] JWKS fetch failed: {e}", flush=True)
    return _jwks


async def get_user_id(request: Request) -> str:
    authorization = request.headers.get("authorization") or request.headers.get("Authorization")
    print(f"[AUTH] header present: {bool(authorization)}", flush=True)
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.removeprefix("Bearer ")

    # 1) Try JWKS (handles RS256 and HS256 with kid)
    jwks = await _fetch_jwks()
    if jwks:
        try:
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            alg = header.get("alg", "RS256")
            print(f"[AUTH] token alg={alg} kid={kid}", flush=True)
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
            if key:
                payload = jwt.decode(token, key, algorithms=[alg], audience="authenticated")
                print(f"[AUTH] JWKS ok sub={payload['sub']}", flush=True)
                return payload["sub"]
        except JWTError as e:
            print(f"[AUTH] JWKS failed: {e}", flush=True)

    # 2) Fallback: plain HS256 secret
    if JWT_SECRET:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
            print(f"[AUTH] secret ok sub={payload['sub']}", flush=True)
            return payload["sub"]
        except JWTError as e:
            print(f"[AUTH] secret failed: {e}", flush=True)

    raise HTTPException(status_code=401, detail="Token validation failed")
