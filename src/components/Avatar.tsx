function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string | null | undefined;
  avatarDataUrl: string | null | undefined;
  size?: number;
}

// Shows the user's uploaded photo when set, otherwise a colored circle with
// their initials — used both in Settings (large) and the header (small).
export function Avatar({ name, avatarDataUrl, size = 32 }: AvatarProps) {
  if (avatarDataUrl) {
    return (
      <img
        src={avatarDataUrl}
        alt={name ?? "Profile photo"}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(11, Math.round(size * 0.4)),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
