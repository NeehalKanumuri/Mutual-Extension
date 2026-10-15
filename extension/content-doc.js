/**
 * The Mutual - Active Document & Deliverable Text Extractor
 * Safely extracts document draft text from Google Docs, Notion, or webmail for Pre-Flight auditing.
 */

(function () {
  console.log("[The Mutual] Document content helper ready.");

  function getDocumentDraftText() {
    // 1. If text is highlighted, prioritize selection
    const selection = window.getSelection() ? window.getSelection().toString().trim() : "";
    if (selection && selection.length > 20) {
      return selection;
    }

    // 2. Google Docs canvas/kix structure
    const gdoc = document.querySelector(".kix-page-content") || document.querySelector(".docs-editor");
    if (gdoc && gdoc.innerText) {
      return gdoc.innerText.trim();
    }

    // 3. Notion page content
    const notion = document.querySelector(".notion-page-content");
    if (notion && notion.innerText) {
      return notion.innerText.trim();
    }

    // 4. Gmail draft or composer body
    const gmail = document.querySelector("div[aria-label='Message Body']") || document.querySelector("[role='main']");
    if (gmail && gmail.innerText) {
      return gmail.innerText.trim();
    }

    // 5. Generic article or body
    const article = document.querySelector("article") || document.querySelector("main") || document.body;
    return article ? article.innerText.trim() : "";
  }

  // Listen for extraction requests
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "EXTRACT_DOCUMENT_TEXT") {
      const text = getDocumentDraftText();
      sendResponse({ text: text });
    }
    return true;
  });
})();
