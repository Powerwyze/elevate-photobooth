// /api/photo — QR-first flow:
// Receives base64 JPEG, runs Gemini 2.5 Flash Image with the Capri caricature prompt,
// composites the Elevate logo, uploads to Supabase Storage, inserts a row in
// elevate_photos, returns { photo_id, public_url }.

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

const CARICATURE_PROMPT = `Transform this photo into a stylized illustrated caricature scene
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
in the frame.`;

let cachedLogoBuffer = null;
async function loadLogo() {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  // Try a few likely locations for the logo (depends on how Vercel bundles assets)
  const candidates = [
    path.join(process.cwd(), 'public', 'assets', 'elevate-logo.png'),
    path.join(process.cwd(), 'assets', 'elevate-logo.png'),
    path.join(process.cwd(), '..', 'public', 'assets', 'elevate-logo.png'),
  ];
  for (const p of candidates) {
    try {
      cachedLogoBuffer = await readFile(p);
      return cachedLogoBuffer;
    } catch (_) {
      // try next
    }
  }
  // If no logo found, fetch from public URL as fallback
  try {
    const res = await fetch('https://elevate-photobooth.vercel.app/assets/elevate-logo.png');
    if (res.ok) {
      cachedLogoBuffer = Buffer.from(await res.arrayBuffer());
      return cachedLogoBuffer;
    }
  } catch (_) {
    // give up
  }
  return null;
}

async function compositeLogoOverlay(sceneBuffer) {
  try {
    const logoBuffer = await loadLogo();
    if (!logoBuffer) return sceneBuffer;

    const sceneMeta = await sharp(sceneBuffer).metadata();
    const targetW = Math.round(sceneMeta.width * 0.38);

    // Resize logo proportionally
    const resizedLogo = await sharp(logoBuffer)
      .resize({ width: targetW })
      .toBuffer();
    const logoMeta = await sharp(resizedLogo).metadata();

    const padX = Math.round(targetW * 0.08);
    const padY = Math.round(logoMeta.height * 0.10);
    const pillW = targetW + padX * 2;
    const pillH = logoMeta.height + padY * 2;
    const radius = Math.round(pillH * 0.18);

    // Build a rounded white pill via SVG
    const pillSvg = Buffer.from(
      `<svg width="${pillW}" height="${pillH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${pillW}" height="${pillH}" rx="${radius}" ry="${radius}" fill="rgba(255,255,255,0.90)"/>
      </svg>`
    );
    const pill = await sharp(pillSvg).png().toBuffer();

    const marginY = Math.round(sceneMeta.height * 0.04);
    const pillX = Math.round((sceneMeta.width - pillW) / 2);
    const pillY = sceneMeta.height - pillH - marginY;
    const logoX = pillX + padX;
    const logoY = pillY + padY;

    return await sharp(sceneBuffer)
      .composite([
        { input: pill, left: pillX, top: pillY },
        { input: resizedLogo, left: logoX, top: logoY },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch (e) {
    console.error('[logo composite] failed:', e);
    return sceneBuffer;
  }
}

async function shrinkInputJpeg(buffer) {
  try {
    return await sharp(buffer)
      .rotate() // honor EXIF orientation
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch (e) {
    console.error('[shrink input] failed:', e);
    return buffer;
  }
}

async function generateCapriPortrait(inputJpegBuffer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const ai = new GoogleGenAI({ apiKey });

  const base64Image = inputJpegBuffer.toString('base64');
  const contents = [
    { text: CARICATURE_PROMPT },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents,
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: '3:4' },
    },
  });

  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }
  // Detailed error if Gemini refused to return an image
  const textParts = parts.filter((p) => p.text).map((p) => p.text).join(' | ');
  throw new Error(`Gemini returned no image. Response: ${textParts || 'empty'}`);
}

async function uploadAndRecord(jpegBuffer) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'elevate-photos';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase env not configured');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(filename, jpegBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (upErr) throw new Error(`Supabase upload failed: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filename);
  const publicUrl = (pub?.publicUrl || '').replace(/\?$/, '');

  const { data: row, error: insErr } = await supabase
    .from('elevate_photos')
    .insert({ storage_path: filename, public_url: publicUrl })
    .select('id')
    .single();
  if (insErr) throw new Error(`Supabase insert failed: ${insErr.message}`);

  return { photo_id: row.id, public_url: publicUrl };
}

async function readJsonBody(req) {
  // Vercel Node runtime does NOT auto-parse JSON for function handlers
  // when the body is large; collect it manually for safety.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return null;
    }
  }
  return await new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const imageB64 = body?.imageBase64;
    if (!imageB64 || typeof imageB64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 required' });
    }

    const inputBuffer = Buffer.from(imageB64, 'base64');
    if (inputBuffer.length === 0) {
      return res.status(400).json({ error: 'empty image' });
    }

    const shrunk = await shrinkInputJpeg(inputBuffer);
    const sceneBuffer = await generateCapriPortrait(shrunk);
    const finalBuffer = await compositeLogoOverlay(sceneBuffer);
    const result = await uploadAndRecord(finalBuffer);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[/api/photo] error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
