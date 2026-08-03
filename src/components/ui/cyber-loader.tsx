"use client";

/**
 * Màn hình loading phong cách cyberpunk cho HRM Cơ Khí Tiến Huy.
 * Logo neon ở giữa (blue #2f7ff5 + orange #ff7a18) với hiệu ứng ánh sáng: vòng
 * hào quang xoay, quét sáng, lưới phối cảnh, scanline, khung HUD, thanh tiến trình.
 * Toàn bộ CSS nhúng trong component (không phụ thuộc file ngoài) — an toàn cho
 * static export.
 */
export function CyberLoader({ label = "ĐANG KHỞI ĐỘNG HỆ THỐNG" }: { label?: string }) {
  return (
    <div className="ckl-root">
      <style>{CSS}</style>

      {/* Nền: lưới phối cảnh + scanline + vignette */}
      <div className="ckl-grid" />
      <div className="ckl-scanlines" />
      <div className="ckl-vignette" />

      {/* Khung HUD 4 góc */}
      <span className="ckl-corner ckl-tl" />
      <span className="ckl-corner ckl-tr" />
      <span className="ckl-corner ckl-bl" />
      <span className="ckl-corner ckl-br" />

      <div className="ckl-stage">
        <div className="ckl-emblem">
          <div className="ckl-halo" />
          <div className="ckl-ring ckl-ring-a" />
          <div className="ckl-ring ckl-ring-b" />
          <div className="ckl-disc">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Cơ Khí Tiến Huy" className="ckl-logo" />
            <div className="ckl-sweep" />
          </div>
        </div>

        <div className="ckl-title">
          CƠ KHÍ <span>TIẾN HUY</span>
        </div>

        <div className="ckl-sub">
          {label}
          <span className="ckl-dots"><i /><i /><i /></span>
        </div>

        <div className="ckl-bar">
          <div className="ckl-bar-fill" />
        </div>
      </div>
    </div>
  );
}

const CSS = `
.ckl-root{
  --blue:#2f7ff5; --orange:#ff7a18; --cyan:#43e6ff;
  position:fixed; inset:0; z-index:9999; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:radial-gradient(120% 90% at 50% 30%, #0b1430 0%, #060a18 55%, #03040a 100%);
  font-family:var(--font-mono, ui-monospace, "SF Mono", Menlo, monospace);
  color:#dfe8ff;
}
/* Lưới phối cảnh chạy */
.ckl-grid{
  position:absolute; left:50%; bottom:-10%; width:200%; height:70%;
  transform:translateX(-50%) perspective(420px) rotateX(62deg);
  background-image:
    linear-gradient(rgba(47,127,245,.35) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,122,24,.22) 1px, transparent 1px);
  background-size:44px 44px;
  animation:ckl-grid 3.2s linear infinite;
  mask-image:linear-gradient(to top, #000 0%, transparent 78%);
  -webkit-mask-image:linear-gradient(to top, #000 0%, transparent 78%);
  opacity:.7;
}
@keyframes ckl-grid{ to{ background-position:0 44px, 44px 0; } }

.ckl-scanlines{
  position:absolute; inset:0; pointer-events:none; opacity:.35;
  background:repeating-linear-gradient(to bottom, rgba(255,255,255,.05) 0 1px, transparent 1px 3px);
  animation:ckl-scan 6s linear infinite;
}
@keyframes ckl-scan{ to{ background-position:0 300px; } }

.ckl-vignette{
  position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(70% 60% at 50% 45%, transparent 55%, rgba(0,0,0,.7) 100%);
}

/* Khung góc HUD */
.ckl-corner{ position:absolute; width:46px; height:46px; opacity:.85;
  animation:ckl-flick 4s steps(30) infinite; }
.ckl-tl{ top:26px; left:26px; border-top:2px solid var(--cyan); border-left:2px solid var(--cyan); }
.ckl-tr{ top:26px; right:26px; border-top:2px solid var(--orange); border-right:2px solid var(--orange); }
.ckl-bl{ bottom:26px; left:26px; border-bottom:2px solid var(--orange); border-left:2px solid var(--orange); }
.ckl-br{ bottom:26px; right:26px; border-bottom:2px solid var(--cyan); border-right:2px solid var(--cyan); }
@keyframes ckl-flick{ 0%,97%,100%{opacity:.85} 98%{opacity:.25} 99%{opacity:.9} }

.ckl-stage{ position:relative; display:flex; flex-direction:column; align-items:center; gap:26px; }

.ckl-emblem{ position:relative; width:230px; height:230px; display:flex; align-items:center; justify-content:center; }

/* Hào quang mờ phía sau */
.ckl-halo{
  position:absolute; inset:-24%;
  background:radial-gradient(circle, rgba(47,127,245,.55), rgba(255,122,24,.25) 45%, transparent 70%);
  filter:blur(14px); animation:ckl-pulse 2.4s ease-in-out infinite;
}
@keyframes ckl-pulse{ 0%,100%{opacity:.6; transform:scale(.96)} 50%{opacity:1; transform:scale(1.06)} }

/* Vòng sáng xoay (conic) */
.ckl-ring{ position:absolute; border-radius:50%; inset:0; }
.ckl-ring-a{
  background:conic-gradient(from 0deg, transparent 0 62%, var(--cyan) 78%, var(--blue) 88%, transparent 100%);
  -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
          mask:radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  animation:ckl-spin 2.6s linear infinite;
  filter:drop-shadow(0 0 6px var(--cyan));
}
.ckl-ring-b{
  inset:-16px;
  background:conic-gradient(from 180deg, transparent 0 68%, var(--orange) 84%, transparent 100%);
  -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
          mask:radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  animation:ckl-spin 3.8s linear infinite reverse;
  filter:drop-shadow(0 0 6px var(--orange));
}
@keyframes ckl-spin{ to{ transform:rotate(360deg); } }

/* Đĩa chứa logo */
.ckl-disc{
  position:relative; width:170px; height:170px; border-radius:50%; overflow:hidden;
  background:radial-gradient(circle at 50% 38%, #ffffff 0%, #eaf1ff 58%, #b9cdf5 100%);
  box-shadow:
    0 0 22px rgba(47,127,245,.75),
    0 0 46px rgba(255,122,24,.45),
    inset 0 0 24px rgba(10,25,60,.25);
  animation:ckl-breathe 2.4s ease-in-out infinite;
}
@keyframes ckl-breathe{ 0%,100%{box-shadow:0 0 22px rgba(47,127,245,.7),0 0 40px rgba(255,122,24,.4),inset 0 0 24px rgba(10,25,60,.25)} 50%{box-shadow:0 0 34px rgba(47,127,245,.95),0 0 66px rgba(255,122,24,.6),inset 0 0 24px rgba(10,25,60,.25)} }
.ckl-logo{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:16px;
  animation:ckl-glitch 5s steps(1) infinite; }
@keyframes ckl-glitch{ 0%,92%,100%{transform:translate(0,0); filter:none}
  93%{transform:translate(-2px,1px); filter:hue-rotate(12deg)}
  95%{transform:translate(2px,-1px)} 97%{transform:translate(-1px,0)} }

/* Thanh quét sáng qua logo */
.ckl-sweep{
  position:absolute; top:-40%; left:-60%; width:60%; height:180%;
  background:linear-gradient(105deg, transparent, rgba(255,255,255,.85), transparent);
  transform:rotate(18deg); animation:ckl-sweep 2.8s ease-in-out infinite;
}
@keyframes ckl-sweep{ 0%{left:-60%} 55%,100%{left:130%} }

/* Chữ thương hiệu */
.ckl-title{
  font-weight:800; font-size:26px; letter-spacing:.32em; padding-left:.32em;
  color:var(--cyan); text-shadow:0 0 10px rgba(67,230,255,.8), 0 0 22px rgba(47,127,245,.6);
}
.ckl-title span{ color:var(--orange); text-shadow:0 0 10px rgba(255,122,24,.85), 0 0 22px rgba(255,122,24,.55); }

.ckl-sub{ display:flex; align-items:center; gap:8px; font-size:11.5px; letter-spacing:.34em;
  color:#9fb4e6; text-transform:uppercase; }
.ckl-dots{ display:inline-flex; gap:4px; }
.ckl-dots i{ width:5px; height:5px; border-radius:50%; background:var(--cyan);
  box-shadow:0 0 6px var(--cyan); animation:ckl-blink 1.2s infinite; }
.ckl-dots i:nth-child(2){ animation-delay:.2s; background:var(--blue); box-shadow:0 0 6px var(--blue); }
.ckl-dots i:nth-child(3){ animation-delay:.4s; background:var(--orange); box-shadow:0 0 6px var(--orange); }
@keyframes ckl-blink{ 0%,100%{opacity:.25; transform:scale(.8)} 50%{opacity:1; transform:scale(1.15)} }

/* Thanh tiến trình neon */
.ckl-bar{ position:relative; width:260px; height:4px; border-radius:4px; overflow:hidden;
  background:rgba(255,255,255,.08); box-shadow:inset 0 0 0 1px rgba(67,230,255,.25); }
.ckl-bar-fill{ position:absolute; top:0; left:-40%; width:40%; height:100%; border-radius:4px;
  background:linear-gradient(90deg, transparent, var(--blue), var(--cyan), var(--orange), transparent);
  box-shadow:0 0 12px var(--cyan); animation:ckl-bar 1.4s cubic-bezier(.6,0,.4,1) infinite; }
@keyframes ckl-bar{ 0%{left:-45%} 100%{left:105%} }

@media (max-width:480px){
  .ckl-emblem{ width:190px; height:190px; } .ckl-disc{ width:140px; height:140px; }
  .ckl-title{ font-size:21px; } .ckl-bar{ width:210px; }
}
@media (prefers-reduced-motion:reduce){
  .ckl-grid,.ckl-scanlines,.ckl-ring,.ckl-sweep,.ckl-bar-fill,.ckl-halo,.ckl-disc,.ckl-logo,.ckl-dots i,.ckl-corner{ animation:none !important; }
}
`;
