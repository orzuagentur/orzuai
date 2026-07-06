import { NextResponse } from "next/server";

import { buildAppUrl } from "@/lib/app-url";

export async function GET() {
  const apiBase = buildAppUrl("/api/widget/chat");

  const script = `(function(){
  var script = document.currentScript;
  var token = script && script.getAttribute("data-widget-token");
  var siteKey = script && script.getAttribute("data-site-key");
  if (!token || !siteKey) return;

  var authHeaders = { "X-OrzuAI-Api-Key": siteKey };

  var visitorId = localStorage.getItem("orzu_chat_visitor");
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("orzu_chat_visitor", visitorId);
  }

  var config = { welcomeMessage: "Hi! How can we help?", primaryColor: "#6366f1" };
  var open = false;

  fetch("${apiBase}/" + encodeURIComponent(token), { headers: authHeaders })
    .then(function(r){ return r.json(); })
    .then(function(data){ if (data && data.config) config = data.config; })
    .catch(function(){});

  var root = document.createElement("div");
  root.id = "orzu-chat-root";
  root.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:system-ui,sans-serif;";
  document.body.appendChild(root);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.style.cssText = "width:56px;height:56px;border-radius:9999px;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18);color:#fff;font-size:22px;";
  btn.style.background = config.primaryColor;
  btn.textContent = "💬";
  root.appendChild(btn);

  var panel = document.createElement("div");
  panel.style.cssText = "display:none;width:320px;max-width:calc(100vw - 32px);height:420px;max-height:calc(100vh - 100px);margin-bottom:12px;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.2);background:#fff;flex-direction:column;";
  root.insertBefore(panel, btn);

  var header = document.createElement("div");
  header.style.cssText = "padding:14px 16px;color:#fff;font-weight:600;font-size:14px;";
  header.style.background = config.primaryColor;
  header.textContent = "Chat with us";
  panel.appendChild(header);

  var messages = document.createElement("div");
  messages.style.cssText = "flex:1;overflow:auto;padding:12px;background:#f8fafc;font-size:13px;line-height:1.45;";
  panel.appendChild(messages);

  var form = document.createElement("form");
  form.style.cssText = "display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff;";
  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type a message…";
  input.style.cssText = "flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:13px;";
  var send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Send";
  send.style.cssText = "border:none;border-radius:8px;padding:8px 12px;background:" + config.primaryColor + ";color:#fff;font-size:13px;cursor:pointer;";
  form.appendChild(input);
  form.appendChild(send);
  panel.appendChild(form);

  function appendBubble(text, mine) {
    var bubble = document.createElement("div");
    bubble.style.cssText = "margin:6px 0;padding:8px 10px;border-radius:10px;max-width:85%;white-space:pre-wrap;" +
      (mine ? "margin-left:auto;background:" + config.primaryColor + ";color:#fff;" : "background:#fff;border:1px solid #e2e8f0;");
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  appendBubble(config.welcomeMessage, false);

  btn.addEventListener("click", function(){
    open = !open;
    panel.style.display = open ? "flex" : "none";
    if (open) input.focus();
  });

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
})();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
