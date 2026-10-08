#!/usr/bin/env python3
"""
Builds docs/assets/site-preview.gif for the Velvet Scoop site.

Every frame is drawn as an SVG string (see frame_svg), rasterised with
CairoSVG, then stitched into a looping GIF with ffmpeg's palettegen/paletteuse.

    pip install cairosvg
    python3 docs/assets/make_preview.py

Requires ffmpeg on PATH. Fonts: uses Liberation Serif / Sans as stand-ins for
Playfair Display / Plus Jakarta Sans, so the GIF renders the same anywhere.
"""
import math, os, shutil, subprocess, sys, tempfile
import cairosvg

W, H, FPS = 800, 450, 12
SCENES = [2.4, 2.4, 2.6, 3.6]            # hero, craft, flavors, chatbot (seconds)
TOTAL = sum(SCENES)
FADE = 0.3

# ---- design tokens (mirrors src/index.css and src/lib/state.ts) -------------
CREAM, BERRY, COCOA, WAFFLE, GOLD = "#FFF5E1", "#FF3366", "#2B1B17", "#D4A373", "#E5A93C"
MINT = "#B5EAD7"
FLAV = [  # accent, light, rim
    ("#FF6B8B", "#ffd9e0", "#FF3366", "Wild Strawberry", "Electric Berry", "$4.00 / scoop"),
    ("#A8E6CF", "#e2f7ec", "#5fbf94", "Sicilian Pistachio", "Mint Sundae", "$4.50 / scoop"),
    ("#8a5a33", "#f3e2cf", "#5C3A21", "Dark Cacao Fudge", "Deep Chocolate", "$4.50 / scoop"),
    ("#FFB347", "#ffe9c7", "#ff8c42", "Mango Passionfruit", "Sunshine Sorbet", "$4.00 / scoop"),
]
SERIF = "Liberation Serif, DejaVu Serif, serif"
SANS = "Liberation Sans, DejaVu Sans, sans-serif"


# ---- helpers ----------------------------------------------------------------
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def lerp(a, b, t): return a + (b - a) * t
def ease(x): x = clamp(x); return 1 - (1 - x) ** 3
def ease_io(x): x = clamp(x); return 3 * x * x - 2 * x ** 3
def span(t, a, b): return clamp((t - a) / (b - a))

def hex2rgb(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def mix(c1, c2, t):
    a, b = hex2rgb(c1), hex2rgb(c2)
    return "#%02x%02x%02x" % tuple(round(lerp(a[i], b[i], t)) for i in range(3))

def flavor_at(f):
    """Smoothly interpolated (accent, light, rim) for a fractional flavor index."""
    i = int(f) % 4; j = (i + 1) % 4; t = ease_io(f - int(f))
    return tuple(mix(FLAV[i][k], FLAV[j][k], t) for k in range(3))

def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")


# ---- drawing blocks ---------------------------------------------------------
def cone(cx, cy, s, tilt, accent, light, rim, uid="c"):
    """Waffle cone + scoop, origin = rim of the cone."""
    tri = f"{cx-42*s:.1f},{cy:.1f} {cx+42*s:.1f},{cy:.1f} {cx:.1f},{cy+135*s:.1f}"
    lines = []
    for k in range(-8, 9):
        x = cx + k * 13 * s
        lines.append(f'<line x1="{x-60*s:.1f}" y1="{cy-5*s:.1f}" x2="{x+60*s:.1f}" y2="{cy+140*s:.1f}"/>')
        lines.append(f'<line x1="{x+60*s:.1f}" y1="{cy-5*s:.1f}" x2="{x-60*s:.1f}" y2="{cy+140*s:.1f}"/>')
    sy = cy - 22 * s
    return f'''
<g transform="rotate({tilt:.2f} {cx:.1f} {cy+40*s:.1f})">
  <defs>
    <clipPath id="{uid}clip"><polygon points="{tri}"/></clipPath>
    <linearGradient id="{uid}wf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9C195"/><stop offset="1" stop-color="#C98F55"/></linearGradient>
    <radialGradient id="{uid}sc" cx="0.35" cy="0.3" r="0.85"><stop offset="0" stop-color="{light}"/><stop offset="0.45" stop-color="{accent}"/><stop offset="1" stop-color="{rim}"/></radialGradient>
  </defs>
  <polygon points="{tri}" fill="url(#{uid}wf)"/>
  <g clip-path="url(#{uid}clip)" stroke="#9c6a35" stroke-opacity="0.45" stroke-width="{1.4*s:.2f}">{''.join(lines)}</g>
  <ellipse cx="{cx:.1f}" cy="{cy-2*s:.1f}" rx="{50*s:.1f}" ry="{13*s:.1f}" fill="{rim}"/>
  <circle cx="{cx:.1f}" cy="{sy:.1f}" r="{54*s:.1f}" fill="url(#{uid}sc)"/>
  <ellipse cx="{cx-18*s:.1f}" cy="{sy-22*s:.1f}" rx="{14*s:.1f}" ry="{8*s:.1f}" fill="#fff" fill-opacity="0.55" transform="rotate(-28 {cx-18*s:.1f} {sy-22*s:.1f})"/>
</g>'''

def mini_scoop(cx, cy, r, accent, light, rim, uid):
    return f'''<defs><radialGradient id="{uid}" cx="0.35" cy="0.3" r="0.85"><stop offset="0" stop-color="{light}"/><stop offset="0.5" stop-color="{accent}"/><stop offset="1" stop-color="{rim}"/></radialGradient></defs>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="url(#{uid})"/>
<ellipse cx="{cx-r*0.32:.1f}" cy="{cy-r*0.38:.1f}" rx="{r*0.28:.1f}" ry="{r*0.16:.1f}" fill="#fff" fill-opacity="0.5"/>'''

def ice_bar(cx, cy, s, rot):
    return f'''<g transform="rotate({rot:.1f} {cx:.1f} {cy:.1f})">
<rect x="{cx-9*s:.1f}" y="{cy+22*s:.1f}" width="{18*s:.1f}" height="{44*s:.1f}" rx="{5*s:.1f}" fill="{WAFFLE}"/>
<rect x="{cx-26*s:.1f}" y="{cy-40*s:.1f}" width="{52*s:.1f}" height="{70*s:.1f}" rx="{20*s:.1f}" fill="{COCOA}"/>
<rect x="{cx-22*s:.1f}" y="{cy-36*s:.1f}" width="{44*s:.1f}" height="{30*s:.1f}" rx="{15*s:.1f}" fill="#fff" fill-opacity="0.12"/></g>'''

def glass(x, y, w, h, r=18, alpha=0.62):
    return (f'<rect x="{x+1:.1f}" y="{y+6:.1f}" width="{w}" height="{h}" rx="{r}" fill="{COCOA}" fill-opacity="0.07"/>'
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w}" height="{h}" rx="{r}" fill="#FFF8EC" fill-opacity="{alpha}" stroke="#fff" stroke-opacity="0.8"/>')

def text(x, y, s, size, fill=COCOA, weight=400, family=SANS, anchor="start", opacity=1, style="normal", spacing=0, extra=""):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" font-weight="{weight}" '
            f'font-style="{style}" fill="{fill}" fill-opacity="{opacity:.3f}" text-anchor="{anchor}" '
            f'letter-spacing="{spacing}" {extra}>{esc(s)}</text>')

def pill(x, y, w, h, fill, label, size=10, color="#fff", opacity=1, weight=700, spacing=1.5):
    return (f'<g opacity="{opacity:.3f}"><rect x="{x:.1f}" y="{y:.1f}" width="{w}" height="{h}" rx="{h/2}" fill="{fill}"/>'
            + text(x + w / 2, y + h / 2 + size * 0.36, label, size, color, weight, anchor="middle", spacing=spacing) + "</g>")

def sparkles(t, accent):
    out = []
    for i in range(46):
        sx = (i * 137.5) % W
        sp = 8 + (i * 7) % 14
        sy = (H + 20 - ((i * 53) % H + t * sp) ) % (H + 40) - 10
        sx += math.sin(t * 0.8 + i) * 10
        r = 1.4 + (i % 4) * 0.9
        col = "#FFB7B2" if i % 3 else MINT
        out.append(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{r:.1f}" fill="{col}" fill-opacity="{0.35 + 0.35 * math.sin(t * 2 + i) ** 2:.2f}"/>')
    return "".join(out)

def cursor(x, y, scale=1.0, label=""):
    ring = (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{14*scale:.1f}" fill="{"#FF6B8B" if label else "#FF6B8B"}" '
            f'fill-opacity="{0.9 if label else 0.1}" stroke="{COCOA}" stroke-opacity="{0 if label else 0.9}" stroke-width="1.2"/>')
    lab = text(x, y + 3, label, 7.5, "#fff", 800, anchor="middle", spacing=0.6) if label else ""
    return ring + lab + f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{BERRY}"/>'


# ---- scenes -----------------------------------------------------------------
def scene_hero(u, t, th):
    a, l, r = th
    out = []
    rise = lambda d: ease(span(u, d, d + 0.7))
    out.append(f'<g opacity="{rise(0):.2f}" transform="translate(0 {(1-rise(0))*18:.1f})">'
               + glass(56, 96, 205, 24, 12) + text(158, 112, "ARTISAN CREAMERY  ·  SMALL BATCH", 8.5, COCOA, 800, anchor="middle", spacing=1.6) + "</g>")
    y0 = rise(0.12)
    out.append(f'<g opacity="{y0:.2f}" transform="translate(0 {(1-y0)*30:.1f})">'
               '<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="0"><stop offset="0.1" stop-color="#FF6B8B"/><stop offset="0.5" stop-color="#FF3366"/><stop offset="1" stop-color="#D4A373"/></linearGradient></defs>'
               + text(56, 192, "Melt", 76, "url(#hg)", 700, SERIF, style="italic")
               + text(56 + 168, 192, "Into", 76, COCOA, 700, SERIF, style="italic")
               + text(56, 268, "The Moment", 76, "none", 700, SERIF, style="italic", extra=f'stroke="{COCOA}" stroke-width="1.6"')
               + "</g>")
    y1 = rise(0.3)
    out.append(f'<g opacity="{y1*0.72:.2f}" transform="translate(0 {(1-y1)*20:.1f})">'
               + text(58, 308, "Hand-churned gelato floating in a dreamy WebGL", 13, COCOA, 500)
               + text(58, 327, "creamery. Scroll slow — the scoops follow you.", 13, COCOA, 500) + "</g>")
    y2 = rise(0.5)
    glow = 0.5 + 0.5 * math.sin(t * 2.1)
    out.append(f'<g opacity="{y2:.2f}"><rect x="52" y="346" width="204" height="40" rx="20" fill="{BERRY}" fill-opacity="{0.12+0.18*glow:.2f}" transform="translate(0 0) scale(1)"/>'
               + pill(56, 350, 196, 32, BERRY, "TASTE THE MENU  ↓", 10.5) + "</g>")
    # 3D cone, floating + pointer parallax
    cy = 130 + math.sin(t * 0.9 * 1.4) * 9
    out.append(mini_scoop(520, 118 + math.sin(t * 1.1 + 2) * 8, 24, a, l, r, "ms1"))
    out.append(ice_bar(715, 300 + math.cos(t * 1.2) * 7, 0.9, 20 + math.sin(t) * 5))
    out.append(cone(612, cy, 1.15, math.sin(t * 1.2) * 7, a, l, r, "h"))
    return "".join(out), (612 + math.sin(t * 1.3) * 60, 215 + math.cos(t) * 40, 1, "")

def scene_craft(u, t, th):
    a, l, r = th
    out = []
    p = ease_io(u / SCENES[1])
    zoom = lerp(1.05, 1.85, ease_io(span(u, 0, 1.4)))
    out.append(mini_scoop(472, 96 + math.sin(t * 1.2) * 7, lerp(16, 26, p), a, l, r, "ms2"))
    out.append(ice_bar(738, 372 + math.cos(t) * 6, 0.75, 20))
    out.append(cone(612, 70 + zoom * 18, zoom, math.sin(t * 1.2) * 5 + p * 25, a, l, r, "k"))
    rv = lambda d: ease(span(u, d, d + 0.55))
    out.append(text(56, 102, "THE CRAFT", 9.5, BERRY, 800, spacing=3.4, opacity=rv(0)))
    out.append(f'<g opacity="{rv(0.1):.2f}" transform="translate(0 {(1-rv(0.1))*22:.1f})">'
               + text(56, 156, "Slow churned.", 50, COCOA, 700, SERIF)
               + text(56, 208, "Fast gone.", 50, "url(#hg2)", 700, SERIF, style="italic")
               + '<defs><linearGradient id="hg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0.1" stop-color="#FF6B8B"/><stop offset="0.5" stop-color="#FF3366"/><stop offset="1" stop-color="#D4A373"/></linearGradient></defs></g>')
    cards = [("Grass-Fed Dairy", "Single-herd Jersey milk, pasteurized low & slow."),
             ("Organic Madagascar Vanilla", "Whole pods steeped 48 hours."),
             ("Zero Shortcuts", "No gums, no artificial anything.")]
    for i, (h, d) in enumerate(cards):
        k = rv(0.35 + i * 0.28)
        y = 224 + i * 56
        out.append(f'<g opacity="{k:.2f}" transform="translate({(1-k)*-30:.1f} 0)">' + glass(56, y, 330, 48, 16)
                   + text(72, y + 20, h, 15, COCOA, 700, SERIF, style="italic")
                   + text(72, y + 37, d, 10, COCOA, 500, opacity=0.7) + "</g>")
    return "".join(out), (lerp(500, 300, p), 300 + math.sin(t * 2) * 8, 1.7 if 0.9 < u < 2.0 else 1, "Yum" if 0.9 < u < 2.0 else "")

def scene_flavors(u, t, th, idx):
    a, l, r = th
    out = []
    rv = lambda d: ease(span(u, d, d + 0.5))
    out.append(text(56, 92, "PICK YOUR OBSESSION", 9.5, BERRY, 800, spacing=3.4, opacity=rv(0)))
    out.append(f'<g opacity="{rv(0.05):.2f}">' + text(56, 142, "Four moods.", 46, COCOA, 700, SERIF)
               + text(56, 188, "One cone.", 46, "url(#hg3)", 700, SERIF, style="italic")
               + '<defs><linearGradient id="hg3" x1="0" y1="0" x2="1" y2="0"><stop offset="0.1" stop-color="' + a + '"/><stop offset="0.6" stop-color="' + r + '"/><stop offset="1" stop-color="#D4A373"/></linearGradient></defs></g>')
    out.append(text(58, 214, "Tap a flavor — watch the whole scene re-light itself.", 11, COCOA, 500, opacity=0.6 * rv(0.2)))
    out.append(mini_scoop(510, 96 + math.sin(t * 1.3) * 6, 20, a, l, r, "ms3"))
    out.append(ice_bar(752, 140 + math.cos(t * 1.1) * 6, 0.7, 18))
    out.append(cone(640, 96 + math.sin(t * 1.1) * 6, 0.9, math.sin(t * 1.2) * 6, a, l, r, "f"))
    sel = int(idx) % 4
    cw, gap, x0, y0 = 172, 10, 56, 262
    for i, (fa, fl, fr, name, tag, price) in enumerate(FLAV):
        k = rv(0.1 + i * 0.1)
        x = x0 + i * (cw + gap)
        is_sel = (i == sel)
        lift = -10 if is_sel else 0
        out.append(f'<g opacity="{k:.2f}" transform="translate(0 {(1-k)*26 + lift:.1f})">')
        if is_sel:
            out.append(f'<rect x="{x-2}" y="{y0-2+6}" width="{cw+4}" height="{138}" rx="26" fill="{fa}" fill-opacity="0.35"/>')
        out.append(glass(x, y0, cw, 132, 24, 0.7))
        if is_sel:
            out.append(f'<rect x="{x}" y="{y0}" width="{cw}" height="132" rx="24" fill="none" stroke="{fa}" stroke-width="2.2"/>')
        out.append(f'<rect x="{x+16}" y="{y0+16}" width="30" height="30" rx="10" fill="{fa}"/>')
        out.append(text(x + 16, y0 + 64, tag.upper(), 7.5, COCOA, 800, spacing=1.6, opacity=0.5))
        out.append(text(x + 16, y0 + 86, name, 15, COCOA, 700, SERIF, style="italic"))
        out.append(text(x + 16, y0 + 118, price, 11, fr, 800))
        out.append("</g>")
    cxp = x0 + sel * (cw + gap) + cw / 2
    return "".join(out), (cxp + 52, y0 + 98, 1.9, "Taste")

def scene_chat(u, t, th):
    a, l, r = th
    out = []
    # dimmed page behind: cone + headline hint
    out.append(cone(220, 110, 1.1, math.sin(t * 1.2) * 5, a, l, r, "z"))
    out.append(text(60, 300, "Order on WhatsApp", 40, COCOA, 700, SERIF, style="italic", opacity=0.9))
    out.append(text(62, 330, "A rule-based chatbot — no LLM, no API keys.", 13, COCOA, 500, opacity=0.65))
    px, py, pw, ph = 452, 62, 316, 346
    s = ease(span(u, 0, 0.45))
    out.append(f'<g opacity="{s:.2f}" transform="translate({px+pw} {py+ph}) scale({0.88+0.12*s:.3f}) translate({-(px+pw)} {-(py+ph)})">')
    out.append(glass(px, py, pw, ph, 26, 0.82))
    out.append(f'<clipPath id="pc"><rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="26"/></clipPath>')
    out.append(f'<g clip-path="url(#pc)"><rect x="{px}" y="{py}" width="{pw}" height="54" fill="{COCOA}"/></g>')
    out.append(f'<circle cx="{px+20}" cy="{py+27}" r="5" fill="{a}"/>')
    out.append(text(px + 34, py + 26, "Scoopy", 13, "#fff", 800))
    out.append(text(px + 34, py + 40, "Gelato concierge · online", 8.5, "#fff", 400, opacity=0.6))
    out.append(f'<rect x="{px+pw-96}" y="{py+16}" width="46" height="22" rx="11" fill="none" stroke="#fff" stroke-opacity="0.3"/>')
    out.append(text(px + pw - 73, py + 31, "Clear", 9, "#fff", 700, anchor="middle", opacity=0.8))
    out.append(f'<circle cx="{px+pw-26}" cy="{py+27}" r="13" fill="#fff" fill-opacity="0.18"/>')
    out.append(f'<path d="M{px+pw-31} {py+22} L{px+pw-21} {py+32} M{px+pw-21} {py+22} L{px+pw-31} {py+32}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>')

    # timeline: (time, from, lines, button)
    msgs = [(0.35, "bot", ["Hey! I'm Scoopy — your gelato", "concierge. Tap an option below."], False),
            (1.0, "user", ["Order"], False),
            (1.2, "bot", ["How would you like to order?"], False),
            (1.75, "user", ["Build my order"], False),
            (1.95, "bot", ["Which flavor?"], False),
            (2.5, "user", ["Sicilian Pistachio"], False),
            (2.7, "bot", ["Your order: 2 scoops of Sicilian", "Pistachio in a waffle cone."], True)]
    chips_by_stage = [
        (0.0, ["Flavors", "Order", "Dietary", "Hours", "Parties", "Prices"]),
        (1.2, ["Build my order", "Delivery / pickup", "Main menu"]),
        (1.95, ["Wild Strawberry", "Sicilian Pistachio", "Dark Cacao", "Mango"]),
        (2.7, ["Start over", "Main menu"]),
    ]
    taps = {1.0: "Order", 1.75: "Build my order", 2.5: "Sicilian Pistachio"}

    area_top, area_bot = py + 62, py + ph - 108
    area_h = area_bot - area_top
    layout, y = [], 0.0
    for (mt, who, lines, btn) in msgs:
        prog = ease(span(u, mt, mt + 0.25))
        h = (len(lines) * 14 + 14 + (30 if btn else 0)) + 8
        layout.append((mt, who, lines, btn, prog, y, h))
        y += h * prog
    scroll = max(0, y - area_h)
    out.append(f'<clipPath id="ma"><rect x="{px+8}" y="{area_top}" width="{pw-16}" height="{area_h}"/></clipPath><g clip-path="url(#ma)">')
    for (mt, who, lines, btn, prog, ly, h) in layout:
        if prog <= 0: continue
        by = area_top + ly - scroll
        bw = max(len(L) for L in lines) * 6.1 + 24
        bh = len(lines) * 14 + 12
        bx = px + 16 if who == "bot" else px + pw - 16 - bw
        fill, col = ("#fff", COCOA) if who == "bot" else (BERRY, "#fff")
        out.append(f'<g opacity="{prog:.2f}"><rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh}" rx="14" fill="{fill}"/>')
        for i, L in enumerate(lines):
            out.append(text(bx + 12, by + 16 + i * 14, L, 10.5, col, 500))
        if btn:
            out.append(pill(bx, by + bh + 6, bw, 22, BERRY, "Send order on WhatsApp  →", 9, spacing=0.4))
        out.append("</g>")
    out.append("</g>")

    stage = max((s_ for s_ in chips_by_stage if u >= s_[0] + 0.1), key=lambda z: z[0], default=chips_by_stage[0])
    chips = stage[1]
    cx0, cy0, rowh = px + 12, py + ph - 100, 26
    cx, cy = cx0, cy0
    chip_pos = {}
    out.append(f'<line x1="{px}" y1="{cy0-8}" x2="{px+pw}" y2="{cy0-8}" stroke="#000" stroke-opacity="0.06"/>')
    tapping = next((lbl for tt, lbl in taps.items() if tt - 0.12 <= u < tt + 0.1), None)
    pop = ease(span(u, stage[0] + 0.1, stage[0] + 0.4))
    for lbl in chips:
        w = len(lbl) * 6.3 + 20
        if cx + w > px + pw - 12:
            cx = cx0; cy += rowh
        hot = (lbl == tapping)
        out.append(f'<g opacity="{pop:.2f}"><rect x="{cx:.1f}" y="{cy:.1f}" width="{w:.1f}" height="21" rx="10.5" fill="{BERRY if hot else "#fff"}" fill-opacity="{1 if hot else 0.85}"/>'
                   + text(cx + w / 2, cy + 14, lbl, 9.5, "#fff" if hot else COCOA, 700, anchor="middle") + "</g>")
        chip_pos[lbl] = (cx + w / 2, cy + 10)
        cx += w + 6
    out.append(f'<rect x="{px+12}" y="{py+ph-38}" width="{pw-62}" height="26" rx="13" fill="#fff" fill-opacity="0.85"/>')
    out.append(text(px + 28, py + ph - 21, "Ask about flavors, hours...", 10, COCOA, 400, opacity=0.4))
    out.append(f'<circle cx="{px+pw-26}" cy="{py+ph-25}" r="13" fill="{COCOA}"/>')
    out.append(text(px + pw - 26, py + ph - 20, "↑", 13, "#fff", 700, anchor="middle", family="DejaVu Sans"))
    out.append("</g>")

    # cursor glides to each tapped chip
    prev = (px - 40, py + 200)
    seq = []
    for tt, lbl in sorted(taps.items()):
        tgt_stage = max((s_ for s_ in chips_by_stage if tt >= s_[0] + 0.1), key=lambda z: z[0])
        ccx, ccy = cx0, cy0; pos = None
        for L in tgt_stage[1]:
            w = len(L) * 6.3 + 20
            if ccx + w > px + pw - 12: ccx = cx0; ccy += rowh
            if L == lbl: pos = (ccx + w / 2, ccy + 12); break
            ccx += w + 6
        seq.append((tt, pos))
    pos = prev
    for tt, tp in seq:
        k = ease_io(span(u, tt - 0.55, tt - 0.1))
        pos = (lerp(pos[0], tp[0], k), lerp(pos[1], tp[1], k))
        if u < tt - 0.1: break
    big = any(tt - 0.12 <= u < tt + 0.1 for tt in taps)
    return "".join(out), (pos[0], pos[1], 1.5 if big else 1, "")


# ---- composition ------------------------------------------------------------
CAPTIONS = [
    ("01", "Hero", "React Three Fiber cone floats, spins & follows the cursor"),
    ("02", "Craft", "Lenis + GSAP ScrollTrigger drive the 3D camera choreography"),
    ("03", "Flavors", "Pick a flavor: CSS accent var + 3D lights re-theme live"),
    ("04", "Scoopy", "Rule-based chatbot — guided order straight to WhatsApp"),
]

def frame_svg(t):
    bounds = [0]
    for d in SCENES: bounds.append(bounds[-1] + d)
    si = max(i for i in range(4) if t >= bounds[i] - 1e-9)
    u = t - bounds[si]

    # flavor theme timeline (fractional index): cycles pistachio -> cacao -> mango -> strawberry
    f = 0.0
    if si == 2:
        for m in (0.55, 1.15, 1.75, 2.35):
            f += ease_io(span(u, m - 0.25, m))
    th = flavor_at(1.0 if si == 3 else f % 4)

    if si == 0: body, cur = scene_hero(u, t, th)
    elif si == 1: body, cur = scene_craft(u, t, th)
    elif si == 2: body, cur = scene_flavors(u, t, th, round(f) % 4)
    else: body, cur = scene_chat(u, t, th)

    # fade through cream between scenes (and at the loop seam)
    fade_in = span(u, 0, 0.4 if si == 0 else FADE)
    fade_out = 1 - span(u, SCENES[si] - (0.4 if si == 3 else FADE), SCENES[si])
    fade = fade_in * fade_out

    a, l, r = th
    p = t / TOTAL
    cap = CAPTIONS[si]
    capk = min(span(u, 0.1, 0.4), 1 - span(u, SCENES[si] - 0.25, SCENES[si]))
    cursor_svg = cursor(*cur) if cur else ""
    nav = (text(34, 40, "Velvet Scoop", 19, COCOA, 700, SERIF, style="italic") + text(34 + 105, 40, ".", 19, BERRY, 700, SERIF, style="italic")
           + text(318, 38, "CRAFT", 9, COCOA, 700, spacing=2) + text(378, 38, "FLAVORS", 9, COCOA, 700, spacing=2) + text(448, 38, "VISIT", 9, COCOA, 700, spacing=2)
           + pill(668, 24, 98, 26, COCOA, "PRE-ORDER", 9))
    scroll = (f'<rect x="{W-8}" y="60" width="3" height="{H-120}" rx="1.5" fill="{COCOA}" fill-opacity="0.12"/>'
              f'<rect x="{W-8}" y="60" width="3" height="{(H-120)*p:.1f}" rx="1.5" fill="{BERRY}"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<radialGradient id="bgA" cx="0.78" cy="0.3" r="0.7"><stop offset="0" stop-color="{l}" stop-opacity="0.95"/><stop offset="1" stop-color="{CREAM}" stop-opacity="0"/></radialGradient>
<radialGradient id="bgB" cx="0.1" cy="0.95" r="0.6"><stop offset="0" stop-color="{a}" stop-opacity="0.22"/><stop offset="1" stop-color="{CREAM}" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="{COCOA}" stop-opacity="0"/><stop offset="1" stop-color="{COCOA}" stop-opacity="0.16"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="{CREAM}"/><rect width="{W}" height="{H}" fill="url(#bgA)"/><rect width="{W}" height="{H}" fill="url(#bgB)"/>
{sparkles(t, a)}
<g opacity="{fade:.3f}">{body}</g>
{nav}{scroll}
<rect width="{W}" height="{H}" fill="url(#vig)"/>
<g opacity="{capk:.2f}" transform="translate(0 {(1-capk)*10:.1f})">
  <rect x="34" y="{H-52}" width="{len(cap[2])*6.6+88:.0f}" height="30" rx="15" fill="{COCOA}" fill-opacity="0.92"/>
  <circle cx="52" cy="{H-37}" r="9" fill="{a}"/>{text(52, H-33.5, cap[0], 9, COCOA, 800, anchor="middle")}
  {text(70, H-33, cap[1] + "  —  " + cap[2], 11, "#fff", 600)}
</g>
{cursor_svg}
</svg>'''


def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_gif = os.path.join(out_dir, "site-preview.gif")
    tmp = tempfile.mkdtemp()
    n = int(TOTAL * FPS)
    for i in range(n):
        svg = frame_svg(i / FPS)
        cairosvg.svg2png(bytestring=svg.encode(), write_to=os.path.join(tmp, f"f{i:04d}.png"), output_width=W)
        if i == n // 2 and "--save-svg" in sys.argv:
            open(os.path.join(out_dir, "site-preview-frame.svg"), "w").write(svg)
    pal = os.path.join(tmp, "pal.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tmp}/f%04d.png",
                    "-vf", "palettegen=max_colors=128:stats_mode=diff", pal], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tmp}/f%04d.png", "-i", pal,
                    "-lavfi", "paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle", "-loop", "0", out_gif], check=True)
    shutil.rmtree(tmp)
    print(f"wrote {out_gif} ({os.path.getsize(out_gif)/1024:.0f} KB, {n} frames @ {FPS} fps)")

if __name__ == "__main__":
    main()
