const axios = require('axios');

async function debugTargetHtml() {
  try {
    const res = await axios.get('https://www.visionautomationrobotic.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    console.log('Status:', res.status);
    console.log('HTML Length:', res.data.length);
    console.log('Contains 8373919166?:', res.data.includes('8373919166'));
    
    const idx = res.data.indexOf('8373919166');
    if (idx !== -1) {
      console.log('Snippet around 8373919166:');
      console.log(res.data.substring(Math.max(0, idx - 100), Math.min(res.data.length, idx + 100)));
    } else {
      console.log('First 500 chars of HTML:');
      console.log(res.data.slice(0, 500));
    }
  } catch (err) {
    console.error('Error fetching HTML:', err.message);
  }
}

debugTargetHtml();
