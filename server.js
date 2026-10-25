const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const app = express();

app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

// Open the database beside this server file.
const db = new DatabaseSync(path.join(__dirname, "comments.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    body TEXT NOT NULL
  )
`);

console.log("Comments database ready.");

// Encode values for display in HTML text contexts.
function escapeHtml(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return value.replace(/[&<>"']/g, (character) => {
    return replacements[character];
  });
}

// HOME PAGE
app.get("/", (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>XSS Learning Demo</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <h1>Client-Side Scripting: XSS Variants and Protection</h1>

        <p>
          Explore how untrusted input can become executable code,
          and how to display it safely.
        </p>

        <ul>
          <li>
            <a href="/reflected">Reflected XSS — Search page</a>
          </li>
          <li>
            <a href="/stored">Stored XSS — Comment board</a>
          </li>
          <li>
            <a href="/dom">DOM-based XSS — Greeting page</a>
          </li>
        </ul>


      </body>
    </html>
  `);
});

// REFLECTED XSS
app.get("/reflected", (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const protectedMode = req.query.mode === "protected";

  // Protection: encode before inserting into HTML text.
  const output = protectedMode ? escapeHtml(query) : query;

  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Reflected XSS — Search</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <a href="/">Home</a>
        <h1>Reflected XSS: Search</h1>
        <p>Mode: ${protectedMode ? "protected" : "vulnerable"}</p>

        <form action="/reflected" method="get">
          <label for="search">Search term:</label>
          <input
            id="search"
            name="q"
            type="text"
            value="${escapeHtml(query)}"
          >

          <label for="mode">Mode:</label>
          <select id="mode" name="mode">
            <option
              value="vulnerable"
              ${protectedMode ? "" : "selected"}
            >
              Vulnerable
            </option>
            <option
              value="protected"
              ${protectedMode ? "selected" : ""}
            >
              Protected
            </option>
          </select>

          <button type="submit">Search</button>
        </form>

        <p id="status">No demonstration code has executed.</p>

        <h2>Submitted payload — displayed safely as text</h2>
        <pre>${escapeHtml(query)}</pre>

        <h2>${protectedMode ? "Protected" : "Vulnerable"} output</h2>
        <div>${output}</div>
      </body>
    </html>
  `);
});

// STORED XSS: DISPLAY COMMENTS
app.get("/stored", (req, res) => {
  const protectedMode = req.query.mode === "protected";

  const comments = db.prepare(
    "SELECT id, body FROM comments ORDER BY id DESC"
  ).all();

  const commentItems = comments.map((comment) => {
    // The stored value stays unchanged; encode when displaying it.
    const output = protectedMode
      ? escapeHtml(comment.body)
      : comment.body;

    return `
      <li>
        <p>Saved payload — displayed safely as text:</p>
        <pre>${escapeHtml(comment.body)}</pre>

        <p>${protectedMode ? "Protected" : "Vulnerable"} output:</p>
        <div>${output}</div>
      </li>
    `;
  }).join("");

  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Stored XSS — Comments</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <a href="/">Home</a>
        <h1>Stored XSS: Comment board</h1>
        <p>Mode: ${protectedMode ? "protected" : "vulnerable"}</p>

        <nav>
          <a href="/stored?mode=vulnerable">View vulnerable mode</a>
          |
          <a href="/stored?mode=protected">View protected mode</a>
        </nav>

        <form action="/stored" method="post">
          <label for="comment">Comment:</label>
          <textarea
            id="comment"
            name="body"
            rows="4"
            cols="50"
            maxlength="2000"
            required
          ></textarea>

          <input
            type="hidden"
            name="mode"
            value="${protectedMode ? "protected" : "vulnerable"}"
          >

          <button type="submit">Save comment</button>
        </form>

        <p id="status">No demonstration code has executed.</p>

        <h2>Saved comments</h2>
        <ul>${commentItems || "<li>No comments yet.</li>"}</ul>
      </body>
    </html>
  `);
});

// STORED XSS: SAVE A COMMENT
app.post("/stored", (req, res) => {
  const body = typeof req.body?.body === "string"
    ? req.body.body.trim()
    : "";

  if (!body || body.length > 2000) {
    return res.status(400).send(
      "Enter a comment of 1–2000 characters."
    );
  }

  // A placeholder keeps comment data separate from SQL instructions.
  db.prepare(
    "INSERT INTO comments (body) VALUES (?)"
  ).run(body);

  const mode = req.body.mode === "protected"
    ? "protected"
    : "vulnerable";

  res.redirect(303, "/stored?mode=" + mode);
});

// DOM-BASED XSS
app.get("/dom", (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>DOM-based XSS — Greeting</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <a href="/">Home</a>
        <h1>DOM-based XSS: Greeting</h1>
        <p id="mode-label"></p>
        <p>Put your greeting after # in the URL.</p>

        <p id="status">No demonstration code has executed.</p>

        <h2>Fragment input — displayed safely as text</h2>
        <pre id="payload"></pre>

        <h2>Greeting output</h2>
        <div id="greeting"></div>

        <script>
          function showGreeting() {
            const status = document.getElementById("status");
            const payload = document.getElementById("payload");
            const greeting = document.getElementById("greeting");

            const protectedMode =
              new URLSearchParams(location.search).get("mode")
              !== "vulnerable";

            document.getElementById("mode-label").textContent =
              protectedMode ? "Mode: protected" : "Mode: vulnerable";

            status.textContent =
              "No demonstration code has executed.";

            payload.textContent = "";
            greeting.textContent = "";

            let input;

            try {
              input = decodeURIComponent(location.hash.slice(1));
            } catch {
              status.textContent =
                "The fragment contains invalid URL encoding.";
              return;
            }

            // Always display the example payload safely.
            payload.textContent = input;

            if (protectedMode) {
              // Protection: insert text without parsing HTML.
              greeting.textContent = input;
            } else {
              // Deliberately vulnerable: parse untrusted input as HTML.
              greeting.innerHTML = input;
            }
          }

          window.addEventListener("hashchange", showGreeting);
          showGreeting();
        </script>
      </body>
    </html>
  `);
});

// Accept connections only from this laptop.
app.listen(8000, "127.0.0.1", () => {
  console.log("Open http://127.0.0.1:8000");
  console.log("Press Control+C to stop.");
});