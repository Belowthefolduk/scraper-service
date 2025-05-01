const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

    let screenshotBase64 = null;
    if (options.screenshot) {
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      screenshotBase64 = screenshotBuffer.toString('base64');
    }

    const contentData = await page.evaluate(() => {
      const getText = (selector) =>
        Array.from(document.querySelectorAll(selector))
          .map(el => el.innerText.trim())
          .filter(Boolean);

      const getAttr = (selector, attr) =>
        Array.from(document.querySelectorAll(selector))
          .map(el => el.getAttribute(attr))
          .filter(Boolean);

      const getProducts = () => {
        return Array.from(document.querySelectorAll('[class*="product"]')).map(product => {
          const title = product.querySelector('h2, h3')?.innerText || '';
          const priceMatch = product.innerText.match(/[$£€]\s?\d+[.,]?\d*/);
          const price = priceMatch ? priceMatch[0] : '';
          const description = product.querySelector('p')?.innerText || '';

          return { title, price, description };
        });
      };

      return {
        pageTitle: document.title,
        metaDescription: document.querySelector("meta[name='description']")?.getAttribute('content') || '',
        headings: {
          h1: getText('h1'),
          h2: getText('h2'),
          h3: getText('h3')
        },
        products: getProducts(),
        images: getAttr('img', 'alt'),
        links: getAttr('a', 'href'),
        pageTextSample: document.body?.innerText?.slice(0, 1000) || ''
      };
    });

    await browser.close();

    const response = {
      url,
      timestamp: new Date().toISOString(),
      data: contentData,
      screenshot: options.screenshot ? screenshotBase64 : undefined,
      scoring: {
        hasMetaDescription: !!contentData.metaDescription,
        hasH1: contentData.headings.h1.length > 0,
        productCount: contentData.products.length,
        altTagCoverage: contentData.images.length,
        textSampleLength: contentData.pageTextSample.length
      }
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Scraper running on port ${PORT}`));

