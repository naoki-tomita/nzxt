"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Error = exports.Document = void 0;
const h_1 = require("./h");
const Document = (_, children) => {
    return ((0, h_1.h)("html", { lang: "en" },
        (0, h_1.h)("head", null,
            (0, h_1.h)("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
            (0, h_1.h)("title", null, "Document")),
        (0, h_1.h)("body", null, children)));
};
exports.Document = Document;
const Error = ({ error }) => {
    return ((0, h_1.h)("div", null,
        (0, h_1.h)("h1", null, "An error occured"),
        (0, h_1.h)("code", null, error.stack)));
};
exports.Error = Error;
//# sourceMappingURL=DefaultComponents.js.map