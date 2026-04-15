const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json({ limit: '800mb' }));

app.post('/screenshot', async (req, res) => {
  const { html, width = 1000 } = req.body;
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height: 5000 });
    await page.setContent(html, { waitUntil: 'load', timeout: 120000 });

    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete && img.naturalHeight > 0) return;
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 15000);
        });
      }));
    });

    await new Promise(r => setTimeout(r, 5000));

    const contentHeight = await page.evaluate(() => {
      const body = document.body;
      const lastChild = body.lastElementChild;
      if (lastChild) {
        const rect = lastChild.getBoundingClientRect();
        return Math.ceil(rect.bottom);
      }
      return body.scrollHeight;
    });

    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 95,
      clip: {
        x: 0,
        y: 0,
        width: width,
        height: contentHeight
      }
    });

    const base64String = Buffer.from(screenshot).toString('base64');

    res.json({
      image: base64String,
      width: width,
      height: contentHeight
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3100, () => console.log('Screenshot server on :3100'));
