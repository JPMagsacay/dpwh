<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{{ config('app.name', 'Laravel') }}</title>
        <style>
            :root {
                color-scheme: light dark;
                --bg: #0b0c10;
                --card: rgba(255, 255, 255, 0.06);
                --border: rgba(255, 255, 255, 0.14);
                --text: rgba(255, 255, 255, 0.86);
                --muted: rgba(255, 255, 255, 0.68);
                --accent: #c084fc;
            }
            @media (prefers-color-scheme: light) {
                :root {
                    --bg: #f7f7fb;
                    --card: rgba(10, 10, 20, 0.04);
                    --border: rgba(10, 10, 20, 0.12);
                    --text: rgba(10, 10, 20, 0.9);
                    --muted: rgba(10, 10, 20, 0.64);
                }
            }
            body {
                margin: 0;
                font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                background: var(--bg);
                color: var(--text);
            }
            .wrap {
                min-height: 100svh;
                display: grid;
                place-items: center;
                padding: 28px 16px;
                box-sizing: border-box;
            }
            .card {
                width: min(820px, 100%);
                border: 1px solid var(--border);
                border-radius: 16px;
                background: var(--card);
                padding: 20px;
                box-sizing: border-box;
            }
            h1 {
                margin: 0 0 8px;
                font-size: 28px;
                letter-spacing: -0.4px;
            }
            p {
                margin: 0;
                color: var(--muted);
                line-height: 1.45;
            }
            .grid {
                margin-top: 14px;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }
            a {
                display: block;
                text-decoration: none;
                border: 1px solid var(--border);
                border-radius: 14px;
                padding: 14px;
                color: var(--text);
                background: rgba(0, 0, 0, 0.06);
            }
            a:hover {
                border-color: rgba(192, 132, 252, 0.55);
                box-shadow: 0 10px 18px rgba(0, 0, 0, 0.18);
            }
            .label {
                font-weight: 700;
            }
            .hint {
                margin-top: 6px;
                font-size: 13px;
                color: var(--muted);
            }
            code {
                font-family: ui-monospace, Consolas, monospace;
                background: rgba(192, 132, 252, 0.12);
                border: 1px solid rgba(192, 132, 252, 0.25);
                padding: 2px 6px;
                border-radius: 8px;
            }
            @media (max-width: 720px) {
                .grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="wrap">
            <div class="card">
                <h1>Backend is running</h1>
                <p>
                    This is the Laravel backend for the Services Profiling system.
                    Use the frontend app for the UI.
                </p>

                <div class="grid">
                    <a href="http://127.0.0.1:5174/" target="_blank" rel="noreferrer">
                        <div class="label">Open Frontend UI</div>
                        <div class="hint">Vite dev server (update port if needed)</div>
                    </a>
                    <a href="/up" target="_blank" rel="noreferrer">
                        <div class="label">Health check</div>
                        <div class="hint">Returns 200 if backend is OK</div>
                    </a>
                </div>

                <p style="margin-top: 14px">
                    API base: <code>{{ url('/api') }}</code>
                </p>
            </div>
        </div>
    </body>
</html>

