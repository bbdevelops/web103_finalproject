"""Generate editable milestone diagrams; optionally export PNGs with Chrome/Edge.

Uses only Python's standard library. No application or design service is needed.
"""

from __future__ import annotations

import argparse
import html
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import textwrap


ROOT = Path(__file__).resolve().parent
W, H = 1280, 1180
INK, MUTED, LINE = "#242424", "#626262", "#b8b8b8"
LIGHT, PAPER, DARK = "#f1f1f1", "#ffffff", "#333333"


class SVG:
    def __init__(self, width, height, title, description):
        self.width, self.height = width, height
        self.parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title description">',
            f"<title id='title'>{html.escape(title)}</title>",
            f"<desc id='description'>{html.escape(description)}</desc>",
            '<style>text{font-family:"Segoe UI",Arial,sans-serif}.code{font-family:Consolas,monospace}</style>',
        ]
        self.rect(0, 0, width, height, "#fafafa", "none", radius=0)

    def rect(self, x, y, w, h, fill=PAPER, stroke=LINE, radius=8, dash=None, opacity=None):
        attrs = f' stroke-dasharray="{dash}"' if dash else ""
        if opacity is not None:
            attrs += f' opacity="{opacity}"'
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}"{attrs}/>')

    def text(self, x, y, value, size=17, weight=400, fill=INK, anchor="start", code=False):
        css = ' class="code"' if code else ""
        self.parts.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{css}>{html.escape(str(value))}</text>')

    def lines(self, x, y, value, width=55, size=16, leading=24, fill=MUTED):
        rows = textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False)
        for index, row in enumerate(rows):
            self.text(x, y + index * leading, row, size, fill=fill)

    def line(self, x1, y1, x2, y2, stroke=LINE, width=1.4):
        self.parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{width}"/>')

    def path(self, points, stroke=MUTED, width=1.8):
        value = " ".join(f"{x},{y}" for x, y in points)
        self.parts.append(f'<polyline points="{value}" fill="none" stroke="{stroke}" stroke-width="{width}"/>')

    def circle(self, x, y, radius=4, fill=PAPER, stroke=MUTED):
        self.parts.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>')

    def button(self, x, y, width, label, primary=False, height=38):
        self.rect(x, y, width, height, DARK if primary else PAPER, DARK if primary else LINE, radius=5)
        self.text(x + width / 2, y + height / 2 + 5, label, 15, 600, PAPER if primary else INK, "middle")

    def pill(self, x, y, width, label):
        self.rect(x, y, width, 27, LIGHT, "#c5c5c5", radius=14)
        self.text(x + width / 2, y + 18, label, 12, 600, INK, "middle")

    def progress(self, x, y, width, fraction):
        self.rect(x, y, width, 8, "#e9e9e9", "none", radius=4)
        if fraction:
            self.rect(x, y, round(width * fraction, 2), 8, "#686868", "none", radius=4)

    def field(self, x, y, width, label, value, height=34, placeholder=False):
        self.text(x, y, label, 13, 600)
        self.rect(x, y + 10, width, height, PAPER, LINE, radius=4)
        for index, row in enumerate(value.split("\n")):
            self.text(x + 12, y + 32 + 20 * index, row, 14, fill=MUTED if placeholder else INK)

    def write(self, stem):
        target = ROOT / f"{stem}.svg"
        target.write_text("\n".join(self.parts + ["</svg>"]), encoding="utf-8")
        return target, self.width, self.height


def frame(number, title, route, subtitle, active="trees"):
    s = SVG(W, H, f"SkillForge: {title}", subtitle)
    s.text(28, 31, "SKILLFORGE / MILESTONE 02", 12, 700, MUTED)
    s.text(28, 67, f"{number} / {title}", 29, 650)
    s.text(28, 92, subtitle, 15, fill=MUTED)
    s.text(1252, 31, "LOW-FIDELITY / GRAYSCALE", 12, 600, MUTED, "end")
    s.rect(28, 108, 1224, 884, PAPER, "#9b9b9b", radius=8)
    s.rect(29, 109, 1222, 29, "#e8e8e8", "none", radius=7)
    for x in (46, 61, 76):
        s.circle(x, 123, 3.2, "#b7b7b7", "#b7b7b7")
    s.text(102, 128, f"skillforge.local{route}", 12, fill=MUTED, code=True)
    s.rect(29, 138, 1222, 68, PAPER, "none", radius=0)
    s.line(29, 206, 1251, 206)
    s.rect(60, 154, 32, 32, DARK, DARK, radius=6)
    s.text(76, 176, "SF", 13, 700, PAPER, "middle")
    s.text(104, 177, "SkillForge", 20, 700)
    s.text(302, 176, "Skill trees", 16, 600 if active == "trees" else 400)
    s.text(426, 176, "My dashboard", 16, 600 if active == "dashboard" else 400)
    s.line(302 if active == "trees" else 426, 191, 383 if active == "trees" else 533, 191, INK, 2)
    s.text(1194, 166, "Alex Chen", 15, 600, anchor="end")
    s.text(1194, 185, "GitHub connected / Sign out", 11, fill=MUTED, anchor="end")
    s.circle(1221, 171, 14, "#e0e0e0", "#b8b8b8")
    s.text(1221, 176, "AC", 10, 700, anchor="middle")
    return s


def notes(s, items):
    s.text(28, 1025, "INTERACTION NOTES / OUTSIDE THE APPLICATION FRAME", 11, 700, MUTED)
    for index, (title, body) in enumerate(items):
        x = 28 + index * 416
        s.rect(x, 1040, 392, 112, "#f3f3f3", "#dedede", radius=6)
        s.text(x + 16, 1065, title, 14, 700)
        s.lines(x + 16, 1088, body, width=46, size=13, leading=19)


def explorer():
    s = frame("01", "Skill Tree Explorer", "/", "Browse public roadmaps. Sign in to make progress your own.")
    s.text(60, 244, "YOUR DEVELOPER ROADMAP", 12, 700, MUTED)
    s.text(60, 279, "Choose your next skill.", 32, 650)
    s.text(60, 307, "Practical coding quests, one milestone at a time.", 17, fill=MUTED)
    s.rect(938, 228, 278, 88, LIGHT, "#d5d5d5")
    s.text(958, 258, "100 Dev XP", 25, 700)
    s.text(958, 287, "1 / 12 quests completed", 15, fill=MUTED)
    cards = [
        (60, 344, "01", "Frontend Mastery with React", "Components, state, and client-side routing.", "1 / 3 completed", 1 / 3, "/trees/1"),
        (652, 344, "02", "Backend & REST API Architecture", "Express routes, controllers, and APIs.", "0 / 3 completed", 0, "/trees/2"),
        (60, 578, "03", "Database Modeling with PostgreSQL", "Relational data, queries, and join tables.", "0 / 3 completed", 0, "/trees/3"),
        (652, 578, "04", "DevOps & Cloud Deployment", "Environment setup, builds, and deployment.", "0 / 3 completed", 0, "/trees/4"),
    ]
    for x, y, number, title, description, count, fraction, route in cards:
        s.rect(x, y, 564, 210)
        s.text(x + 22, y + 31, f"TRACK {number}", 12, 700, MUTED)
        s.text(x + 22, y + 64, title, 21, 650)
        s.text(x + 22, y + 94, description, 16, fill=MUTED)
        s.progress(x + 22, y + 119, 520, fraction)
        s.text(x + 22, y + 157, count, 14, 600)
        s.text(x + 22, y + 182, route, 12, fill=MUTED, code=True)
        s.button(x + 388, y + 149, 154, "Explore tree  >")
    s.rect(60, 820, 1156, 132, LIGHT, "#d5d5d5")
    s.text(84, 850, "PICK UP WHERE YOU LEFT OFF", 12, 700, MUTED)
    s.text(84, 885, "Manage React state", 23, 650)
    s.text(84, 916, "In Progress / Frontend Mastery with React / 150 XP reward", 16, fill=MUTED)
    s.button(1000, 865, 192, "Resume quest  >", True)
    notes(s, [
        ("Navigate", "Track cards change the URL to /trees/:id. Resume opens the tree with its quest pane selected."),
        ("Guest variant", "Replace account controls with GitHub sign-in. Hide personal XP and resume until authenticated."),
        ("Narrow screens", "Stack track cards into one column. Keep labels and navigation visible as the header wraps."),
    ])
    return s.write("skill-tree-explorer")


QUESTS = [
    ("01", "HTML & CSS foundations", "BEGINNER", "100 XP", "Completed", "Seeded quest / Admin manages content"),
    ("02", "Manage React state", "INTERMEDIATE", "150 XP", "In Progress", "Seeded quest / Admin manages content"),
    ("03", "Build React routing", "ADVANCED", "200 XP", "Backlog", "Custom quest / Created by Alex Chen"),
]


def tree_base(number="02", title="Skill Tree Detail", subtitle="An ordered roadmap, with personal progress and advisory prerequisites."):
    s = frame(number, title, "/trees/1", subtitle)
    s.text(60, 237, "< All skill trees", 14, 600, MUTED)
    s.text(60, 275, "Frontend Mastery with React", 30, 650)
    s.text(60, 305, "Build a foundation, manage state, then explore dynamic routes.", 16, fill=MUTED)
    s.button(1040, 253, 176, "+ Forge Quest", True)
    s.text(60, 353, "MY TRACK PROGRESS", 12, 700, MUTED)
    s.text(900, 353, "1 / 3 completed / 100 XP earned", 14, 600, anchor="end")
    s.progress(60, 371, 840, 1 / 3)
    for index, (number, title, difficulty, xp, status, ownership) in enumerate(QUESTS):
        y = 408 + index * 178
        s.rect(60, y, 840, 154)
        s.circle(88, y + 32, 13, "#e0e0e0" if index == 0 else PAPER)
        s.text(88, y + 36, "OK" if index == 0 else number, 9, 700, anchor="middle")
        s.text(114, y + 38, title, 21, 650)
        s.pill(82, y + 58, 132, difficulty)
        s.text(230, y + 77, xp, 14, 600)
        s.text(82, y + 116, ownership, 12, fill=MUTED)
        s.text(602, y + 26, "My status", 12, 600, MUTED)
        s.button(602, y + 38, 274, f"{status}  v", index == 0)
        s.button(730, y + 99, 146, "View quest  >")
    s.rect(932, 340, 284, 468, LIGHT, "#d2d2d2")
    s.text(952, 375, "Roadmap guidance", 20, 650)
    s.lines(952, 409, "Follow the order or choose a quest that fits your project.", width=28)
    s.line(952, 477, 1196, 477)
    s.text(952, 507, "PREREQUISITES", 12, 700, MUTED)
    s.lines(952, 539, "Routing benefits from React state knowledge. This is guidance, not an unlock rule.", width=27)
    s.line(952, 644, 1196, 644)
    s.text(952, 675, "THIS TRACK", 12, 700, MUTED)
    s.text(952, 707, "1 completed", 17, 600)
    s.text(952, 738, "1 in progress", 17, 600)
    s.text(952, 769, "1 backlog", 17, 600)
    s.text(60, 974, "Status belongs to you. Quest instructions belong to the shared catalog.", 13, fill=MUTED)
    return s


def tree():
    s = tree_base()
    notes(s, [
        ("Same-page progress", "My status updates only your progress row. Refresh totals without reloading or changing the URL."),
        ("Quest panes", "View quest reads details. Forge Quest opens creation. Both keep the current tree route visible."),
        ("No enforced unlocks", "All quests remain available. On small screens, place guidance below the ordered quest list."),
    ])
    return s.write("skill-tree-detail")


def dashboard():
    s = frame("03", "Developer Dashboard", "/dashboard", "Personal progress across public skill trees. Authentication required.", "dashboard")
    s.text(60, 244, "YOUR PROGRESS", 12, 700, MUTED)
    s.text(60, 279, "Keep building, Alex.", 32, 650)
    s.text(60, 309, "Your work adds up, one completed quest at a time.", 17, fill=MUTED)
    for x, value, label in [(60, "100", "TOTAL DEV XP"), (454, "1 / 12", "QUESTS COMPLETED"), (848, "1", "QUEST IN PROGRESS")]:
        s.rect(x, 338, 368, 106)
        s.text(x + 22, 383, value, 32, 650)
        s.text(x + 22, 415, label, 12, 700, MUTED)
    s.rect(60, 472, 744, 244)
    s.text(82, 508, "Skill tree progress", 22, 650)
    rows = [("Frontend Mastery with React", "1 / 3", 1 / 3), ("Backend & REST API Architecture", "0 / 3", 0), ("Database Modeling with PostgreSQL", "0 / 3", 0), ("DevOps & Cloud Deployment", "0 / 3", 0)]
    for index, (title, count, fraction) in enumerate(rows):
        y = 546 + index * 43
        s.text(82, y, title, 15, 600)
        s.progress(459, y - 10, 228, fraction)
        s.text(773, y, f"{count}  >", 14, anchor="end")
    s.rect(832, 472, 384, 244, LIGHT)
    s.text(854, 508, "Continue a quest", 22, 650)
    s.pill(854, 531, 118, "IN PROGRESS")
    s.text(854, 588, "Manage React state", 21, 650)
    s.text(854, 619, "150 XP reward / React track", 15, fill=MUTED)
    s.button(854, 652, 338, "Open quest  >", True)
    s.rect(60, 740, 1156, 108)
    s.text(82, 773, "Recently completed", 20, 650)
    s.text(82, 808, "HTML & CSS foundations", 18, 600)
    s.text(529, 808, "Completed / +100 XP", 15, fill=MUTED)
    s.text(1192, 808, "View quest   /   Repository  >", 15, 600, anchor="end")
    s.rect(60, 872, 1156, 94, "#f5f5f5", "#8f8f8f", dash="6 4")
    s.text(82, 900, "ADMIN VARIANT / HIDDEN FROM DEVELOPER ACCOUNTS", 11, 700, MUTED)
    s.text(82, 931, "Restore the default catalog and starter progress.", 17, 600)
    s.button(1000, 901, 192, "Reset database")
    notes(s, [
        ("Personal totals", "100 XP, 1 of 12 completed, 1 in progress. Tree and quest links return to the relevant roadmap."),
        ("Signed-in access", "Guests sign in through GitHub before viewing this page. A new account begins at zero progress."),
        ("Admin reset confirmation", "Dialog: Replace catalog and all progress? Cancel / Reset to defaults. Preserve identities and roles."),
    ])
    return s.write("developer-dashboard")


def pane_base(number, title, subtitle):
    s = tree_base(number, title, subtitle)
    s.rect(29, 206, 1222, 786, "#000000", "none", radius=0, opacity=0.18)
    s.rect(540, 206, 712, 786, PAPER, "#929292", radius=0)
    s.line(540, 206, 540, 992, "#707070", 2)
    s.text(572, 244, title, 26, 650)
    s.text(572, 272, "Frontend Mastery with React / Public quest", 13, fill=MUTED)
    s.button(1196, 220, 36, "X", height=32)
    s.line(540, 288, 1251, 288)
    return s


def details():
    s = pane_base("04", "Quest details", "Supplementary tree state / Read shared content and save your personal progress.")
    s.text(572, 325, "Build React routing", 26, 650)
    s.pill(572, 342, 110, "ADVANCED")
    s.text(698, 361, "200 XP / Custom / Created by Alex Chen", 14, fill=MUTED)
    s.text(572, 397, "Build navigable pages for your skill-tree project.", 17)
    s.text(572, 434, "Requirements", 16, 700)
    s.text(584, 465, "1. Read /trees/:id route parameters to load a tree.", 16)
    s.text(584, 492, "2. Show a helpful state when a tree cannot be found.", 16)
    s.rect(572, 515, 648, 57, LIGHT, "#d5d5d5", radius=5)
    s.text(588, 538, "PREREQUISITE GUIDANCE", 11, 700, MUTED)
    s.text(588, 559, "Comfort with React state; starting this quest is always allowed.", 14)
    s.text(572, 603, "Documentation: React Router routing docs  >", 15, 600)
    s.line(572, 624, 1220, 624)
    s.text(572, 653, "My progress", 20, 650)
    s.text(1220, 652, "PRIVATE TO YOUR ACCOUNT", 11, 700, MUTED, "end")
    s.field(572, 680, 648, "Status", "Backlog                                      v")
    s.field(572, 747, 648, "Repository URL (optional)", "https://github.com/...", placeholder=True)
    s.field(572, 814, 648, "Personal notes (optional)", "Next: route params and fallback state.", height=48)
    s.button(572, 890, 224, "Save my progress", True)
    s.line(572, 943, 1220, 943)
    s.text(572, 972, "SHARED CONTENT / OWNER OR ADMIN", 10, 700, MUTED)
    s.button(902, 953, 152, "Edit quest", height=28)
    s.button(1066, 953, 154, "Delete quest", height=28)
    notes(s, [
        ("Keep changes separate", "Save my progress writes personal status, notes, and repository URL. Edit changes shared instructions."),
        ("Owner/admin controls", "Other users do not see Edit or Delete. Confirm deletion because it also removes saved progress."),
        ("Dialog behavior", "Trap focus; Escape closes. Confirm discarding dirty inputs. Return focus to View quest on close."),
    ])
    return s.write("quest-details-pane")


def forge():
    s = pane_base("05", "Edit quest", "Supplementary tree state / Forge Quest uses the same form with blank content.")
    s.field(572, 312, 648, "Title *", "Build React routing")
    s.field(572, 376, 648, "Skill tree *", "Frontend Mastery with React                                  v")
    s.field(572, 440, 648, "Description *", "Build navigable pages for your skill-tree project.", height=44)
    s.field(572, 514, 648, "Requirements *", "Read /trees/:id route parameters to load a tree.\nShow a helpful state when a tree cannot be found.", height=58)
    s.field(572, 600, 236, "Difficulty *", "Advanced                 v")
    s.field(826, 600, 184, "XP reward *", "200")
    s.field(1028, 600, 192, "Roadmap position *", "3")
    s.field(572, 664, 648, "Tech stack tags (comma-separated)", "React, React Router")
    s.field(572, 728, 648, "Prerequisite notes (optional guidance)", "Comfort with React state; no enforced unlock.")
    s.field(572, 792, 648, "Documentation URLs (one per line)", "https://reactrouter.com/start/declarative/routing", height=48)
    s.text(572, 875, "* Required / Saved content is visible in the public catalog.", 13, fill=MUTED)
    s.line(540, 896, 1251, 896)
    s.button(572, 916, 230, "Save changes", True)
    s.button(816, 916, 150, "Cancel")
    s.text(572, 978, "Reward changes do not alter previously earned XP.", 13, fill=MUTED)
    notes(s, [
        ("Create and edit", "Create: Forge Quest / Create quest, blank content, current tree selected. Edit loads saved values."),
        ("Pending and invalid input", "Disable Save while pending. Keep input on failure; show validation by its field and allow retry."),
        ("Close or cancel", "Confirm discard when dirty. On small screens, use a full-width scrollable pane with reachable actions."),
    ])
    return s.write("quest-forge-pane")


def table(s, x, y, width, name, fields):
    height = 82 + len(fields) * 34
    s.rect(x, y, width, height, PAPER, "#999999", radius=5)
    s.rect(x, y, width, 48, DARK, DARK, radius=5)
    s.rect(x, y + 30, width, 18, DARK, "none", radius=0)
    s.text(x + 18, y + 32, name, 23, 650, PAPER, code=True)
    s.rect(x + 1, y + 49, width - 2, 33, "#eaeaea", "none", radius=0)
    s.text(x + 14, y + 71, "KEY", 11, 700, MUTED)
    s.text(x + 80, y + 71, "COLUMN", 11, 700, MUTED)
    s.text(x + 324, y + 71, "PG TYPE", 11, 700, MUTED)
    for index, (key, field, data_type) in enumerate(fields):
        yy = y + 82 + index * 34
        if index % 2:
            s.rect(x + 1, yy, width - 2, 34, "#f6f6f6", "none", radius=0)
        s.text(x + 14, yy + 23, key, 10, 700, MUTED)
        s.text(x + 80, yy + 23, field, 15, 500, code=True)
        s.text(x + 324, yy + 23, data_type, 14, fill=MUTED, code=True)


def cardinality(s, x, y, dx, dy, kind):
    """dx/dy point from the entity toward its connector."""
    px, py = -dy, dx

    def bar(distance):
        cx, cy = x + dx * distance, y + dy * distance
        s.line(cx - px * 8, cy - py * 8, cx + px * 8, cy + py * 8, INK, 1.8)

    if kind == "one":
        bar(10)
        bar(17)
    elif kind == "optional_one":
        bar(10)
        s.circle(x + dx * 25, y + dy * 25, 5)
    elif kind == "many":
        for offset in (-9, 0, 9):
            s.line(x + px * offset, y + py * offset, x + dx * 19, y + dy * 19, INK, 1.8)
        s.circle(x + dx * 31, y + dy * 31, 5)


def erd():
    s = SVG(1280, 1280, "SkillForge entity relationship diagram", "Four PostgreSQL domain entities with crow's-foot cardinalities, authorship, and a composite-key progress join table.")
    s.text(36, 33, "SKILLFORGE / MILESTONE 02", 12, 700, MUTED)
    s.text(36, 77, "Entity Relationship Diagram", 34, 650)
    s.text(36, 109, "PostgreSQL domain model / Public quests, personal progress, GitHub identities", 17, fill=MUTED)
    user_fields = [("PK", "id", "integer"), ("UQ", "github_id", "text"), ("", "github_username", "text"), ("", "display_name", "text"), ("", "avatar_url ?", "text"), ("", "role", "text"), ("", "created_at", "timestamptz")]
    tree_fields = [("PK", "id", "integer"), ("", "title", "text"), ("", "description", "text")]
    quest_fields = [("PK", "id", "integer"), ("FK", "skill_tree_id", "integer"), ("FK", "created_by_user_id ?", "integer"), ("", "title", "text"), ("", "description", "text"), ("", "requirements", "text"), ("", "difficulty", "text"), ("", "xp_reward", "integer"), ("", "position", "integer"), ("", "prerequisite_notes ?", "text"), ("", "tech_stack_tags", "text[]"), ("", "documentation_urls", "text[]")]
    progress_fields = [("PK,FK", "user_id", "integer"), ("PK,FK", "quest_id", "integer"), ("", "status", "text"), ("", "xp_earned", "integer"), ("", "completed_at ?", "timestamptz"), ("", "notes ?", "text"), ("", "repository_url ?", "text")]
    table(s, 36, 156, 496, "users", user_fields)
    table(s, 748, 156, 496, "skill_trees", tree_fields)
    table(s, 748, 500, 496, "quests", quest_fields)
    table(s, 36, 670, 496, "user_quests", progress_fields)

    s.line(996, 340, 996, 500, MUTED, 1.8)
    cardinality(s, 996, 340, 0, 1, "one")
    cardinality(s, 996, 500, 0, -1, "many")
    s.text(1016, 409, "contains", 15, 600)
    s.text(1016, 432, "1 to 0..*", 12, fill=MUTED)

    s.line(284, 476, 284, 670, MUTED, 1.8)
    cardinality(s, 284, 476, 0, 1, "one")
    cardinality(s, 284, 670, 0, -1, "many")
    s.text(306, 561, "tracks", 15, 600)
    s.text(306, 585, "1 to 0..*", 12, fill=MUTED)

    s.path([(532, 292), (638, 292), (638, 614), (748, 614)])
    cardinality(s, 532, 292, 1, 0, "optional_one")
    cardinality(s, 748, 614, -1, 0, "many")
    s.text(621, 437, "authors", 15, 600, anchor="end")
    s.text(621, 461, "0..1 creator", 12, fill=MUTED, anchor="end")
    s.text(621, 481, "0..* quests", 12, fill=MUTED, anchor="end")

    s.line(532, 820, 748, 820, MUTED, 1.8)
    cardinality(s, 532, 820, 1, 0, "many")
    cardinality(s, 748, 820, -1, 0, "one")
    s.text(640, 770, "records", 15, 600, anchor="middle")
    s.text(640, 794, "0..* to 1", 12, fill=MUTED, anchor="middle")

    s.rect(36, 1022, 1208, 214, LIGHT, "#d1d1d1")
    s.text(58, 1055, "READING THE MODEL", 12, 700, MUTED)
    for x, kind, label in [(58, "one", "Exactly one"), (386, "optional_one", "Zero or one"), (714, "many", "Zero or many")]:
        s.line(x, 1092, x + 64, 1092, MUTED, 1.8)
        cardinality(s, x, 1092, 1, 0, kind)
        s.text(x + 84, 1098, label, 16, 600)
    s.text(58, 1138, "PK = primary key / FK = foreign key / UQ = unique / ? = nullable; all other fields required.", 15)
    s.text(58, 1172, "user_quests: composite PK (user_id, quest_id); progress and XP belong to the developer.", 15, 600)
    s.text(58, 1204, "Null creator = seeded quest. Prerequisite notes guide learning; no dependency table or enforced unlocks.", 14, fill=MUTED)
    return s.write("entity-relationship-diagram")


def find_browser(explicit):
    if explicit:
        candidate = Path(explicit).expanduser().resolve()
        if not candidate.is_file():
            raise SystemExit(f"Browser not found: {candidate}")
        return str(candidate)
    candidates = [
        Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Microsoft/Edge/Application/msedge.exe",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    for name in ("google-chrome", "chromium", "chromium-browser", "msedge"):
        candidate = shutil.which(name)
        if candidate:
            return candidate
    raise SystemExit("Chrome/Edge not found. Supply --browser PATH or generate without --render.")


def render(browser, asset):
    svg, width, height = asset
    png = svg.with_suffix(".png")
    with tempfile.TemporaryDirectory(prefix="skillforge-diagrams-") as temporary:
        profile = Path(temporary) / "profile"
        export = Path(temporary) / "export.png"
        command = [browser, "--headless", "--disable-gpu", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-device-scale-factor=1", f"--user-data-dir={profile}", f"--window-size={width},{height}", f"--screenshot={export}", svg.as_uri()]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        if result.returncode or not export.is_file():
            raise SystemExit(f"Browser export failed for {svg.name}: {result.stderr[-2000:]}")
        header = export.read_bytes()[:24]
        dimensions = (int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big"))
        if header[:8] != b"\x89PNG\r\n\x1a\n" or dimensions != (width, height):
            raise SystemExit(f"Invalid PNG export for {svg.name}: {dimensions}")
        shutil.copyfile(export, png)
    print(f"Exported {png.name} ({width} x {height})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--render", action="store_true", help="Export PNGs with an installed Chrome/Edge.")
    parser.add_argument("--browser", help="Explicit Chrome/Edge executable path.")
    args = parser.parse_args()
    assets = [explorer(), tree(), dashboard(), details(), forge(), erd()]
    print(f"Generated {len(assets)} editable SVG assets in {ROOT}")
    if args.render:
        browser = find_browser(args.browser)
        for asset in assets:
            render(browser, asset)


if __name__ == "__main__":
    main()
