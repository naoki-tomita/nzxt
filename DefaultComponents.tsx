import { Component, h } from "./h";

export const Document: Component = (_, children) => {
  return (
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
    </head>
    <body>
      {children}
    </body>
    </html>
  );
}

export const Error: Component<{ error: Error }> = ({ error }) => {
  return (
    <div>
      <h1>An error occured</h1>
      <code>{error.stack}</code>
    </div>
  );
}