"""Measure actual FPS and entity count after warmup."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    ctx = browser.new_context(viewport={'width': 1600, 'height': 900})
    page = ctx.new_page()
    page.goto('http://localhost:3000/oracle-world', wait_until='domcontentloaded')
    page.wait_for_selector('canvas', timeout=15000)
    page.wait_for_timeout(10000)  # warmup 10 sec

    # Sample frame timestamps
    fps = page.evaluate("""async () => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < 2000) requestAnimationFrame(tick);
          else resolve(frames / 2);  // frames per second over 2 sec window
        };
        requestAnimationFrame(tick);
      });
    }""")
    print(f"Measured FPS: {fps:.1f}")

    # Sample state via React DevTools-like injection — read window state
    info = page.evaluate("""() => {
      const c = document.querySelector('canvas');
      return {
        canvas: c ? {w: c.width, h: c.height} : null,
        memory: performance.memory ? {
          usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(1),
          totalMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(1),
        } : null,
      };
    }""")
    print(f"Info: {info}")

    browser.close()
