"use client";

import Human, { type Config, type FaceResult } from "@/vendor/human.esm.js";

const config: Partial<Config> = {
  modelBasePath: "/human-models",
  cacheSensitivity: 0.01,
  filter: { enabled: true, equalization: true },
  face: {
    enabled: true,
    detector: { rotation: true, return: false, maxDetected: 1 },
    description: { enabled: true },
    iris: { enabled: false },
    emotion: { enabled: false },
    antispoof: { enabled: true },
    liveness: { enabled: true },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: true },
};

let enginePromise: Promise<Human> | null = null;

async function getEngine(): Promise<Human> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const human = new Human(config);
      await human.load();
      return human;
    })();
  }
  return enginePromise;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không tải được ảnh hồ sơ nhân viên."));
    image.src = url;
  });
}

export async function loadReferenceDescriptor(photoUrl: string): Promise<number[]> {
  const [human, image] = await Promise.all([getEngine(), loadImage(photoUrl)]);
  const result = await human.detect(image);
  if (result.face.length !== 1 || !result.face[0].embedding?.length) {
    throw new Error("Ảnh hồ sơ phải có đúng một khuôn mặt nhìn rõ chính diện.");
  }
  return [...result.face[0].embedding];
}

export interface LiveFaceResult {
  face: FaceResult | null;
  gestures: string[];
  similarity: number;
  real: number;
  live: number;
}

export async function analyzeLiveFace(video: HTMLVideoElement, reference: number[]): Promise<LiveFaceResult> {
  const human = await getEngine();
  const result = await human.detect(video);
  if (result.face.length !== 1 || !result.face[0].embedding?.length) {
    return { face: null, gestures: [], similarity: 0, real: 0, live: 0 };
  }
  const face = result.face[0];
  const embedding = face.embedding;
  if (!embedding) return { face: null, gestures: [], similarity: 0, real: 0, live: 0 };
  const gestures = result.gesture.map((item) => item.gesture);
  const similarity = human.match.similarity(embedding, reference, {
    order: 2,
    multiplier: 25,
    min: 0.2,
    max: 0.8,
  });
  return {
    face,
    gestures,
    similarity,
    real: face.real ?? 0,
    live: face.live ?? 0,
  };
}
