// src/components/chat/ChatAvatar.jsx
import { useState } from "react";

/**
 * Shows the real photo if present and loads correctly, otherwise falls
 * back to the first letter of the name. `className` should be one of the
 * existing sizing classes (chat-msg-avatar / dm-result-avatar /
 * dm-conv-avatar / dm-chat-avatar) so it inherits the right size/color.
 */
export function Avatar({ src, name, className }) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src) && !imgError;
  const initial = (name || "?")[0]?.toUpperCase() || "?";

  return showImage ? (
    <img
      src={src}
      alt={name}
      onError={() => setImgError(true)}
      className={`${className} chat-avatar-photo`}
    />
  ) : (
    <div className={className}>{initial}</div>
  );
}

/**
 * Wraps Avatar with an online/offline presence dot. Pass `online={undefined}`
 * (or omit the prop) to render no dot at all.
 */
export function AvatarWithPresence({ src, name, className, online }) {
  return (
    <div className="chat-avatar-presence-wrap">
      <Avatar src={src} name={name} className={className} />
      {online !== undefined && (
        <span className={`chat-presence-dot ${online ? "online" : "offline"}`} />
      )}
    </div>
  );
}
