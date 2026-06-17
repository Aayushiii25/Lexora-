const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));

  const selectDocument = async (page, comboboxIndex = 0, optionIndex = 0) => {
    try {
      await page.evaluate((idx) => {
        const triggers = document.querySelectorAll('button[role="combobox"]');
        if (triggers[idx]) triggers[idx].click();
      }, comboboxIndex);
      await delay(500);
      
      await page.evaluate((optIdx) => {
        const items = document.querySelectorAll('[role="option"]');
        if (items[optIdx]) {
          items[optIdx].click();
        } else if (items[0]) {
          items[0].click();
        }
      }, optionIndex);
      await delay(500);
    } catch(e) {
      console.log("Select doc error", e.message);
    }
  };

  try {
    console.log(`Navigating to dashboard...`);
    await page.goto(`http://localhost:3000/`, { waitUntil: 'networkidle0' });
    await delay(1500);
    await page.screenshot({ path: path.join(docsDir, `dashboard.png`) });
  } catch(e) {}

  try {
    console.log(`Navigating to analysis...`);
    await page.goto(`http://localhost:3000/analysis`, { waitUntil: 'networkidle0' });
    await selectDocument(page);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Analysis'));
      if (btn) btn.click();
    });
    await delay(2000);
    await page.screenshot({ path: path.join(docsDir, `analysis.png`) });
  } catch(e) {}

  try {
    console.log(`Navigating to risk...`);
    await page.goto(`http://localhost:3000/risk`, { waitUntil: 'networkidle0' });
    await selectDocument(page);
    await delay(2000);
    await page.screenshot({ path: path.join(docsDir, `risk.png`) });
  } catch(e) {}

  try {
    console.log(`Navigating to obligations...`);
    await page.goto(`http://localhost:3000/obligations`, { waitUntil: 'networkidle0' });
    await selectDocument(page);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Extract'));
      if (btn) btn.click();
    });
    await delay(2000);
    await page.screenshot({ path: path.join(docsDir, `obligations.png`) });
  } catch(e) {}

  try {
    console.log(`Navigating to compare...`);
    await page.goto(`http://localhost:3000/compare`, { waitUntil: 'networkidle0' });
    await selectDocument(page, 0, 0); // Doc A
    await selectDocument(page, 1, 1); // Doc B
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Comparison'));
      if (btn) btn.click();
    });
    await delay(2500);
    await page.screenshot({ path: path.join(docsDir, `compare.png`) });
  } catch(e) {}

  try {
    console.log(`Navigating to knowledge_graph...`);
    await page.goto(`http://localhost:3000/knowledge-graph`, { waitUntil: 'networkidle0' });
    await selectDocument(page);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Graph'));
      if (btn) btn.click();
    });
    await delay(3000);
    await page.screenshot({ path: path.join(docsDir, `knowledge_graph.png`) });
  } catch(e) {}

  try {
    console.log(`Navigating to research_console...`);
    await page.goto(`http://localhost:3000/query`, { waitUntil: 'networkidle0' });
    await selectDocument(page);
    await delay(1000);
    await page.type('textarea', 'What are the termination conditions?');
    await page.keyboard.press('Enter');
    await delay(3000);
    await page.screenshot({ path: path.join(docsDir, `research_console.png`) });
  } catch(e) {}

  await browser.close();
  console.log("Done!");
})();
