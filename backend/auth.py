import os
import jwt as pyjwt
from jwt import PyJWKClient, PyJWTError
from fastapi import HTTPException, Request

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
JWT_SECRET   = os.getenv("SUPABASE_JWT_SECRET", "")

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client is None and SUPABASE_URL:
        url = f"{SUPABASE_URL}/.well-known/jwks.json"
        print(f"[AUTH] initializing JWKS client: {url}", flush=True)
        _jwks_client = PyJWKClient(url, cache_keys=True)
    return _jwks_client


def get_user_id(request: Request) -> str:
    authorization = request.headers.get("authorization") or request.headers.get("Authorization")
    print(f"[AUTH] header present: {bool(authorization)}", flush=True)
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.removeprefix("Bearer ")

    # 1) JWKS — handles ES256, RS256, and HS256 with kid
    client = _get_jwks_client()
    if client:
        try:
            signing_key = client.get_signing_key_from_jwt(token)
            payload = pyjwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256", "HS256"],
                audience="authenticated",
            )
            print(f"[AUTH] JWKS ok sub={payload['sub']}", flush=True)
            return payload["sub"]
        except PyJWTError as e:
            print(f"[AUTH] JWKS failed: {e}", flush=True)
        except Exception as e:
            print(f"[AUTH] JWKS error: {e}", flush=True)

    # 2) Fallback: legacy HS256 secret
    if JWT_SECRET:
        try:
            payload = pyjwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            print(f"[AUTH] secret ok sub={payload['sub']}", flush=True)
            return payload["sub"]
        except PyJWTError as e:
            print(f"[AUTH] secret failed: {e}", flush=True)

    raise HTTPException(status_code=401, detail="Token validation failed")
