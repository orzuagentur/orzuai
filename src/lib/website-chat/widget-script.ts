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

  var visitorId = localStorage.getItem("orzu_chat_visitor");
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("orzu_chat_visitor", visitorId);
  }

  function apiUrl(path) {
    return "${apiBase}/" + encodeURIComponent(token) + path;
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function mount(config) {
    var open = false;
    var isTop = config.position.indexOf("top") === 0;
    var messageIds = {};
    var lastCreatedAt = null;
    var unreadCount = 0;
    var pollTimer = null;
    var isSending = false;

    var root = document.createElement("div");
    root.id = "orzu-chat-root";
    root.style.cssText = "position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:12px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" + (positions[config.position] || positions.bottom_right);
    document.body.appendChild(root);

    var panel = document.createElement("div");
    panel.style.cssText = "display:none;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 96px);border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(15,23,42,.22);background:#fff;flex-direction:column;border:1px solid rgba(148,163,184,.25);";

    var header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;color:#fff;flex-shrink:0;";
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
    messages.style.cssText = "flex:1;overflow:auto;padding:16px;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);min-height:0;";
    panel.appendChild(messages);

    var loading = document.createElement("div");
    loading.style.cssText = "padding:24px;text-align:center;font-size:13px;color:#64748b;";
    loading.textContent = "Loading conversation…";
    messages.appendChild(loading);

    var composer = document.createElement("div");
    composer.style.cssText = "border-top:1px solid #e2e8f0;background:#fff;padding:12px 14px 14px;flex-shrink:0;";

    var form = document.createElement("form");
    form.style.cssText = "display:flex;align-items:flex-end;gap:10px;";

    var inputWrap = document.createElement("div");
    inputWrap.style.cssText = "flex:1;min-width:0;";

    var input = document.createElement("textarea");
    input.rows = 1;
    input.placeholder = "Write your message…";
    input.setAttribute("aria-label", "Message");
    input.style.cssText = "display:block;width:100%;min-height:44px;max-height:120px;resize:none;border:1px solid #cbd5e1;border-radius:14px;padding:11px 14px;font-size:14px;line-height:1.45;outline:none;box-sizing:border-box;background:#fff;color:#0f172a;";
    inputWrap.appendChild(input);

    var send = document.createElement("button");
    send.type = "submit";
    send.setAttribute("aria-label", "Send message");
    send.style.cssText = "border:none;border-radius:14px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;flex-shrink:0;";
    send.style.background = config.primaryColor;
    send.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

    form.appendChild(inputWrap);
    form.appendChild(send);
    composer.appendChild(form);
    panel.appendChild(composer);

    var btnWrap = document.createElement("div");
    btnWrap.style.cssText = "position:relative;display:inline-flex;";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Open chat");
    btn.style.cssText = "width:60px;height:60px;border-radius:9999px;border:none;cursor:pointer;box-shadow:0 16px 40px rgba(15,23,42,.24);color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .15s ease;";
    btn.style.background = config.primaryColor;
    btn.innerHTML = icons[config.launcherIcon] || icons.message;
  btn.querySelector("svg").style.width = "26px";
    btn.querySelector("svg").style.height = "26px";

    var badge = document.createElement("span");
    badge.style.cssText = "display:none;position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 6px;border-radius:9999px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;line-height:20px;text-align:center;box-shadow:0 0 0 2px #fff;";
    btnWrap.appendChild(btn);
    btnWrap.appendChild(badge);

    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    function updateBadge() {
      if (open || unreadCount <= 0) {
        badge.style.display = "none";
        return;
      }
      badge.style.display = "block";
      badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    }

    function renderMessage(msg, mine) {
      var wrap = document.createElement("div");
      wrap.dataset.messageId = msg.id;
      wrap.style.cssText = "margin:10px 0;display:flex;flex-direction:column;" + (mine ? "align-items:flex-end;" : "align-items:flex-start;");

      var bubble = document.createElement("div");
      bubble.style.cssText = "max-width:86%;white-space:pre-wrap;font-size:14px;line-height:1.5;padding:11px 14px;border-radius:18px;box-shadow:0 1px 2px rgba(15,23,42,.06);word-break:break-word;" +
        (mine ? "border-bottom-right-radius:6px;color:#fff;" : "border:1px solid #e2e8f0;background:#fff;border-bottom-left-radius:6px;color:#0f172a;");
      if (mine) bubble.style.background = config.primaryColor;
      bubble.textContent = msg.content;

      var time = document.createElement("div");
      time.style.cssText = "margin-top:4px;font-size:11px;color:#94a3b8;padding:0 4px;";
      time.textContent = formatTime(msg.createdAt);

      wrap.appendChild(bubble);
      wrap.appendChild(time);
      messages.appendChild(wrap);
      return wrap;
    }

    function addMessage(msg, options) {
      options = options || {};
      if (messageIds[msg.id]) return null;
      messageIds[msg.id] = true;
      if (msg.createdAt && (!lastCreatedAt || msg.createdAt > lastCreatedAt)) {
        lastCreatedAt = msg.createdAt;
      }
      var mine = msg.senderType === "client";
      var node = renderMessage(msg, mine);
      if (!open && !mine && !options.suppressUnread) {
        unreadCount += 1;
        updateBadge();
      }
      if (options.scroll !== false) scrollToBottom();
      return node;
    }

    function showWelcomeIfEmpty() {
      if (messages.childElementCount > 0) return;
      addMessage({
        id: "__welcome__",
        content: config.welcomeMessage,
        senderType: "ai",
        createdAt: new Date().toISOString()
      }, { suppressUnread: true });
    }

    function clearLoading() {
      if (loading.parentNode) loading.parentNode.removeChild(loading);
    }

    function loadHistory() {
      return fetch(apiUrl("/messages?visitorId=" + encodeURIComponent(visitorId)), { headers: authHeaders })
        .then(function(r){ return r.json(); })
        .then(function(data){
          clearLoading();
          if (!data || !data.success || !Array.isArray(data.messages)) {
            showWelcomeIfEmpty();
            return;
          }
          if (data.messages.length === 0) {
            showWelcomeIfEmpty();
            return;
          }
          data.messages.forEach(function(msg){ addMessage(msg, { scroll: false, suppressUnread: true }); });
          scrollToBottom();
        })
        .catch(function(){
          clearLoading();
          showWelcomeIfEmpty();
        });
    }

    function pollMessages() {
      var query = "/messages?visitorId=" + encodeURIComponent(visitorId);
      if (lastCreatedAt) query += "&after=" + encodeURIComponent(lastCreatedAt);
      fetch(apiUrl(query), { headers: authHeaders })
        .then(function(r){ return r.json(); })
        .then(function(data){
          if (!data || !data.success || !Array.isArray(data.messages)) return;
          data.messages.forEach(function(msg){ addMessage(msg); });
        })
        .catch(function(){});
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(pollMessages, 3000);
    }

    function stopPolling() {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    }

    function setOpen(next) {
      open = next;
      panel.style.display = open ? "flex" : "none";
      btn.style.transform = open ? "scale(0.96)" : "scale(1)";
      if (open) {
        unreadCount = 0;
        updateBadge();
        input.focus();
        scrollToBottom();
        startPolling();
      }
    }

    input.addEventListener("input", function(){
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });

    input.addEventListener("keydown", function(e){
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var text = input.value.trim();
      if (!text || isSending) return;
      isSending = true;
      send.disabled = true;
      input.value = "";
      input.style.height = "44px";

      var tempId = "local-" + Date.now();
      addMessage({ id: tempId, content: text, senderType: "client", createdAt: new Date().toISOString() });

      fetch(apiUrl(""), {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, authHeaders),
        body: JSON.stringify({ visitorId: visitorId, message: text })
      })
        .then(function(r){ return r.json(); })
        .then(function(data){
          if (data && data.success && data.message) {
            delete messageIds[tempId];
            var tempNode = messages.querySelector('[data-message-id="' + tempId + '"]');
            if (tempNode) tempNode.parentNode.removeChild(tempNode);
            addMessage(data.message);
            setTimeout(pollMessages, 1200);
          } else {
            addMessage({
              id: "err-" + Date.now(),
              content: "Could not send. Please try again.",
              senderType: "ai",
              createdAt: new Date().toISOString()
            });
          }
        })
        .catch(function(){
          addMessage({
            id: "err-" + Date.now(),
            content: "Could not send. Please check your connection.",
            senderType: "ai",
            createdAt: new Date().toISOString()
          });
        })
        .finally(function(){
          isSending = false;
          send.disabled = false;
        });
    });

    if (isTop) {
      root.appendChild(btnWrap);
      root.appendChild(panel);
    } else {
      root.appendChild(panel);
      root.appendChild(btnWrap);
    }

    btn.addEventListener("click", function(){ setOpen(!open); });
    closeBtn.addEventListener("click", function(){ setOpen(false); });

    loadHistory().finally(startPolling);
    document.addEventListener("visibilitychange", function(){
      if (document.visibilityState === "visible") pollMessages();
    });
  }

  fetch(apiUrl(""), { headers: authHeaders })
    .then(function(r){ return r.json(); })
    .then(function(data){
      var config = Object.assign({}, defaults, data && data.config ? data.config : {});
      mount(config);
    })
    .catch(function(){ mount(defaults); });
})();`;
}
