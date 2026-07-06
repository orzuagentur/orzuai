export function buildWebsiteChatWidgetScript(apiBase: string): string {
  return `(function(){
  var script = document.currentScript;
  var token = script && script.getAttribute("data-widget-token");
  var siteKey = script && script.getAttribute("data-site-key");
  if (!token || !siteKey) return;

  var authHeaders = { "X-OrzuAI-Api-Key": siteKey };
  var defaults = {
    welcomeMessage: "Hi! How can we help you today?",
    primaryColor: "#6366f1",
    widgetTitle: "Chat with us",
    launcherIcon: "message",
    position: "bottom_right"
  };

  var icons = {
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>',
    headset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm18 0h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5Z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>'
  };

  var positions = {
    bottom_right: "bottom:24px;right:24px;align-items:flex-end;",
    bottom_left: "bottom:24px;left:24px;align-items:flex-start;",
    top_right: "top:24px;right:24px;align-items:flex-end;",
    top_left: "top:24px;left:24px;align-items:flex-start;"
  };

  function mount(config) {
    var open = false;
    var isTop = config.position.indexOf("top") === 0;
    var root = document.createElement("div");
    root.id = "orzu-chat-root";
    root.style.cssText = "position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:12px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" + (positions[config.position] || positions.bottom_right);
    document.body.appendChild(root);

    var panel = document.createElement("div");
    panel.style.cssText = "display:none;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(15,23,42,.22);background:#fff;flex-direction:column;border:1px solid rgba(148,163,184,.25);";

    var header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;color:#fff;";
    header.style.background = config.primaryColor;

    var headerLeft = document.createElement("div");
    headerLeft.style.cssText = "display:flex;min-width:0;align-items:center;gap:10px;";
    var statusDot = document.createElement("span");
    statusDot.style.cssText = "width:8px;height:8px;border-radius:9999px;background:#86efac;flex-shrink:0;";
    var title = document.createElement("div");
    title.style.cssText = "font-size:15px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    title.textContent = config.widgetTitle;
    headerLeft.appendChild(statusDot);
    headerLeft.appendChild(title);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.style.cssText = "border:none;background:rgba(255,255,255,.16);color:#fff;width:32px;height:32px;border-radius:9999px;cursor:pointer;font-size:18px;line-height:1;";
    closeBtn.innerHTML = "&times;";

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var messages = document.createElement("div");
    messages.style.cssText = "flex:1;overflow:auto;padding:16px;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);";
    panel.appendChild(messages);

    var form = document.createElement("form");
    form.style.cssText = "display:flex;gap:10px;padding:14px 16px;border-top:1px solid #e2e8f0;background:#fff;";
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type a message…";
    input.style.cssText = "flex:1;border:1px solid #cbd5e1;border-radius:9999px;padding:11px 16px;font-size:14px;outline:none;";
    var send = document.createElement("button");
    send.type = "submit";
    send.setAttribute("aria-label", "Send message");
    send.style.cssText = "border:none;border-radius:9999px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;flex-shrink:0;";
    send.style.background = config.primaryColor;
    send.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
    form.appendChild(input);
    form.appendChild(send);
    panel.appendChild(form);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Open chat");
    btn.style.cssText = "width:60px;height:60px;border-radius:9999px;border:none;cursor:pointer;box-shadow:0 16px 40px rgba(15,23,42,.24);color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .15s ease;";
    btn.style.background = config.primaryColor;
    btn.innerHTML = icons[config.launcherIcon] || icons.message;
    btn.querySelector("svg").style.width = "26px";
    btn.querySelector("svg").style.height = "26px";

    function appendBubble(text, mine) {
      var bubble = document.createElement("div");
      bubble.style.cssText = "margin:8px 0;padding:11px 14px;border-radius:18px;max-width:82%;white-space:pre-wrap;font-size:14px;line-height:1.45;box-shadow:0 1px 2px rgba(15,23,42,.06);" +
        (mine ? "margin-left:auto;border-bottom-right-radius:6px;color:#fff;" : "border:1px solid #e2e8f0;background:#fff;border-bottom-left-radius:6px;color:#0f172a;");
      if (mine) bubble.style.background = config.primaryColor;
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    appendBubble(config.welcomeMessage, false);

    function setOpen(next) {
      open = next;
      panel.style.display = open ? "flex" : "none";
      btn.style.transform = open ? "scale(0.96)" : "scale(1)";
      if (open) input.focus();
    }

    if (isTop) {
      root.appendChild(btn);
      root.appendChild(panel);
    } else {
      root.appendChild(panel);
      root.appendChild(btn);
    }

    btn.addEventListener("click", function(){ setOpen(!open); });
    closeBtn.addEventListener("click", function(){ setOpen(false); });

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      appendBubble(text, true);
      fetch("${apiBase}/" + encodeURIComponent(token), {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, authHeaders),
        body: JSON.stringify({ visitorId: visitorId, message: text })
      }).catch(function(){ appendBubble("Could not send. Try again.", false); });
    });
  }

  var visitorId = localStorage.getItem("orzu_chat_visitor");
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("orzu_chat_visitor", visitorId);
  }

  fetch("${apiBase}/" + encodeURIComponent(token), { headers: authHeaders })
    .then(function(r){ return r.json(); })
    .then(function(data){
      var config = Object.assign({}, defaults, data && data.config ? data.config : {});
      mount(config);
    })
    .catch(function(){ mount(defaults); });
})();`;
}
