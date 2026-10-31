(() => {
  "use strict";
  if (globalThis.__fileeSvgDrag) return;
  globalThis.__fileeSvgDrag = true;
  const ns = "http://www.w3.org/2000/svg";
  const properties = ["color", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width",
    "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
    "stroke-dashoffset", "opacity", "visibility", "display", "clip-path", "clip-rule", "mask",
    "filter", "paint-order", "vector-effect", "font-family", "font-size", "font-style", "font-weight",
    "text-anchor", "dominant-baseline", "letter-spacing", "word-spacing", "stop-color", "stop-opacity"];
  let overlay, original, prepared, imageUrl, selectedCode, pressed = false, dragging = false, pointer;

  // Explicit src wins while currentSrc still names the previous clip. For <source>
  // lists, never fall back to a URL that is no longer among the current candidates.
  function videoAddress(video, forFilee = true) {
    const explicit = video.getAttribute("src");
    const candidates = [...video.querySelectorAll("source[src]")]
      .filter(source => !source.media || matchMedia(source.media).matches)
      .filter(source => !source.type || video.canPlayType(source.type))
      .map(source => source.src);
    const address = explicit !== null ? (explicit.trim() ? video.src : null)
      : candidates.includes(video.currentSrc) ? video.currentSrc : candidates[0];
    if (!address) throw new Error("This video has no current downloadable source.");
    const url = new URL(address, video.baseURI);
    if (!/^https?:$/.test(url.protocol) || /\.(m3u8|mpd)(?:$|[?#])/i.test(url.href))
      throw new Error("Segmented, local and protected video streams are not supported.");
    // Official Filee recognizes URL extensions. Do not invent an extension or strip signatures.
    if (forFilee && !/\.(mp4|webm|mov|m4v|avi|mkv|ogv|mpeg|mpg)(?:$|[?#])/i.test(url.href))
      throw new Error("Official Filee needs a direct video URL with a recognized file extension.");
    return url.href;
  }

  function selectedSvg(text) {
    const doc = new DOMParser().parseFromString(text.trim(), "image/svg+xml");
    const svg = doc.documentElement;
    if (doc.querySelector("parsererror") || svg.localName !== "svg"
        || (svg.namespaceURI && svg.namespaceURI !== ns) || doc.doctype)
      throw new Error("Select one complete, well-formed SVG element.");
    // A selected code fragment is not part of the rendered page: do not borrow its styles.
    for (const element of [svg, ...svg.querySelectorAll("*")]) {
      if (["script", "foreignObject", "animate", "animateTransform", "set"].includes(element.localName))
        throw new Error("Active SVG content is not supported.");
      for (const attribute of element.attributes) {
        if (/^on/i.test(attribute.name)) throw new Error("SVG event handlers are not supported.");
        if (attribute.localName === "href" && !attribute.value.startsWith("#"))
          throw new Error("This SVG requires an external resource.");
      }
    }
    if (/@import|@font-face/i.test(text) || [...text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)]
        .some(match => !match[1].trim().startsWith("#")))
      throw new Error("This SVG requires external CSS, a font or an image.");
    svg.setAttribute("xmlns", ns);
    return new XMLSerializer().serializeToString(svg);
  }

  function pictureAddress(image) {
    // Use only URLs the page actually supplies. Keep query strings, signatures and format parameters intact.
    const candidates = [];
    for (const entry of (image.getAttribute("srcset") || "").split(",")) {
      const match = entry.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?)(w|x)$/);
      if (match) candidates.push({ url: match[1], score: Number(match[2]) * (match[3] === "x" ? image.clientWidth : 1) });
    }
    const current = image.currentSrc || image.src;
    candidates.push({ url: current, score: image.naturalWidth || 0 });
    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
      const url = new URL(candidate.url, image.baseURI);
      if (/^https?:$/.test(url.protocol) || url.protocol === "data:" && /^data:image\//i.test(url.href)) return url.href;
    }
    throw new Error("This picture does not expose a downloadable image URL.");
  }

  function snapshot(svg) {
    const copy = svg.cloneNode(true);
    const pending = [];
    const ids = new Set([...copy.querySelectorAll("[id]")].map(e => e.id));
    if (copy.id) ids.add(copy.id);
    let references = 0;
    function localReference(value) {
      if (value.startsWith("#")) return value;
      const url = new URL(value, svg.baseURI);
      const page = new URL(svg.ownerDocument.URL);
      if (url.origin === page.origin && url.pathname === page.pathname && url.search === page.search && url.hash)
        return url.hash;
      throw new Error("This SVG needs an external resource; direct drag cannot preserve it yet.");
    }
    function reference(value) {
      const fragment = localReference(value);
      pending.push(decodeURIComponent(fragment.slice(1)));
      return fragment;
    }
    function urls(value) {
      return value.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (_, url) => {
        const fragment = reference(url.trim());
        return /^#[\w:.-]+$/.test(fragment) ? `url(${fragment})` : `url("${fragment}")`;
      });
    }
    function prepare(source, target, root = false) {
      const originals = [source, ...source.querySelectorAll("*")];
      const clones = [target, ...target.querySelectorAll("*")];
      if (originals.length > 20000) throw new Error("SVG is too large to drag.");
      originals.forEach((element, i) => {
        const clone = clones[i];
        if (["script", "style", "foreignObject", "animate", "animateTransform", "set"].includes(element.localName)) {
          clone.remove(); return;
        }
        for (const attribute of [...clone.attributes]) {
          if (/^on/i.test(attribute.name)) clone.removeAttributeNode(attribute);
          else if (attribute.localName === "href") clone.setAttributeNS(attribute.namespaceURI, attribute.name, reference(attribute.value));
          else if (attribute.value.includes("url(")) clone.setAttribute(attribute.name, urls(attribute.value));
        }
        const style = getComputedStyle(element);
        clone.removeAttribute("class");
        clone.removeAttribute("style");
        for (const property of properties) {
          const value = style.getPropertyValue(property);
          // Presentation attributes also work in SVG viewers with limited CSS support.
          // Resolve currentColor and page styles before detaching the drawing.
          if (value) clone.setAttribute(property, urls(value));
        }
        if (!(root && i === 0) && style.transform !== "none") clone.style.transform = style.transform;
      });
    }
    prepare(svg, copy, true);
    const defs = document.createElementNS(ns, "defs");
    while (pending.length) {
      if (++references > 512) throw new Error("Too many SVG references.");
      const id = pending.shift();
      if (ids.has(id)) continue;
      const source = svg.ownerDocument.getElementById(id);
      if (!source || source.namespaceURI !== ns) throw new Error(`Missing SVG definition: ${id}`);
      const cloned = source.cloneNode(true);
      ids.add(id);
      for (const child of cloned.querySelectorAll("[id]")) ids.add(child.id);
      prepare(source, cloned);
      defs.append(cloned);
    }
    if (defs.childNodes.length) copy.prepend(defs);
    copy.setAttribute("xmlns", ns);
    const rect = svg.getBoundingClientRect();
    copy.setAttribute("width", String(svg.width.baseVal.value || rect.width));
    copy.setAttribute("height", String(svg.height.baseVal.value || rect.height));
    copy.style.display = "block";
    const result = new XMLSerializer().serializeToString(copy);
    if (result.length > 4 * 1024 * 1024) throw new Error("SVG is too large to drag.");
    return result;
  }

  function codeSelection(x, y) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    const text = selection.toString();
    if (text.length > 4 * 1024 * 1024 || !/(?:<|&lt;)svg(?:\s|>|&gt;)/i.test(text)
        || !/(?:<|&lt;)\/svg\s*(?:>|&gt;)/i.test(text)) return null;
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      if (![...range.getClientRects()].some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) continue;
      const node = range.commonAncestorContainer;
      return { text, target: node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement, box: range.getBoundingClientRect() };
    }
    return null;
  }

  function clear() {
    overlay?.remove(); overlay = original = prepared = imageUrl = selectedCode = null; pressed = dragging = false;
  }
  function arm(x, y) {
    if (dragging || pressed) return;
    if (overlay) overlay.style.pointerEvents = "none";
    const hit = document.elementFromPoint(x, y);
    if (overlay) overlay.style.pointerEvents = "auto";
    let svg = hit?.closest("svg");
    while (svg?.parentElement?.closest("svg")) svg = svg.parentElement.closest("svg");
    const video = hit?.closest("video");
    let picture = hit?.closest("img");
    // Hero banners often place a sibling link over the entire picture. Look through
    // that link within its own card, never through dialogs or unrelated controls.
    if (!svg && !picture && hit?.closest("a")) {
      const link = hit.closest("a");
      const stack = document.elementsFromPoint(x, y);
      picture = stack.find(element => element.localName === "img"
        && link.parentElement?.contains(element)
        && getComputedStyle(element).visibility === "visible") || null;
    }
    if (!svg && !picture) {
      const card = hit?.closest("a");
      const images = card?.querySelectorAll("img");
      if (images?.length === 1) {
        const bounds = images[0].getBoundingClientRect();
        if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) picture = images[0];
      }
    }
    const selection = !svg && !picture && !video ? codeSelection(x, y) : null;
    const target = svg || video || picture || selection?.target;
    if (target === original && !video && (selection?.text || null) === selectedCode) return;
    clear();
    if (!target) return;
    const box = selection?.box || target.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    try {
      if (selection) { selectedCode = selection.text; prepared = selectedSvg(selectedCode); }
      else if (svg) prepared = snapshot(svg);
      else if (video) {
        imageUrl = videoAddress(video);
      } else imageUrl = pictureAddress(picture);
    }
    catch (error) { console.warn("Filee SVG drag:", error.message); return; }
    original = target;
    // A DIV avoids Chrome synthesizing a virtual image file for code and video.
    const image = document.createElement(selectedCode || video ? "div" : "img");
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.draggable = true;
    if (!selectedCode && !video) image.src = imageUrl || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(prepared);
    image.title = "Ctrl + drag to Filee";
    image.style.cssText = `position:fixed!important;left:${box.left}px!important;top:${box.top}px!important;` +
      `width:${box.width}px!important;height:${box.height}px!important;margin:0!important;padding:0!important;` +
      "border:0!important;max-width:none!important;max-height:none!important;z-index:2147483647!important;" +
      "opacity:0.01!important;cursor:grab!important;pointer-events:auto!important;user-select:none!important;";
    image.addEventListener("mousedown", event => { pressed = event.ctrlKey; });
    image.addEventListener("dragstart", event => {
      if (!event.ctrlKey || !(prepared || imageUrl || selectedCode) || !event.dataTransfer) { event.preventDefault(); clear(); return; }
      if (video) {
        try { imageUrl = videoAddress(video); }
        catch (error) { console.warn("Filee companion:", error.message); event.preventDefault(); clear(); return; }
      }
      dragging = true;
      event.stopImmediatePropagation();
      event.dataTransfer.clearData();
      event.dataTransfer.effectAllowed = "copy";
      if (prepared) {
        event.dataTransfer.setData("image/svg+xml", prepared);
        event.dataTransfer.setData("text/plain", prepared);
        event.dataTransfer.setData("text/html", prepared);
        event.dataTransfer.setData("text/uri-list", "data:image/svg+xml;charset=utf-8," + encodeURIComponent(prepared));
      } else {
        const standalone = document.createElement(video ? "video" : "img");
        standalone.src = imageUrl;
        event.dataTransfer.setData("text/html", standalone.outerHTML);
        // Chrome's DownloadURL creates a separate browser download/temporary file.
        // Filee owns this transfer; URI-list avoids a second, unfinished history entry.
        event.dataTransfer.setData("text/uri-list", imageUrl);
        event.dataTransfer.setData("text/plain", imageUrl);
      }
      event.dataTransfer.setDragImage(original, 0, 0);
    });
    image.addEventListener("dragend", clear);
    overlay = image;
    document.documentElement.append(image);
  }
  document.addEventListener("selectionchange", () => { if (!pressed && !dragging) clear(); });
  document.addEventListener("mousemove", event => {
    pointer = [event.clientX, event.clientY];
    if (event.ctrlKey && !event.buttons) arm(...pointer);
    else if (!event.ctrlKey && !dragging) clear();
  }, true);
  document.addEventListener("keydown", event => { if (event.key === "Control" && pointer) arm(...pointer); }, true);
  document.addEventListener("keyup", event => { if (event.key === "Control" && !dragging) clear(); }, true);
  document.addEventListener("mouseup", () => { if (!dragging) clear(); }, true);
  window.addEventListener("blur", () => { if (!dragging) clear(); });
  window.addEventListener("scroll", () => { if (!dragging) clear(); }, true);
  window.addEventListener("resize", () => { if (!dragging) clear(); });

  // Resolve again when the user chooses Save original, so a menu cannot retain an old clip.
  let contextTarget, contextPoint;
  document.addEventListener("contextmenu", event => {
    contextTarget = event.target === overlay ? original : event.target;
    contextPoint = [event.clientX, event.clientY];
  }, true);
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (message.type !== "filee-download-target") return;
      try {
        const target = contextTarget;
        if (!target?.isConnected) throw new Error("Right-click the picture or video again.");
        let svg = target.closest("svg");
        while (svg?.parentElement?.closest("svg")) svg = svg.parentElement.closest("svg");
        const video = target.closest("video"), image = target.closest("img");
        const selection = contextPoint && codeSelection(...contextPoint);
        if (svg || selection) {
          const xml = svg ? snapshot(svg) : selectedSvg(selection.text);
          respond({url:"data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml), filename:"image.svg"});
        } else if (video) respond({url:videoAddress(video, false)});
        else if (image) respond({url:pictureAddress(image)});
        else throw new Error("Right-click an image, SVG, selected SVG code or a direct video.");
      } catch (error) { respond({error:error.message}); }
    });
  }
})();
