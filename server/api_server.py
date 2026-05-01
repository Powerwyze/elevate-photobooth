"""api_server.py — FastAPI backend for the Elevate Women's Conference photo booth.

Runs on port 8000 inside the sandbox.

Endpoints:
- POST /api/generate   — upload guest photo, return AI caricature in Capri scene
- POST /api/send-sms   — send the generated portrait to the guest's phone via Twilio MMS
- GET  /api/health     — quick liveness check
"""
import base64
import io
import os
import re
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from PIL import Image

from generate_image import generate_image

app = FastAPI()


@app.on_event("startup")
async def warmup_assets():
    """On first boot, generate any missing static visual assets."""
    import asyncio
    asyncio.create_task(_generate_missing_assets())


async def _generate_missing_assets():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "assets")
    os.makedirs(out_dir, exist_ok=True)
    assets = [
        ("capri-bg.jpg", "9:16",
         "Soft watercolor illustration of Capri Italy coastline at golden hour. Pastel cream and soft yellow sky, turquoise Mediterranean sea, white-and-pastel cliffside villas climbing the rocks, Faraglioni sea stacks visible in the distance. Hanging lemon branches with green leaves frame the upper edges. Light, airy, very pale and washed out, meant to be a faint background. Painterly, hand-drawn aesthetic, no text, no logos."),
        ("conf-1.jpg", "16:9",
         "Watercolor illustration: an intimate evening reception in a Capri lemon grove, string lights between trees, women in summer dresses gathering around tables with white linens and lemons. Warm golden light. No text. Painterly."),
        ("conf-2.jpg", "16:9",
         "Watercolor illustration: a sunlit conference space in a Capri villa, women on stage speaking, audience seated, large windows opening to the Mediterranean sea. Cream walls, blue-and-white Italian tile floor accents. Painterly, no text."),
        ("conf-3.jpg", "16:9",
         "Watercolor illustration: cocktail hour on a cliffside terrace in Capri overlooking the Faraglioni sea stacks. Limoncello glasses on a marble bar, hanging lemons, blue-and-white tile detail, golden hour light. Painterly, no text."),
        ("conf-4.jpg", "16:9",
         "Watercolor illustration: long-table brunch by the Mediterranean sea in Capri, white linen, bowls of fresh lemons, espresso cups, cream pastries. Bright morning light on turquoise water. Painterly, no text."),
        ("conf-5.jpg", "16:9",
         "Watercolor illustration: closing sunset in Capri over Anacapri, women raising champagne glasses on a cliffside terrace, sun dropping into Mediterranean sea, warm pink and gold sky, hanging lemon branch in foreground. Painterly, no text."),
    ]
    for name, ratio, prompt in assets:
        path = os.path.join(out_dir, name)
        if os.path.exists(path):
            continue
        try:
            print(f"[warmup] generating {name} …")
            data = await generate_image(prompt, aspect_ratio=ratio)
            with open(path, "wb") as f:
                f.write(data)
            print(f"[warmup] wrote {name} ({len(data)} bytes)")
        except Exception as e:
            print(f"[warmup] FAILED {name}: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Caricature prompt ---------------------------------------------------------

CARICATURE_PROMPT = """Transform this photo into a stylized illustrated caricature scene
in a warm, vibrant painterly aesthetic — NOT photorealistic. The output is a souvenir
portrait for the Elevate Women's Conference 2026 in Capri, Italy.

SCENE: Place this person as the SOLE DRIVER (behind the steering wheel) of a light blue
vintage convertible — a 1960s-era Italian roadster, robin's-egg blue, chrome trim, top
down — cruising along a coastal road in Capri, Italy. Preserve the person's actual face,
hair, skin tone, and identity faithfully — just stylize them as a charming caricature
with slightly exaggerated, friendly features. They should look joyful, hands on the
wheel, hair gently moving in the wind, wearing chic Italian summer attire (sundress or
linen shirt, oversized sunglasses, maybe a light scarf).

BACKGROUND: The Mediterranean Sea sparkling turquoise on one side, dramatic Capri
cliffside architecture and pastel villas climbing the rocks on the other. Warm
late-afternoon golden-hour light. Mediterranean cypress trees in the distance.

FRAME DECORATIONS: Hanging lemons and lemon branches with green leaves draping into
the upper corners of the image. Blue-and-white hand-painted Italian Majolica tile
patterns as decorative accent borders along the edges. The overall palette is warm
ochre, terracotta, light blue, lemon yellow, and crisp white.

STYLE: Illustrated caricature / watercolor-painterly, hand-drawn feel, warm and
vibrant, like a high-end travel magazine illustration. Soft brushwork, visible
painterly texture. Joyful, celebratory, feminine, sophisticated.

Important: The person must remain clearly recognizable. Do not change their ethnicity,
fundamental face shape, or eye/hair color. Keep their face the focal point of the
composition. No text, no watermark, no logos in the image — those will be added later
in the frame.
"""


# --- Image utilities -----------------------------------------------------------

def composite_logo_overlay(scene_bytes: bytes) -> bytes:
    """Place the Elevate logo as an embedded frame element on the generated scene."""
    logo_path = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "elevate-logo.png")
    if not os.path.exists(logo_path):
        return scene_bytes

    try:
        scene = Image.open(io.BytesIO(scene_bytes)).convert("RGBA")
        logo = Image.open(logo_path).convert("RGBA")

        # Logo width = 38% of scene width
        target_w = int(scene.width * 0.38)
        ratio = target_w / logo.width
        target_h = int(logo.height * ratio)
        logo = logo.resize((target_w, target_h), Image.LANCZOS)

        # Soft white pill behind logo for legibility
        pad_x = int(target_w * 0.08)
        pad_y = int(target_h * 0.10)
        pill_w = target_w + pad_x * 2
        pill_h = target_h + pad_y * 2
        pill = Image.new("RGBA", (pill_w, pill_h), (255, 255, 255, 230))

        # Round the pill corners
        from PIL import ImageDraw
        mask = Image.new("L", (pill_w, pill_h), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [(0, 0), (pill_w, pill_h)], radius=int(pill_h * 0.18), fill=255
        )
        pill.putalpha(mask)

        # Position pill near bottom-center of the scene
        margin_y = int(scene.height * 0.04)
        x = (scene.width - pill_w) // 2
        y = scene.height - pill_h - margin_y

        scene.alpha_composite(pill, (x, y))
        scene.alpha_composite(logo, (x + pad_x, y + pad_y))

        out = io.BytesIO()
        scene.convert("RGB").save(out, format="JPEG", quality=92)
        return out.getvalue()
    except Exception as e:
        print(f"[logo composite] failed: {e}")
        return scene_bytes


def normalize_phone_e164(raw: str, default_country: str = "+1") -> Optional[str]:
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        return None
    if raw.strip().startswith("+"):
        return "+" + digits
    if len(digits) == 10:
        return default_country + digits
    if len(digits) == 11 and digits.startswith("1"):
        return "+" + digits
    return "+" + digits


# --- Endpoints -----------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/generate")
async def generate(
    image: UploadFile = File(...),
    first_name: str = Form(""),
    last_name: str = Form(""),
    phone: str = Form(""),
):
    """Accepts a captured guest photo, returns the caricature image bytes."""
    try:
        photo_bytes = await image.read()
        if not photo_bytes:
            raise HTTPException(status_code=400, detail="empty image")

        # Cap the input photo to keep prompt fast
        try:
            src = Image.open(io.BytesIO(photo_bytes)).convert("RGB")
            src.thumbnail((1024, 1024))
            buf = io.BytesIO()
            src.save(buf, format="JPEG", quality=88)
            photo_bytes = buf.getvalue()
        except Exception:
            pass

        scene_bytes = await generate_image(
            CARICATURE_PROMPT,
            image_bytes=photo_bytes,
            image_media_type="image/jpeg",
            aspect_ratio="3:4",
            model="nano_banana_2",
        )

        final_bytes = composite_logo_overlay(scene_bytes)
        return Response(content=final_bytes, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[generate] error: {e}")
        raise HTTPException(status_code=422, detail=f"generation failed: {e}")


@app.post("/api/send-sms")
async def send_sms(payload: dict):
    """Send the generated portrait to the guest via Twilio MMS.

    Expected JSON: { phone, firstName, imageBase64 }
    Reads Twilio creds from env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
    For MMS the image must be hosted at a public URL — we accept a media_url passed in,
    otherwise the endpoint returns 501 with a hint to wire up media hosting.
    """
    phone_raw = payload.get("phone", "")
    first = payload.get("firstName", "there")
    media_url = payload.get("mediaUrl")  # optional pre-hosted image URL
    image_b64 = payload.get("imageBase64")  # optional inline image (not directly usable for MMS)

    phone = normalize_phone_e164(phone_raw)
    if not phone:
        raise HTTPException(status_code=400, detail="invalid phone number")

    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_num = os.environ.get("TWILIO_FROM_NUMBER")

    if not (sid and token and from_num):
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "scaffolded": True,
                "message": (
                    "Twilio not configured yet. Set TWILIO_ACCOUNT_SID, "
                    "TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER env vars before the event."
                ),
                "phone": phone,
            },
        )

    if not media_url:
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "scaffolded": True,
                "message": "Image hosting not configured. Wire up an image upload step (e.g. Supabase Storage) and pass mediaUrl.",
                "phone": phone,
            },
        )

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(sid, token)
        msg = client.messages.create(
            body=f"{first}, here's your Elevate Women's Conference souvenir — Designed for More.",
            from_=from_num,
            to=phone,
            media_url=[media_url],
        )
        return {"ok": True, "sid": msg.sid, "phone": phone}
    except ImportError:
        raise HTTPException(status_code=500, detail="twilio package not installed")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"sms failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
