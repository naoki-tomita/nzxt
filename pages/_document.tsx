import { Component, h, SsrStyle } from "../h"

const Document: Component = (_, children) => {
  return (
    <div>
      <SsrStyle />
      <span>document template</span>
      {children}
    </div>
  );
}

export default Document;
