const axios = require('axios');
const cheerio = require('cheerio');

async function testSpaScriptScan() {
  const baseUrl = 'https://www.visionautomationrobotic.com/';
  const res = await axios.get(baseUrl);
  const $ = cheerio.load(res.data);

  const scripts = [];
  $('script[src]').each((_, elem) => {
    const src = $(elem).attr('src');
    if (src) {
      const fullJsUrl = new URL(src, baseUrl).href;
      scripts.push(fullJsUrl);
    }
  });

  console.log('Discovered JS bundles:', scripts);

  for (const jsUrl of scripts) {
    try {
      const jsRes = await axios.get(jsUrl);
      console.log(`JS Bundle ${jsUrl} Length:`, jsRes.data.length);
      const containsPhone = jsRes.data.includes('8373919166');
      console.log('Contains 8373919166?:', containsPhone);

      if (containsPhone) {
        const idx = jsRes.data.indexOf('8373919166');
        console.log('Snippet around phone in JS bundle:');
        console.log(jsRes.data.substring(Math.max(0, idx - 100), Math.min(jsRes.data.length, idx + 100)));
      }
    } catch (e) {
      console.error('JS fetch error:', e.message);
    }
  }
}

testSpaScriptScan();
