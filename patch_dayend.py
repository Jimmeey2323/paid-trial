#!/usr/bin/env python3
"""Patch script for dayend.gs styling improvements."""
import sys

TARGET = '/Users/jimmeeygondaa/dayend.gs'

with open(TARGET, 'r', encoding='utf-8') as f:
    c = f.read()

orig_len = len(c)
edits_done = []
edits_failed = []

def replace_once(c, old, new, name):
    if old in c:
        edits_done.append(name)
        return c.replace(old, new, 1)
    else:
        edits_failed.append(name)
        return c

# ── EDIT 1: Claude prompt — positive-first tone ────────────────────────────
c = replace_once(c,
    'OUTPUT QUALITY BAR:\n- Tone: senior management brief (concise, precise, commercial).\n- Every bullet must contain at least one number.',
    'OUTPUT QUALITY BAR:\n- Tone: senior management brief (concise, precise, commercial, forward-looking). Frame every observation constructively. NEVER use words like "disappointing", "poor", "weak", "sluggish", "concerning" or "worrying".\n- POSITIVE-FIRST RULE (non-negotiable): In every field and every bullet, lead with what is performing well or showing progress, then note what needs attention. End with direction, not doubt.\n- Every bullet must contain at least one number.',
    'E1-tone'
)

c = replace_once(c,
    '"brandSnapshot": "Exactly 3 sentences: (1) today vs yesterday with ₹ and %, (2) key operational health signal, (3) immediate executive implication.",',
    '"brandSnapshot": "Exactly 3 sentences: (1) open with the strongest metric today — revenue or standout KPI with ₹ and %, (2) a health signal that shows resilience or positive momentum, (3) one forward-looking opportunity or action direction. DO NOT open with a negative.",',
    'E1-brandSnapshot'
)

c = replace_once(c,
    '"todayInsight": "One sentence: revenue, DoD %, fill %, class average, and one root-cause clue.",',
    '"todayInsight": "One sentence: lead with the strongest metric (revenue or fill rate), include DoD change, class average, and one positive observation or opportunity.",',
    'E1-todayInsight'
)

# ── EDIT 2: Header — P57 badge + class names ──────────────────────────────
c = replace_once(c,
    '''            <td style="padding:26px 32px 18px;vertical-align:middle;">
              <div style="${FB}font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:${C.hdrTextMuted};margin-bottom:6px;">
                Physique 57 India
              </div>
              <div style="${FB}font-size:22px;font-weight:600;color:${C.hdrText};letter-spacing:-0.3px;line-height:1.2;margin-bottom:8px;">
                Daily Performance Report
              </div>
              <div style="${FB}font-size:11px;color:${C.hdrTextSoft};">
                ${dateLabel}&nbsp;&nbsp;·&nbsp;&nbsp;${timeLabel}&nbsp;&nbsp;·&nbsp;&nbsp;${report.length} Studio${report.length!==1?\'s\':\'\'}
              </div>
            </td>''',
    '''            <td class="hdr-left" style="padding:26px 32px 18px;vertical-align:middle;">
              <div style="margin-bottom:10px;">
                <span style="${FB}font-size:10px;font-weight:800;letter-spacing:1px;color:${C.hdrText};background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.22);padding:3px 9px;border-radius:4px;margin-right:10px;">P57</span>
                <span style="${FB}font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${C.hdrTextMuted};">Physique 57 India</span>
              </div>
              <div style="${FB}font-size:25px;font-weight:700;color:${C.hdrText};letter-spacing:-0.4px;line-height:1.15;margin-bottom:10px;">
                Daily Performance Report
              </div>
              <div style="${FB}font-size:11px;color:${C.hdrTextSoft};">
                ${dateLabel}&nbsp;&nbsp;<span style="color:rgba(255,255,255,0.3);">|</span>&nbsp;&nbsp;${timeLabel}&nbsp;&nbsp;<span style="color:rgba(255,255,255,0.3);">|</span>&nbsp;&nbsp;${report.length} Studio${report.length!==1?\'s\':\'\'}
              </div>
            </td>''',
    'E2-hdr-left'
)

c = replace_once(c,
    '<td style="padding:26px 32px 18px;vertical-align:middle;text-align:right;white-space:nowrap;">',
    '<td class="hdr-right" style="padding:26px 32px 18px;vertical-align:middle;text-align:right;white-space:nowrap;">',
    'E2-hdr-right'
)

# ── EDIT 3: insightList padding ────────────────────────────────────────────
c = replace_once(c,
    '      return `<ul style="margin:0;padding:0;list-style:none;">\n        ${items.map(item=>`\n          <li style="display:flex;gap:8px;align-items:flex-start;margin-bottom:9px;padding-bottom:9px;border-bottom:1px solid ${C.borderLight};">\n            <span style="flex-shrink:0;width:4px;height:4px;border-radius:50%;background:${accentColor};margin-top:7px;"></span>\n            <span style="${FB}font-size:11px;color:${C.inkSecondary};line-height:1.65;">${item}</span>\n          </li>`).join(\'\')}\n      </ul>`;',
    '      return `<ul style="margin:0;padding:0 0 0 4px;list-style:none;">\n        ${items.map(item=>`\n          <li style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid ${C.borderLight};">\n            <span style="flex-shrink:0;min-width:5px;width:5px;height:5px;border-radius:50%;background:${accentColor};margin-top:6px;"></span>\n            <span style="${FB}font-size:11px;color:${C.inkSecondary};line-height:1.65;word-break:break-word;">${item}</span>\n          </li>`).join(\'\')}\n      </ul>`;',
    'E3-insightList'
)

# ── EDIT 4: Silver/navy card theme ────────────────────────────────────────
c = replace_once(c,
    '        ${winItems.length ? `\n        <div style="background:${C.posBg};border:1px solid ${C.posBorder};border-radius:8px;padding:8px 11px;margin-bottom:6px;">\n          <div style="${FB}font-size:8px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${C.pos};margin-bottom:4px;">Highlights</div>\n          ${winItems.map(w=>`<div style="${FB}font-size:10px;color:${C.posDark};line-height:1.5;margin-bottom:2px;">· ${w}</div>`).join(\'\')}\n        </div>` : \'\'}\n        ${watchItems.length ? `\n        <div style="background:${C.warnBg};border:1px solid ${C.warnBorder};border-radius:8px;padding:8px 11px;">\n          <div style="${FB}font-size:8px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${C.warn};margin-bottom:4px;">Areas to Monitor</div>\n          ${watchItems.map(w=>`<div style="${FB}font-size:10px;color:${C.warnDark};line-height:1.5;margin-bottom:2px;">· ${w}</div>`).join(\'\')}\n        </div>` : \'\'}',
    '        ${winItems.length ? `\n        <div style="background:#EEF3FA;border:1px solid #C8D9F0;border-left:3px solid #1E3A5F;border-radius:0 8px 8px 0;padding:9px 12px;margin-bottom:6px;">\n          <div style="${FB}font-size:8px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#1E3A5F;margin-bottom:5px;">Highlights</div>\n          ${winItems.map(w=>`<div style="${FB}font-size:10px;color:#2D4E7A;line-height:1.55;margin-bottom:3px;">· ${w}</div>`).join(\'\')}\n        </div>` : \'\'}\n        ${watchItems.length ? `\n        <div style="background:#F0F4FB;border:1px solid #B8CCE4;border-left:3px solid #3B6EA5;border-radius:0 8px 8px 0;padding:9px 12px;">\n          <div style="${FB}font-size:8px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#3B6EA5;margin-bottom:5px;">Areas to Monitor</div>\n          ${watchItems.map(w=>`<div style="${FB}font-size:10px;color:#2D4A6E;line-height:1.55;margin-bottom:3px;">· ${w}</div>`).join(\'\')}\n        </div>` : \'\'}',
    'E4-silver-navy'
)

# ── EDIT 5: Mobile CSS + class names ─────────────────────────────────────
c = replace_once(c,
    '  <style>\n    @media only screen and (max-width:680px) {\n      .studio-card-cell { display:block !important; width:100% !important; padding:0 0 10px 0 !important; }\n      .kpi-cell { display:block !important; width:100% !important; padding:4px 0 !important; }\n      .kpi-row { table-layout:auto !important; }\n    }\n  </style>',
    '  <style>\n    @media only screen and (max-width:680px) {\n      .kpi-row { table-layout:auto !important; }\n      .kpi-cell { display:inline-block !important; width:48% !important; padding:3px !important; box-sizing:border-box !important; }\n      .studio-card-cell { display:block !important; width:100% !important; padding:0 0 12px 0 !important; }\n      .hdr-left  { display:block !important; width:100% !important; padding:18px 20px 10px !important; }\n      .hdr-right { display:block !important; width:100% !important; padding:0 20px 18px !important; text-align:left !important; white-space:normal !important; }\n      .ai-col-left  { display:block !important; width:100% !important; padding-right:0 !important; border-right:none !important; padding-bottom:16px !important; border-bottom:1px solid #E2E8F0 !important; margin-bottom:14px !important; }\n      .ai-col-right { display:block !important; width:100% !important; }\n      .ins-col { display:block !important; width:100% !important; padding:0 0 16px 0 !important; border-right:none !important; border-bottom:1px solid #E2E8F0 !important; margin-bottom:14px !important; }\n      .h2h-col   { display:block !important; width:100% !important; padding-right:0 !important; margin-bottom:14px !important; }\n      .cross-col { display:block !important; width:100% !important; overflow-x:scroll !important; -webkit-overflow-scrolling:touch !important; }\n    }\n  </style>',
    'E5a-css'
)

# Class names for AI summary cols
c = replace_once(c,
    '<td style="vertical-align:top;padding-right:20px;width:60%;">',
    '<td class="ai-col-left" style="vertical-align:top;padding-right:20px;width:60%;">',
    'E5b-ai-left'
)
c = replace_once(c,
    '<td style="vertical-align:top;width:40%;">',
    '<td class="ai-col-right" style="vertical-align:top;width:40%;">',
    'E5c-ai-right'
)

# Class names for insights cols
c = replace_once(c,
    '<td style="vertical-align:top;width:33%;padding-right:16px;border-right:1px solid ${C.borderLight};">',
    '<td class="ins-col" style="vertical-align:top;width:33%;padding-right:16px;border-right:1px solid ${C.borderLight};">',
    'E5d-ins1'
)
c = replace_once(c,
    '<td style="vertical-align:top;width:33%;padding:0 16px;border-right:1px solid ${C.borderLight};">',
    '<td class="ins-col" style="vertical-align:top;width:33%;padding:0 16px;border-right:1px solid ${C.borderLight};">',
    'E5e-ins2'
)
c = replace_once(c,
    '<td style="vertical-align:top;width:33%;padding-left:16px;">',
    '<td class="ins-col" style="vertical-align:top;width:33%;padding-left:16px;">',
    'E5f-ins3'
)

# Class names for h2h / cross-table
c = replace_once(c,
    '<td style="vertical-align:top;width:28%;padding-right:16px;">',
    '<td class="h2h-col" style="vertical-align:top;width:28%;padding-right:16px;">',
    'E5g-h2h'
)
c = replace_once(c,
    '<td style="vertical-align:top;width:72%;">',
    '<td class="cross-col" style="vertical-align:top;width:72%;">',
    'E5h-cross'
)

print(f"Done. Edits applied: {edits_done}")
if edits_failed:
    print(f"NOT FOUND (check strings): {edits_failed}")

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(c)
print(f"File written. Length: {orig_len} -> {len(c)}")
