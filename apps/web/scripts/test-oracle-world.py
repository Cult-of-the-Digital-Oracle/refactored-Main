"""Smoke test: load /oracle-world, verify canvas + worker, capture screenshot."""
from playwright.sync_api import sync_playwright
import sys

console_logs = []
console_errors = []
page_errors = []
network_errors = []

def on_console(msg):
    if msg.type == 'error':
        console_errors.append(msg.text)
    console_logs.append(f"[{msg.type}] {msg.text}")

def on_page_error(err):
    page_errors.append(str(err))

def on_response(resp):
    if resp.status >= 400:
        network_errors.append(f"{resp.status} {resp.url}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    ctx = browser.new_context(viewport={'width': 1600, 'height': 900})
    page = ctx.new_page()
    page.on('console', on_console)
    page.on('pageerror', on_page_error)
    page.on('response', on_response)

    print("Navigating to /oracle-world...")
    page.goto('http://localhost:3000/oracle-world', wait_until='domcontentloaded', timeout=30000)
    print("DOMContentLoaded fired.")

    # Wait for canvas mounted (PixiJS injects a <canvas>)
    try:
        page.wait_for_selector('canvas', timeout=15000)
        print("Canvas element mounted.")
    except Exception as e:
        print(f"!! No canvas after 15s: {e}")

    # Let the simulation tick for ~5 seconds to gather entities
    page.wait_for_timeout(5000)

    # Zoom in centered on canvas middle
    canvas = page.locator('canvas').first
    bbox = canvas.bounding_box()
    cx = bbox['x'] + bbox['width'] / 2
    cy = bbox['y'] + bbox['height'] / 2
    page.mouse.move(cx, cy)
    for _ in range(8):
        page.mouse.wheel(0, -120)
        page.wait_for_timeout(80)
    page.wait_for_timeout(2000)
    page.screenshot(path='C:/Users/hansg/HansProject/Cult-of-the-Digital-Oracle/refactored-Main/apps/web/scripts/oracle-world-zoomed.png')
    print("Zoomed screenshot saved.")

    # Sample state injected via runtime
    state = page.evaluate("""() => {
      const c = document.querySelector('canvas');
      if (!c) return { ok: false, reason: 'no canvas' };
      return {
        ok: true,
        canvasW: c.width,
        canvasH: c.height,
        offscreen: typeof OffscreenCanvas !== 'undefined',
        webgl: !!c.getContext('webgl2') || !!c.getContext('webgl'),
        pixelRatio: window.devicePixelRatio,
      };
    }""")
    print(f"Canvas state: {state}")

    page.screenshot(path='C:/Users/hansg/HansProject/Cult-of-the-Digital-Oracle/refactored-Main/apps/web/scripts/oracle-world-test.png', full_page=False)
    print("Screenshot saved to scripts/oracle-world-test.png")

    print("\n--- Console errors (first 20) ---")
    for e in console_errors[:20]:
        print(f"  {e}")
    print(f"  Total: {len(console_errors)} errors")

    print("\n--- Page errors ---")
    for e in page_errors:
        print(f"  {e}")

    print("\n--- Network failures ---")
    for e in network_errors[:10]:
        print(f"  {e}")

    print("\n--- Last 25 console messages ---")
    for log in console_logs[-25:]:
        print(f"  {log}")

    browser.close()
