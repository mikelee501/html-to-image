const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json({ limit: '200mb' }));

app.post('/screenshot', async (req, res) => {
  const { html, width = 1000 } = req.body;
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Wait for all images to load
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return;
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 10000);
        });
      }));
    });
    
    // Extra wait for rendering
    await new Promise(r => setTimeout(r, 2000));
    
    const fullHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width, height: fullHeight });
    const buffer = await page.screenshot({ type: 'jpeg', quality: 95, fullPage: true });
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3100, () => console.log('Screenshot server on :3100'));
