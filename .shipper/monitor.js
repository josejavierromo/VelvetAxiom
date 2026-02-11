(function () {
  "use strict";

  const CONFIG = {
    ALLOWED_ORIGINS: ["http://localhost:3000", "https://app.shipper.now"],
    DEBOUNCE_DELAY: 250,
    MAX_STRING_LENGTH: 10000,
    HIGHLIGHT_COLOR: "#3b82f6",
    VISUAL_EDIT_ENABLED: false,
  };

  // Post message to parent window
  function postToParent(message) {
    CONFIG.ALLOWED_ORIGINS.forEach((origin) => {
      try {
        if (!window.parent) return;
        window.parent.postMessage(
          {
            ...message,
            timestamp: new Date().toISOString(),
          },
          origin
        );
      } catch (err) {
        console.error(`Failed to send message to ${origin}:`, err);
      }
    });
  }

  // Detect blank screen
  function isBlankScreen() {
    const root = document.querySelector("div#root");
    return root ? root.childElementCount === 0 : false;
  }

  // Serialize complex objects for transmission
  function serializeValue(value, depth = 0, seen = new WeakMap()) {
    if (depth > 5) return "[Max Depth Reached]";

    if (value === undefined) return { _type: "undefined" };
    if (value === null) return null;
    if (typeof value === "string") {
      return value.length > CONFIG.MAX_STRING_LENGTH
        ? value.slice(0, CONFIG.MAX_STRING_LENGTH) + "..."
        : value;
    }
    if (typeof value === "number") {
      if (Number.isNaN(value)) return { _type: "NaN" };
      if (!Number.isFinite(value))
        return { _type: value > 0 ? "Infinity" : "-Infinity" };
      return value;
    }
    if (typeof value === "boolean") return value;
    if (typeof value === "bigint")
      return { _type: "BigInt", value: value.toString() };
    if (typeof value === "symbol")
      return { _type: "Symbol", value: value.toString() };
    if (typeof value === "function") {
      return {
        _type: "Function",
        name: value.name || "anonymous",
        stringValue: value.toString().slice(0, 100),
      };
    }

    if (value && typeof value === "object") {
      if (seen.has(value)) return { _type: "Circular", ref: seen.get(value) };
      seen.set(value, "ref_" + depth);
    }

    if (value instanceof Error) {
      return {
        _type: "Error",
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (value instanceof Date) {
      return { _type: "Date", iso: value.toISOString() };
    }

    if (value instanceof RegExp) {
      return { _type: "RegExp", source: value.source, flags: value.flags };
    }

    if (Array.isArray(value)) {
      return value
        .slice(0, 100)
        .map((item) => serializeValue(item, depth + 1, seen));
    }

    if (value && typeof value === "object") {
      const result = {};
      const keys = Object.keys(value).slice(0, 100);
      keys.forEach((key) => {
        try {
          result[key] = serializeValue(value[key], depth + 1, seen);
        } catch (err) {
          result[key] = { _type: "Error", message: "Failed to serialize" };
        }
      });
      return result;
    }

    return value;
  }

  // ===== Runtime Error Tracking =====
  function setupErrorTracking() {
    const errorCache = new Set();
    const getCacheKey = (msg, file, line, col) =>
      `${msg}|${file}|${line}|${col}`;

    window.addEventListener(
      "error",
      (event) => {
        // Check if this is a resource loading error (script, img, link, etc.)
        if (event.target && event.target !== window) {
          const element = event.target;
          const tagName = element.tagName?.toLowerCase();
          const src = element.src || element.href;

          const cacheKey = `resource|${tagName}|${src}`;
          if (errorCache.has(cacheKey)) return;
          errorCache.add(cacheKey);
          setTimeout(() => errorCache.delete(cacheKey), 5000);

          postToParent({
            type: "RESOURCE_LOAD_ERROR",
            data: {
              message: `Failed to load ${tagName}: ${src}`,
              tagName,
              src,
              blankScreen: isBlankScreen(),
            },
          });
          return;
        }

        // Regular runtime error
        const cacheKey = getCacheKey(
          event.message,
          event.filename,
          event.lineno,
          event.colno
        );

        if (errorCache.has(cacheKey)) return;
        errorCache.add(cacheKey);
        setTimeout(() => errorCache.delete(cacheKey), 5000);

        postToParent({
          type: "RUNTIME_ERROR",
          data: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
            blankScreen: isBlankScreen(),
          },
        });
      },
      true
    ); // Use capture phase to catch resource errors

    window.addEventListener("unhandledrejection", (event) => {
      const stack = event.reason?.stack || String(event.reason);
      if (errorCache.has(stack)) return;
      errorCache.add(stack);
      setTimeout(() => errorCache.delete(stack), 5000);

      postToParent({
        type: "UNHANDLED_PROMISE_REJECTION",
        data: {
          message: event.reason?.message || "Unhandled promise rejection",
          stack: event.reason?.stack || String(event.reason),
        },
      });
    });
  }

  // ===== Network Monitoring =====
  function setupNetworkMonitoring() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const startTime = Date.now();
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
      const method = args[1]?.method || "GET";

      let requestBody;
      if (args[1]?.body) {
        try {
          if (typeof args[1].body === "string") {
            requestBody = args[1].body;
          } else if (args[1].body instanceof FormData) {
            requestBody =
              "FormData: " +
              Array.from(args[1].body.entries())
                .map(([k, v]) => `${k}=${v}`)
                .join("&");
          } else if (args[1].body instanceof URLSearchParams) {
            requestBody = args[1].body.toString();
          } else {
            requestBody = JSON.stringify(args[1].body);
          }
        } catch {
          requestBody = "Could not serialize request body";
        }
      }

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        let responseBody;
        try {
          if (response.clone) {
            responseBody = await response.clone().text();
          }
        } catch (err) {
          responseBody = "[Clone failed]";
        }

        postToParent({
          type: "NETWORK_REQUEST",
          data: {
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            requestBody,
            responseBody: responseBody?.slice(0, CONFIG.MAX_STRING_LENGTH),
            duration,
            timestamp: new Date().toISOString(),
          },
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        postToParent({
          type: "NETWORK_REQUEST",
          data: {
            url,
            method,
            requestBody,
            duration,
            timestamp: new Date().toISOString(),
            error: {
              message: error?.message || "Unknown error",
              stack: error?.stack,
            },
          },
        });

        throw error;
      }
    };
  }

  // ===== Console Output Capture =====
  function setupConsoleCapture() {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    const consoleBuffer = [];
    let consoleFlushTimer = null;

    const levelMap = {
      log: "info",
      warn: "warning",
      error: "error",
    };

    function flushConsoleBuffer() {
      if (consoleBuffer.length === 0) {
        consoleFlushTimer = null;
        return;
      }

      const messages = [...consoleBuffer];
      consoleBuffer.length = 0;
      consoleFlushTimer = null;

      postToParent({
        type: "CONSOLE_OUTPUT",
        data: { messages },
      });
    }

    // Format console arguments, handling format specifiers like %s, %o, %d
    function formatConsoleArgs(args) {
      if (args.length === 0) return "";

      const firstArg = args[0];

      // If first arg is a string with format specifiers, apply substitutions
      if (typeof firstArg === "string" && /%[sodifc%]/.test(firstArg)) {
        let formatted = firstArg;
        let argIndex = 1;

        formatted = formatted.replace(/%([sodifc%])/g, (match, specifier) => {
          if (specifier === "%") return "%";
          if (argIndex >= args.length) return match;

          const arg = args[argIndex++];
          switch (specifier) {
            case "s":
              return String(arg);
            case "o":
            case "O":
              if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}`;
              }
              return typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);
            case "d":
            case "i":
              return parseInt(arg, 10);
            case "f":
              return parseFloat(arg);
            case "c":
              return ""; // CSS styling - ignore
            default:
              return String(arg);
          }
        });

        // Append any remaining arguments
        const remaining = args.slice(argIndex);
        if (remaining.length > 0) {
          const remainingStr = remaining
            .map((arg) => {
              if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
              if (typeof arg === "object") return JSON.stringify(arg, null, 2);
              return String(arg);
            })
            .join(" ");
          formatted += " " + remainingStr;
        }

        return formatted;
      }

      // No format specifiers - just join all args
      return args
        .map((arg) => {
          if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
          if (typeof arg === "string") return arg;
          if (typeof arg === "object") return JSON.stringify(arg, null, 2);
          return String(arg);
        })
        .join(" ");
    }

    // Detect React/framework errors from console.error calls
    function detectFrameworkError(args) {
      if (args.length === 0) return null;

      // Build full message from all args for pattern matching
      const fullMessage = formatConsoleArgs(args);

      // Find any Error object in arguments
      let errorObj = null;
      for (const arg of args) {
        if (arg instanceof Error) {
          errorObj = arg;
          break;
        }
      }

      // React error patterns
      const isReactError =
        fullMessage.includes("The above error occurred") ||
        fullMessage.includes("React will try to recreate") ||
        fullMessage.includes("Error boundary") ||
        fullMessage.includes("Minified React error") ||
        fullMessage.includes("caught an error");

      // TanStack Router patterns
      const isTanStackRouterError =
        (errorObj && errorObj.stack && errorObj.stack.includes("@tanstack/react-router")) ||
        fullMessage.includes("CatchBoundaryImpl");

      // TanStack Query patterns
      const isTanStackQueryError =
        fullMessage.includes("Query") ||
        fullMessage.includes("Mutation") ||
        (errorObj && errorObj.stack && errorObj.stack.includes("@tanstack/react-query"));

      if (isReactError || isTanStackRouterError || isTanStackQueryError) {
        return {
          error: errorObj,
          message: errorObj?.message || fullMessage,
          stack: errorObj?.stack,
          source: isTanStackRouterError
            ? "tanstack-router"
            : isTanStackQueryError
            ? "tanstack-query"
            : "react",
        };
      }

      return null;
    }

    ["log", "warn", "error"].forEach((level) => {
      console[level] = (...args) => {
        // Call original console method
        originalConsole[level].apply(console, args);

        // For console.error, check if this is a framework-caught error
        if (level === "error") {
          const frameworkError = detectFrameworkError(args);
          if (frameworkError) {
            postToParent({
              type: "RUNTIME_ERROR",
              data: {
                message: frameworkError.message,
                stack: frameworkError.stack,
                source: frameworkError.source,
                blankScreen: isBlankScreen(),
                caughtBy: "framework",
              },
            });
          }
        }

        // Serialize arguments
        const serialized = args.map((arg) => serializeValue(arg));
        const messageText = formatConsoleArgs(args).slice(0, CONFIG.MAX_STRING_LENGTH);

        consoleBuffer.push({
          level: levelMap[level],
          message: messageText,
          logged_at: new Date().toISOString(),
          raw: serialized,
        });

        // Debounce flush
        if (consoleFlushTimer === null) {
          consoleFlushTimer = setTimeout(
            flushConsoleBuffer,
            CONFIG.DEBOUNCE_DELAY
          );
        }
      };
    });
  }

  // ===== URL Change Tracking =====
  function setupNavigationTracking() {
    let currentUrl = document.location.href;

    const observer = new MutationObserver(() => {
      if (currentUrl !== document.location.href) {
        currentUrl = document.location.href;
        postToParent({
          type: "URL_CHANGED",
          data: { url: currentUrl },
        });
      }
    });

    const body = document.querySelector("body");
    if (body) {
      observer.observe(body, {
        childList: true,
        subtree: true,
      });
    }
  }

  // ===== Content Load Detection =====
  function checkContentLoaded() {
    const root = document.querySelector(
      '#root, [id*="root"], [class*="root"], body > div:first-child'
    );
    const rootElementExists = !!root;
    const rootHasChildren = root ? root.childElementCount > 0 : false;

    // Check if HMR is complete (Vite-specific)
    const hmrComplete =
      !window.__vite_plugin_react_preamble_installed__ ||
      (window.import &&
        window.import.meta &&
        !window.import.meta.hot?.data?.pending);

    // Check if React is ready (look for React root or hydration)
    const reactReady =
      rootHasChildren &&
      (!!root?.querySelector("[data-reactroot], [data-react-helmet]") ||
        root?.textContent?.trim().length > 0);

    const hasContent =
      rootElementExists && rootHasChildren && hmrComplete && reactReady;

    return {
      hasContent,
      rootElementExists,
      rootHasChildren,
      hmrComplete,
      reactReady,
    };
  }

  function setupContentDetection() {
    let lastContentState = checkContentLoaded();
    let contentLoadNotified = false;

    // Check immediately
    const initialState = checkContentLoaded();
    if (initialState.hasContent && !contentLoadNotified) {
      postToParent({
        type: "CONTENT_LOADED",
        data: initialState,
      });
      contentLoadNotified = true;
    }

    // Watch for content changes
    const observer = new MutationObserver(() => {
      const currentState = checkContentLoaded();

      // Notify when content becomes available
      if (currentState.hasContent && !contentLoadNotified) {
        postToParent({
          type: "CONTENT_LOADED",
          data: currentState,
        });
        contentLoadNotified = true;
      }

      // Also notify if content disappears (blank screen)
      if (!currentState.hasContent && lastContentState.hasContent) {
        postToParent({
          type: "BLANK_SCREEN_DETECTED",
          data: currentState,
        });
        contentLoadNotified = false;
      }

      lastContentState = currentState;
    });

    // Observe the entire document for changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    // Also check after a short delay for HMR scenarios
    setTimeout(() => {
      const state = checkContentLoaded();
      if (state.hasContent && !contentLoadNotified) {
        postToParent({
          type: "CONTENT_LOADED",
          data: state,
        });
        contentLoadNotified = true;
      }
    }, 1000);

    // Check periodically during first 10 seconds (for slow HMR)
    let checkCount = 0;
    const periodicCheck = setInterval(() => {
      checkCount++;
      const state = checkContentLoaded();

      // If content is loaded and we haven't notified yet, send event and stop
      if (state.hasContent && !contentLoadNotified) {
        postToParent({
          type: "CONTENT_LOADED",
          data: state,
        });
        contentLoadNotified = true;
        clearInterval(periodicCheck);
        return;
      }

      // If we've already notified (from mutation observer or timeout), stop checking
      if (contentLoadNotified) {
        clearInterval(periodicCheck);
        return;
      }

      // Stop after 10 seconds (20 checks × 500ms)
      if (checkCount >= 20) {
        clearInterval(periodicCheck);
      }
    }, 500);
  }

  // ===== VISUAL EDITOR =====
  let visualEditorState = {
    enabled: false,
    selectedElement: null,
    highlightOverlay: null,
    hoverOverlay: null,
    hoverOverlays: [],
    selectionOverlays: [],
  };

  // Create overlay elements for visual editing
  function createVisualEditorOverlays() {
    // Hover overlay (blue outline when hovering)
    visualEditorState.hoverOverlay = document.createElement("div");
    visualEditorState.hoverOverlay.id = "shipper-visual-editor-hover";
    visualEditorState.hoverOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px dashed ${CONFIG.HIGHLIGHT_COLOR};
      background: transparent;
      z-index: 999999;
      transition: all 0.1s ease;
      display: none;
    `;
    document.body.appendChild(visualEditorState.hoverOverlay);

    // Selection overlay (solid blue when selected)
    visualEditorState.highlightOverlay = document.createElement("div");
    visualEditorState.highlightOverlay.id = "shipper-visual-editor-selection";
    visualEditorState.highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid ${CONFIG.HIGHLIGHT_COLOR};
      background: transparent;
      z-index: 999998;
      display: none;
    `;
    document.body.appendChild(visualEditorState.highlightOverlay);
  }

  // Get element position
  function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }

  // Update overlay position
  function updateOverlay(overlay, element) {
    const pos = getElementPosition(element);
    overlay.style.left = pos.x + "px";
    overlay.style.top = pos.y + "px";
    overlay.style.width = pos.width + "px";
    overlay.style.height = pos.height + "px";
    overlay.style.display = "block";
  }

  // Generate CSS selector for element
  function getSelector(element) {
    if (element.id) return "#" + element.id;

    const path = [];
    let current = element;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === "string") {
        const classes = current.className
          .trim()
          .split(/\s+/)
          .filter((c) => c);
        const validClasses = classes.filter((c) => !/[\[\]#]/.test(c));
        if (validClasses.length > 0) {
          selector += "." + validClasses.slice(0, 3).join(".");
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(" > ");
  }

  // Generate XPath for element
  function getXPath(element) {
    if (element.id) return `//*[@id="${element.id}"]`;

    const parts = [];
    let current = element;
    while (current && current !== document.body) {
      let index = 0;
      let sibling = current.previousSibling;
      while (sibling) {
        if (sibling.nodeType === 1 && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      const tagName = current.tagName.toLowerCase();
      parts.unshift(`${tagName}[${index + 1}]`);
      current = current.parentElement;
    }
    return "/" + parts.join("/");
  }

  // Extract Tailwind classes
  function getTailwindClasses(element) {
    if (!element.className || typeof element.className !== "string") return [];

    const classes = element.className
      .trim()
      .split(/\s+/)
      .filter((c) => c);
    // Basic heuristic: Tailwind classes often have patterns like bg-, text-, flex-, etc.
    return classes.filter(
      (c) =>
        /^(bg|text|font|border|rounded|p|m|w|h|flex|grid|gap|space|shadow|opacity|transition|hover|focus|active|disabled|cursor|overflow|absolute|relative|fixed|sticky|z|top|bottom|left|right|inset|transform|scale|rotate|translate|skew|origin)-/.test(
          c
        ) || /^(sm|md|lg|xl|2xl):/.test(c)
    );
  }

  // Get computed styles (serializable)
  function getComputedStyles(element) {
    const computed = window.getComputedStyle(element);
    const styles = {};
    const importantProps = [
      "backgroundColor",
      "color",
      "borderRadius",
      "opacity",
      "padding",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "margin",
      "marginTop",
      "marginRight",
      "marginBottom",
      "marginLeft",
      "width",
      "height",
      "display",
      "position",
      "fontSize",
      "fontWeight",
      "border",
      "borderWidth",
      "borderColor",
      "borderStyle",
    ];

    importantProps.forEach((prop) => {
      styles[prop] = computed[prop];
    });

    return styles;
  }

  // Get inline styles
  function getInlineStyles(element) {
    const styles = {};
    if (element.style && element.style.length > 0) {
      for (let i = 0; i < element.style.length; i++) {
        const prop = element.style[i];
        styles[prop] = element.style[prop];
      }
    }
    return styles;
  }

  // Check if element has direct text content (not just from children)
  function hasDirectTextContent(element) {
    // Check if element has text nodes that are direct children
    const directTextNodes = Array.from(element.childNodes).filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
    );
    return directTextNodes.length > 0;
  }

  // Extract element info
  function getElementInfo(element) {
    const attributes = {};
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    // Check if this element is repeated (multiple elements with same shipper ID)
    const shipperId = element.getAttribute("data-shipper-id") || null;
    let isRepeated = false;
    let instanceIndex = 0;
    let totalInstances = 1;

    if (shipperId) {
      const elementsWithSameId = document.querySelectorAll(
        `[data-shipper-id="${shipperId}"]`
      );
      totalInstances = elementsWithSameId.length;
      isRepeated = totalInstances > 1;

      if (isRepeated) {
        // Find the index of this specific element instance
        instanceIndex = Array.from(elementsWithSameId).indexOf(element);
      }
    }

    return {
      selector: getSelector(element),
      xpath: getXPath(element),
      shipperId: shipperId,
      componentName:
        element.dataset?.component || element.tagName.toLowerCase(),
      currentStyles: {
        computed: getComputedStyles(element),
        tailwindClasses: getTailwindClasses(element),
        inlineStyles: getInlineStyles(element),
      },
      position: getElementPosition(element),
      textContent: element.textContent?.slice(0, 100),
      hasDirectText: hasDirectTextContent(element),
      isRepeated: isRepeated,
      instanceIndex: instanceIndex,
      totalInstances: totalInstances,
      attributes,
    };
  }

  // Create additional overlay for multi-element highlighting
  function createAdditionalOverlay(type) {
    const overlay = document.createElement("div");
    overlay.className = `shipper-visual-editor-${type}`;
    if (type === "hover") {
      overlay.style.cssText = `
        position: absolute;
        pointer-events: none;
        border: 2px dashed ${CONFIG.HIGHLIGHT_COLOR};
        background: transparent;
        z-index: 999999;
        transition: all 0.1s ease;
        display: none;
      `;
    } else {
      overlay.style.cssText = `
        position: absolute;
        pointer-events: none;
        border: 2px solid ${CONFIG.HIGHLIGHT_COLOR};
        background: transparent;
        z-index: 999998;
        display: none;
      `;
    }
    document.body.appendChild(overlay);
    return overlay;
  }

  // Clear all overlays of a specific type
  function clearOverlays(overlays) {
    overlays.forEach((overlay) => {
      overlay.style.display = "none";
    });
  }

  // Update overlays for all elements with the same shipper ID
  function updateOverlaysForShipperId(shipperId, type) {
    const elements = document.querySelectorAll(
      `[data-shipper-id="${shipperId}"]`
    );
    const overlays =
      type === "hover"
        ? visualEditorState.hoverOverlays
        : visualEditorState.selectionOverlays;

    // Clear existing overlays
    clearOverlays(overlays);

    // Ensure we have enough overlays
    const elementsArray = Array.from(elements);
    while (overlays.length < elementsArray.length) {
      overlays.push(createAdditionalOverlay(type));
    }

    // Update each overlay to match each element
    elementsArray.forEach((element, index) => {
      updateOverlay(overlays[index], element);
    });
  }

  // Handle element hover
  function handleVisualEditorMouseMove(event) {
    if (!visualEditorState.enabled) return;

    const target = event.target;
    if (
      target === visualEditorState.hoverOverlay ||
      target === visualEditorState.highlightOverlay
    )
      return;

    // Skip overlays and visual editor elements
    const className =
      typeof target.className === "string"
        ? target.className
        : target.className?.baseVal || "";
    if (
      target.id?.startsWith("shipper-visual-editor") ||
      className.includes("shipper-visual-editor")
    )
      return;

    const shipperId = target.getAttribute("data-shipper-id");

    if (shipperId) {
      // Hide the single hover overlay
      visualEditorState.hoverOverlay.style.display = "none";
      // Show overlays for all elements with this shipper ID
      updateOverlaysForShipperId(shipperId, "hover");
    } else {
      // No shipper ID, use single overlay
      clearOverlays(visualEditorState.hoverOverlays);
      updateOverlay(visualEditorState.hoverOverlay, target);
    }
  }

  // Handle element click
  function handleVisualEditorClick(event) {
    if (!visualEditorState.enabled) return;

    event.preventDefault();
    event.stopPropagation();

    const target = event.target;
    if (
      target === visualEditorState.hoverOverlay ||
      target === visualEditorState.highlightOverlay
    )
      return;
    const clickClassName =
      typeof target.className === "string"
        ? target.className
        : target.className?.baseVal || "";
    if (
      target.id?.startsWith("shipper-visual-editor") ||
      clickClassName.includes("shipper-visual-editor")
    )
      return;

    visualEditorState.selectedElement = target;

    const shipperId = target.getAttribute("data-shipper-id");

    if (shipperId) {
      // Hide the single selection overlay
      visualEditorState.highlightOverlay.style.display = "none";
      // Show selection overlays for all elements with this shipper ID
      updateOverlaysForShipperId(shipperId, "selection");
    } else {
      // No shipper ID, use single overlay
      clearOverlays(visualEditorState.selectionOverlays);
      updateOverlay(visualEditorState.highlightOverlay, target);
    }

    // Send element info to parent
    const elementInfo = getElementInfo(target);
    postToParent({
      type: "ELEMENT_SELECTED",
      payload: elementInfo,
    });
  }

  // Apply style changes
  function applyVisualEditorStyle(styleUpdate) {
    const { selector, shipperId, changes } = styleUpdate;

    // Prefer using data-shipper-id for more reliable element selection
    let elements = [];
    if (shipperId) {
      // Use querySelectorAll to get ALL elements with this shipper ID (for repeated elements)
      elements = Array.from(
        document.querySelectorAll(`[data-shipper-id="${shipperId}"]`)
      );
    }

    // Fallback to selector if shipperId is not available
    if (elements.length === 0 && selector) {
      const element = document.querySelector(selector);
      if (element) elements = [element];
    }

    if (elements.length === 0) {
      console.warn(
        "Element(s) not found for shipperId:",
        shipperId,
        "or selector:",
        selector
      );
      return;
    }

    // Apply style changes to all matching elements
    elements.forEach((element) => {
      Object.entries(changes).forEach(([prop, value]) => {
        element.style[prop] = value;
      });
    });

    // Update highlight if one of the elements is the selected element
    if (elements.includes(visualEditorState.selectedElement)) {
      updateOverlay(
        visualEditorState.highlightOverlay,
        visualEditorState.selectedElement
      );
    }
  }

  // Apply text content changes
  function applyVisualEditorTextContent(textUpdate) {
    const { selector, shipperId, textContent } = textUpdate;

    // Text content should only update a single element, not multiple instances
    // Use querySelector (not querySelectorAll) to get only the first match
    let element = null;

    if (shipperId) {
      // Get only the first element with this shipper ID
      element = document.querySelector(`[data-shipper-id="${shipperId}"]`);
    }

    // Fallback to selector if shipperId is not available or element not found
    if (!element && selector) {
      element = document.querySelector(selector);
    }

    if (!element) {
      console.warn(
        "Element not found for shipperId:",
        shipperId,
        "or selector:",
        selector
      );
      return;
    }

    // Check if this element is repeated (multiple instances exist)
    const allInstances = shipperId
      ? document.querySelectorAll(`[data-shipper-id="${shipperId}"]`)
      : [element];

    if (allInstances.length > 1) {
      console.warn(
        "[Shipper Visual Editor] Text editing blocked: element is repeated",
        {
          shipperId,
          instanceCount: allInstances.length,
        }
      );
      return;
    }

    // Apply text content to the single element
    // Try to find the direct text node to preserve other child elements
    const textNodes = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE
    );

    if (textNodes.length > 0) {
      // Update the first text node
      textNodes[0].textContent = textContent;
    } else {
      // No text nodes found, set textContent directly (will replace all children)
      element.textContent = textContent;
    }

    console.log("[Shipper Visual Editor] Text content updated:", {
      shipperId,
      selector,
      textContent,
    });
  }

  // Enable visual editing mode
  function enableVisualEditor() {
    if (visualEditorState.enabled) return;

    visualEditorState.enabled = true;

    // Clear any existing shipper highlights
    clearShipperHighlights();

    // Create overlays if they don't exist
    if (!visualEditorState.hoverOverlay) {
      createVisualEditorOverlays();
    }

    // Add event listeners
    document.addEventListener("mousemove", handleVisualEditorMouseMove);
    document.addEventListener("click", handleVisualEditorClick, true);

    // Notify parent that visual editor is ready
    postToParent({
      type: "VISUAL_EDIT_READY",
      data: { url: window.location.href },
    });

    console.log("[Shipper Visual Editor] Enabled");
  }

  // Disable visual editing mode
  function disableVisualEditor() {
    if (!visualEditorState.enabled) return;

    visualEditorState.enabled = false;

    // Hide overlays
    if (visualEditorState.hoverOverlay) {
      visualEditorState.hoverOverlay.style.display = "none";
    }
    if (visualEditorState.highlightOverlay) {
      visualEditorState.highlightOverlay.style.display = "none";
    }

    // Hide all additional overlays
    clearOverlays(visualEditorState.hoverOverlays);
    clearOverlays(visualEditorState.selectionOverlays);

    // Remove event listeners
    document.removeEventListener("mousemove", handleVisualEditorMouseMove);
    document.removeEventListener("click", handleVisualEditorClick, true);

    visualEditorState.selectedElement = null;

    console.log("[Shipper Visual Editor] Disabled");
  }

  // Listen for visual editor and source location commands from parent
  window.addEventListener("message", (event) => {
    const { type, payload } = event.data;

    // Only process visual editor and source location messages
    if (
      type === "ENABLE_VISUAL_EDIT" ||
      type === "DISABLE_VISUAL_EDIT" ||
      type === "APPLY_STYLE" ||
      type === "APPLY_TEXT" ||
      type === "SELECT_PARENT" ||
      type === "ENABLE_SOURCE_DISPLAY" ||
      type === "DISABLE_SOURCE_DISPLAY" ||
      type === "ENABLE_HOVER_HIGHLIGHT" ||
      type === "DISABLE_HOVER_HIGHLIGHT"
    ) {
      console.log(
        "[Shipper] Received message:",
        type,
        "from origin:",
        event.origin
      );

      // Validate origin (allow localhost for development)
      const isLocalhost =
        event.origin.startsWith("http://localhost") ||
        event.origin.startsWith("https://localhost");
      const isAllowed =
        CONFIG.ALLOWED_ORIGINS.includes(event.origin) || isLocalhost;

      if (!isAllowed) {
        console.warn(
          "[Shipper] Message blocked from unauthorized origin:",
          event.origin
        );
        return;
      }

      if (type === "ENABLE_VISUAL_EDIT") {
        enableVisualEditor();
      } else if (type === "DISABLE_VISUAL_EDIT") {
        disableVisualEditor();
      } else if (type === "APPLY_STYLE") {
        applyVisualEditorStyle(payload);
      } else if (type === "APPLY_TEXT") {
        applyVisualEditorTextContent(payload);
      } else if (type === "SELECT_PARENT") {
        selectParentElement();
      } else if (type === "ENABLE_SOURCE_DISPLAY") {
        enableSourceLocationDisplay();
      } else if (type === "DISABLE_SOURCE_DISPLAY") {
        disableSourceLocationDisplay();
      } else if (type === "ENABLE_HOVER_HIGHLIGHT") {
        enableShipperHighlighting();
      } else if (type === "DISABLE_HOVER_HIGHLIGHT") {
        disableShipperHighlighting();
      }
    }
  });

  // ===== Source Location Display & Highlighting =====
  let sourceLocationState = {
    enabled: false,
    badges: new Map(),
    highlightedElements: new Set(),
    currentShipperId: null,
    highlightingEnabled: false,
  };

  // Create a badge element for showing source location
  function createSourceBadge(element, sourceLocation) {
    const badge = document.createElement("div");
    badge.className = "shipper-source-badge";
    badge.textContent = sourceLocation;
    badge.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      font-family: monospace;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      pointer-events: none;
      z-index: 999997;
      white-space: nowrap;
      transition: opacity 0.2s ease;
      opacity: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    document.body.appendChild(badge);
    return badge;
  }

  // Position badge relative to element
  function positionBadge(badge, element) {
    const rect = element.getBoundingClientRect();
    badge.style.left = rect.left + window.scrollX + "px";
    badge.style.top = rect.top + window.scrollY - 20 + "px";
  }

  // Show all source location badges
  function showSourceBadges() {
    const elements = document.querySelectorAll("[data-shipper-id]");

    elements.forEach((element) => {
      const shipperId = element.getAttribute("data-shipper-id");
      if (!shipperId) return;

      const badge = createSourceBadge(element, shipperId);
      sourceLocationState.badges.set(element, badge);
      positionBadge(badge, element);

      // Fade in
      setTimeout(() => {
        badge.style.opacity = "1";
      }, 10);
    });

    // Update badge positions on scroll/resize
    window.addEventListener("scroll", updateBadgePositions, { passive: true });
    window.addEventListener("resize", updateBadgePositions);
  }

  // Update all badge positions
  function updateBadgePositions() {
    sourceLocationState.badges.forEach((badge, element) => {
      positionBadge(badge, element);
    });
  }

  // Hide all source location badges
  function hideSourceBadges() {
    sourceLocationState.badges.forEach((badge) => {
      badge.remove();
    });
    sourceLocationState.badges.clear();

    window.removeEventListener("scroll", updateBadgePositions);
    window.removeEventListener("resize", updateBadgePositions);
  }

  // Highlight elements with the same shipper ID
  function highlightElementsByShipperId(shipperId) {
    // Clear previous highlights
    clearShipperHighlights();

    if (!shipperId) return;

    sourceLocationState.currentShipperId = shipperId;
    const elements = document.querySelectorAll(
      `[data-shipper-id="${shipperId}"]`
    );

    elements.forEach((element) => {
      sourceLocationState.highlightedElements.add(element);
      element.style.outline = "2px solid rgba(59, 130, 246, 0.8)";
      element.style.outlineOffset = "2px";
      element.style.transition = "outline 0.2s ease";
    });
  }

  // Clear shipper ID highlights
  function clearShipperHighlights() {
    sourceLocationState.highlightedElements.forEach((element) => {
      element.style.outline = "";
      element.style.outlineOffset = "";
    });
    sourceLocationState.highlightedElements.clear();
    sourceLocationState.currentShipperId = null;
  }

  // Setup hover listeners for shipper ID highlighting
  function setupShipperHighlighting() {
    document.addEventListener("mouseover", (event) => {
      // Don't highlight if visual editor is enabled or highlighting is disabled
      if (visualEditorState.enabled || !sourceLocationState.highlightingEnabled)
        return;

      const target = event.target;
      const shipperId = target.getAttribute("data-shipper-id");

      if (shipperId && shipperId !== sourceLocationState.currentShipperId) {
        highlightElementsByShipperId(shipperId);
      }
    });

    document.addEventListener("mouseout", (event) => {
      // Don't clear highlights if visual editor is enabled or highlighting is disabled
      if (visualEditorState.enabled || !sourceLocationState.highlightingEnabled)
        return;

      const target = event.target;
      const shipperId = target.getAttribute("data-shipper-id");

      if (shipperId) {
        // Small delay to prevent flickering when moving between elements
        setTimeout(() => {
          // Only clear if we're not hovering another element with a shipper ID
          const hoveredElement = document.elementFromPoint(
            event.clientX,
            event.clientY
          );
          if (!hoveredElement?.hasAttribute("data-shipper-id")) {
            clearShipperHighlights();
          }
        }, 50);
      }
    });
  }

  // Enable source location display
  function enableSourceLocationDisplay() {
    if (sourceLocationState.enabled) return;
    sourceLocationState.enabled = true;
    showSourceBadges();
    console.log("[Shipper] Source location display enabled");
  }

  // Disable source location display
  function disableSourceLocationDisplay() {
    if (!sourceLocationState.enabled) return;
    sourceLocationState.enabled = false;
    hideSourceBadges();
    console.log("[Shipper] Source location display disabled");
  }

  // Enable shipper ID highlighting on hover
  function enableShipperHighlighting() {
    if (sourceLocationState.highlightingEnabled) return;
    sourceLocationState.highlightingEnabled = true;
    console.log("[Shipper] Hover highlighting enabled");
  }

  // Disable shipper ID highlighting on hover
  function disableShipperHighlighting() {
    if (!sourceLocationState.highlightingEnabled) return;
    sourceLocationState.highlightingEnabled = false;
    clearShipperHighlights();
    console.log("[Shipper] Hover highlighting disabled");
  }

  // ===== HMR Connection Monitoring =====
  function setupHMRMonitoring() {
    // Listen for HMR connection events by intercepting WebSocket
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function (...args) {
      const ws = new originalWebSocket(...args);
      const url = args[0];

      // Check if this is a Vite HMR WebSocket
      if (url && (url.includes("/@vite/client") || url.includes("vite-hmr"))) {
        console.log("[Shipper Monitor] HMR WebSocket connecting to:", url);

        ws.addEventListener("open", () => {
          console.log("[Shipper Monitor] HMR WebSocket connected");
          postToParent({
            type: "HMR_CONNECTED",
            data: {
              url,
              timestamp: new Date().toISOString(),
            },
          });
        });

        ws.addEventListener("close", (event) => {
          console.log(
            "[Shipper Monitor] HMR WebSocket closed:",
            event.code,
            event.reason
          );
          postToParent({
            type: "HMR_DISCONNECTED",
            data: {
              url,
              code: event.code,
              reason: event.reason,
              timestamp: new Date().toISOString(),
            },
          });
        });

        ws.addEventListener("error", (event) => {
          console.error("[Shipper Monitor] HMR WebSocket error:", event);
          postToParent({
            type: "HMR_ERROR",
            data: {
              url,
              error: event.message || "WebSocket connection failed",
              timestamp: new Date().toISOString(),
            },
          });
        });

        ws.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "update") {
              console.log("[Shipper Monitor] HMR update received:", data);
              postToParent({
                type: "HMR_UPDATE",
                data: {
                  updates: data.updates,
                  timestamp: new Date().toISOString(),
                },
              });
            }
          } catch (err) {
            // Ignore parse errors for non-JSON messages
          }
        });
      }

      return ws;
    };
  }

  // ===== Keyboard Shortcuts =====
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      // Ctrl+Shift+S or Cmd+Shift+S to toggle source location display
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "S"
      ) {
        event.preventDefault();
        if (sourceLocationState.enabled) {
          disableSourceLocationDisplay();
        } else {
          enableSourceLocationDisplay();
        }
      }
    });
  }

  // Select the parent of the currently selected element
  function selectParentElement() {
    if (!visualEditorState.selectedElement) return;

    const parent = visualEditorState.selectedElement.parentElement;

    // Don't select body or html elements
    if (
      !parent ||
      parent === document.body ||
      parent === document.documentElement
    ) {
      console.log("[Shipper Visual Editor] Already at top-level element");
      return;
    }

    // Update selected element
    visualEditorState.selectedElement = parent;

    const shipperId = parent.getAttribute("data-shipper-id");

    if (shipperId) {
      // Hide the single selection overlay
      visualEditorState.highlightOverlay.style.display = "none";
      // Show selection overlays for all elements with this shipper ID
      updateOverlaysForShipperId(shipperId, "selection");
    } else {
      // No shipper ID, use single overlay
      clearOverlays(visualEditorState.selectionOverlays);
      updateOverlay(visualEditorState.highlightOverlay, parent);
    }

    // Send element info to parent
    const elementInfo = getElementInfo(parent);
    postToParent({
      type: "ELEMENT_SELECTED",
      payload: elementInfo,
    });

    console.log("[Shipper Visual Editor] Parent element selected");
  }

  // ===== Initialize All Monitoring =====
  function init() {
    setupErrorTracking();
    setupNetworkMonitoring();
    setupConsoleCapture();
    setupNavigationTracking();
    setupContentDetection();
    setupHMRMonitoring();
    setupShipperHighlighting();
    setupKeyboardShortcuts();

    // Notify parent that monitoring is active
    postToParent({
      type: "MONITOR_INITIALIZED",
      data: { url: window.location.href },
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
