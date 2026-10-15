/**
 * The Mutual - Active Document & Deliverable Text Extractor (Safari Edition)
 * Safely extracts document draft text from Google Docs, Notion, or webmail for Pre-Flight auditing.
 */

(function () {
  console.log("[The Mutual Safari] Document content helper ready.");

  function injectDocBadge() {
    if (document.getElementById("the-mutual-doc-badge")) return;

    const badge = document.createElement("div");
    badge.id = "the-mutual-doc-badge";
    badge.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="width:7px;height:7px;border-radius:50%;background:#2D6A4F;display:inline-block;box-shadow:0 0 6px rgba(45,106,79,0.4);"></span>
        <span style="font-weight:600;color:#1C1917;letter-spacing:0.02em;">The Mutual</span>
        <span style="color:#78716C;font-size:11px;">• Pre-Flight Audit (⌥M)</span>
      </div>
    `;
    Object.assign(badge.style, {
      position: "fixed", bottom: "24px", right: "24px", zIndex: "99999",
      background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)",
      border: "1px solid rgba(0,0,0,0.1)", borderRadius: "20px",
      padding: "6px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      fontFamily: "system-ui,-apple-system,sans-serif", fontSize: "12px",
      color: "#292524", userSelect: "none", cursor: "pointer",
      transition: "transform 0.15s ease, box-shadow 0.15s ease"
    });

    badge.title = "Click or press Option+M to run Pre-Flight audit against agreed Micro-Contract.";
    badge.addEventListener("click", () => {
      if (window.theMutualToggleDrawer) window.theMutualToggleDrawer();
    });

    document.body && document.body.appendChild(badge);
  }

  function getDocumentDraftText() {
    const selection = window.getSelection() ? window.getSelection().toString().trim() : "";
    if (selection && selection.length > 20) {
      return selection;
    }

    const gdoc = document.querySelector(".kix-page-content") || document.querySelector(".docs-editor");
    if (gdoc && gdoc.innerText) {
      return gdoc.innerText.trim();
    }

    const notion = document.querySelector(".notion-page-content");
    if (notion && notion.innerText) {
      return notion.innerText.trim();
    }

    const gmail = document.querySelector("div[aria-label='Message Body']") || document.querySelector("[role='main']");
    if (gmail && gmail.innerText) {
      return gmail.innerText.trim();
    }

    const article = document.querySelector("article") || document.querySelector("main") || document.body;
    return article ? article.innerText.trim() : "";
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "EXTRACT_DOCUMENT_TEXT") {
      const text = getDocumentDraftText();
      sendResponse({ text: text });
    }
    return true;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectDocBadge);
  } else {
    injectDocBadge();
  }
})();
