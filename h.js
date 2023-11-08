"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsrStyle = exports.h = void 0;
const zheleznaya_1 = require("zheleznaya");
Object.defineProperty(exports, "h", { enumerable: true, get: function () { return zheleznaya_1.h; } });
const SsrStyle = () => {
    return (0, zheleznaya_1.h)("style", { "data-zstyl": "" }, `___SSR_STYLE_REPLACER___`);
};
exports.SsrStyle = SsrStyle;
//# sourceMappingURL=h.js.map