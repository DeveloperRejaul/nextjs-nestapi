import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>nextjs-nestapi example</h1>
        <p>Try the API:</p>
        <ul>
          <li>
            <a href="/api-docs">/api-docs</a> — Swagger UI
          </li>
          <li>
            <a href="/api/openapi.json">/api/openapi.json</a> — raw OpenAPI document
          </li>
          <li>
            <a href="/api/hello">/api/hello</a> — GET (list)
          </li>
          <li>
            <a href="/api/hello/42">/api/hello/42</a> — GET (by id)
          </li>
        </ul>
        <p>
          <code>POST /api/hello</code> with a JSON body{" "}
          <code>{"{ name: string, age: number }"}</code> to see DTO validation.
        </p>
      </main>
    </div>
  );
}
