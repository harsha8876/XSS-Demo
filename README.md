# Client-Side Scripting: XSS Variants and Protection

A local educational application built for a college presentation. It demonstrates three forms of cross-site scripting (XSS), explains their causes, and compares vulnerable and protected behavior using identical input.

## What is XSS?

Cross-site scripting occurs when an application lets untrusted input become executable content in a visitor’s browser. Input that should be displayed as text is instead interpreted as markup containing JavaScript.

In this project, demonstration payloads only change a visible status message to **“XSS executed.”** Some also display a harmless label to show that the browser interpreted injected markup.

Displaying an injected label demonstrates HTML injection. The JavaScript-driven status change demonstrates XSS execution.

## Technology

- **HTML:** page structure, forms, links, and output areas.
- **CSS:** a responsive grayscale design with system fonts and readable payload displays.
- **JavaScript:** Express server logic and browser-side DOM manipulation.
- **Node.js and Express:** handling requests and returning pages.
- **SQLite:** saving comments between visits and server restarts.

The application uses Node.js’s built-in `node:sqlite` module. With the development version used for this project, Node.js 22.17.1, SQLite support produces an experimental-feature warning.

Express requires an initial package installation. After dependencies are installed, the application runs without an internet connection.

## Project files

```text
xss-demo/
├── server.js          # Server, routes, HTML, and database operations
├── style.css          # Shared presentation styles
├── comments.db        # SQLite database, created automatically
├── package.json       # Project details and dependencies
├── package-lock.json  # Recorded dependency versions
└── node_modules/      # Installed dependencies
```

## Demonstration pages

| Page | Address | Input source | Protection |
|---|---|---|---|
| Home | `/` | None | Links to the demonstrations |
| Reflected XSS | `/reflected` | Search parameter | HTML output encoding |
| Stored XSS | `/stored` | Saved comments | HTML output encoding |
| DOM-based XSS | `/dom` | URL fragment | `textContent` |

The server listens at **http://127.0.0.1:8000**, binding only to `127.0.0.1`. It accepts connections from the same laptop.

## 1. Reflected XSS: search page

The search form sends its input as the URL parameter `q`. Express reads the parameter and includes it in the current HTML response.

```text
Search input → URL parameter → server response → browser
```

### Vulnerable behavior

The server inserts the original search value directly into an HTML display element. If that value contains markup with an executable event handler, the browser interprets it as page content and can run its JavaScript.

It is called reflected XSS because the current request’s input is immediately returned in the response. The application does not need to save the input.

### Protection

The server calls `escapeHtml(query)` before inserting the search value into HTML text. Special characters are represented using HTML character references, such as `&lt;` for `<`.

The browser displays the payload as text instead of creating the injected elements. The status message remains unchanged.

The search page’s mode selector lets the presenter compare both behaviors with the same input.

## 2. Stored XSS: comment board

The comment form submits text to the server, which saves it in SQLite. Later requests read the saved comments and display them on the board.

```text
Comment input → SQLite database → later response → browser
```

### Vulnerable behavior

The server inserts saved comments directly into HTML. A saved payload can therefore execute when another visitor opens the board, even if that visitor never submits a comment.

A second browser tab demonstrates a later visit. Restarting the server demonstrates persistence: comments remain in `comments.db`.

SQLite stores the payload as text; it does not execute the JavaScript. Unsafe rendering causes execution in the browser.

### Protection

The application stores the original comment and calls `escapeHtml(comment.body)` when displaying it in protected mode.

Both modes read the same database records. The protection changes how the comments are rendered, rather than deleting or rewriting them.

SQL placeholders keep comment values separate from database instructions. That prevents SQL injection at the insertion step; HTML output encoding separately prevents XSS in the displayed comments.

## 3. DOM-based XSS: greeting page

The greeting page reads the URL fragment: the part after `#`. Browser JavaScript removes the `#`, decodes the value, and places the result into the greeting area.

```text
URL fragment → browser JavaScript → DOM update
```

The DOM, or Document Object Model, is the browser’s representation of the page as elements that JavaScript can inspect and modify.

The fragment is not included in the HTTP request to the server. The page’s browser-side code reads it after the page loads. A person can supply this input to another visitor by sharing a complete link containing the fragment.

### Vulnerable behavior

The page assigns the decoded input to `greeting.innerHTML`. This parses the input as HTML and creates elements from it.

The execution demonstration uses an image containing deliberately invalid inline image data. Its `onerror` event handler changes the status message. The image data does not require an external request, and a broken-image indicator is expected.

Inserting a `<script>` tag through `innerHTML` is not a reliable execution demonstration: such script elements do not execute in the usual way. Event-handler execution shows why this does not make `innerHTML` safe for untrusted input.

### Protection

Protected mode assigns the same input to `greeting.textContent`. On the ordinary display `<div>` used here, this inserts literal text without creating image elements or event handlers.

The `mode` query parameter selects the behavior:

- `/dom?mode=vulnerable#...` uses `innerHTML`.
- `/dom?mode=protected#...` uses `textContent`.

The fragment must stay identical for a fair comparison. URL decoding restores input characters; it is not a security protection.

## How the categories relate

Reflected and stored describe how input is delivered or retained. DOM-based describes unsafe processing by browser JavaScript.

These categories can overlap. For example, a saved comment later fetched by browser code and passed to `innerHTML` could be both stored and DOM-based XSS.

In this application, the reflected and stored vulnerabilities come from server-generated HTML. The DOM-based vulnerability comes from the browser’s `innerHTML` assignment.

## Protection principles

- Treat URL parameters, fragments, and saved comments as untrusted input.
- Encode values for the context where they are displayed. The project’s `escapeHtml` function fits its HTML text output; it is not a universal encoder for JavaScript, CSS, or URLs.
- Use `textContent` when placing untrusted plain text into an ordinary display element.
- Display payload examples safely in both demonstration modes.
- Keep database safety and browser output safety separate: SQL placeholders do not prevent XSS.

Content Security Policy (CSP) can provide an additional layer of protection, including restrictions on inline script execution. It complements safe rendering and is not configured in this version of the project.

