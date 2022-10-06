import { Component, h } from "../h"

const Document: Component = (_, children) => {
  return (
    <div>
      <span>document template</span>
      {children}
    </div>
  );
}

export default Document;