const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2d6a5a"/>
  <path d="M18 42h28v5H18zM22 18h20v5H22zM22 29h20v5H22z" fill="#fff"/>
  <path d="M18 23h5v19h-5zM41 23h5v19h-5z" fill="#d8e1de"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
