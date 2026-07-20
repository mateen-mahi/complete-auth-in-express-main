// src/utils/chatHelpers.js
//
// Pure helper functions used across the chat feature. Nothing in here
// touches React state — these just transform data — which is what makes
// them safe to import anywhere without worrying about side effects.

export const DELETED_TEXT = "This message was deleted";

export const formatTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

export const formatDay = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Turns a flat message array into a list of { type: "message" | "separator" }
 * items, inserting a day-separator row every time the day changes.
 */
export function groupByDay(messages) {
  const groups = [];
  let lastDay = null;
  messages.forEach((msg) => {
    const day = formatDay(msg.timestamp);
    if (day !== lastDay) {
      groups.push({ type: "separator", label: day, key: `sep-${msg.id || msg.timestamp}` });
      lastDay = day;
    }
    groups.push({ type: "message", data: msg, key: msg.id });
  });
  return groups;
}

/**
 * Returns { text, timestamp, isOwn } for whatever should show as a
 * contact's message preview in the sidebar — preferring the live-loaded
 * conversation (if that contact's history has been opened) and falling
 * back to the lightweight preview data that came from the initial
 * /messages/conversations fetch (for contacts never opened yet).
 */
export function getLastMessagePreview(contact, conversations, currentUserId) {
  const loadedMessages = conversations[contact._id];
  if (loadedMessages && loadedMessages.length > 0) {
    const last = loadedMessages[loadedMessages.length - 1];
    return { text: last.text, timestamp: last.timestamp, isOwn: last.senderId === currentUserId };
  }
  if (contact.lastMessageText) {
    return { text: contact.lastMessageText, timestamp: contact.lastMessageAt, isOwn: contact.lastMessageIsOwn };
  }
  return null;
}

/**
 * Sorts contacts by most recent activity, newest first — used to order
 * the sidebar's conversation list.
 */
export function sortContactsByRecency(contacts, conversations, currentUserId) {
  return Object.values(contacts).sort((a, b) => {
    const aPreview = getLastMessagePreview(a, conversations, currentUserId);
    const bPreview = getLastMessagePreview(b, conversations, currentUserId);
    const aTime = aPreview ? new Date(aPreview.timestamp).getTime() : 0;
    const bTime = bPreview ? new Date(bPreview.timestamp).getTime() : 0;
    return bTime - aTime;
  });
}
