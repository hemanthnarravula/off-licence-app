export default function Home() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
        margin: "4rem auto",
        padding: "0 1.5rem",
        lineHeight: 1.5,
      }}
    >
      <h1>Off-licence API</h1>
      <p>Next.js API for the multi-store Expo app.</p>
      <ul>
        <li>
          <a href="/api/health">GET /api/health</a>
        </li>
        <li>
          <a href="/api/products/by-barcode?barcode=5012345678900">
            GET /api/products/by-barcode?barcode=5012345678900
          </a>
        </li>
        <li>
          <code>POST /api/auth/sign-up/email</code> /{" "}
          <code>POST /api/auth/sign-in/email</code>
        </li>
      </ul>
    </main>
  );
}
