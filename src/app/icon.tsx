import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The logo is black linework on a transparent background, so it disappears
// against a dark browser/OS theme — bake a white badge behind it, same fix
// as the in-app <Logo>, since favicons can't react to prefers-color-scheme
// reliably across browsers.
export default function Icon() {
  const logoBuffer = readFileSync(join(process.cwd(), "public", "logo-mosquee.png"));
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderRadius: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoBase64} width={52} height={20.8} alt="" />
      </div>
    ),
    { ...size },
  );
}
