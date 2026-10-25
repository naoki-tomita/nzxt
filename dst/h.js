"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsrStyle = exports.h = void 0;
exports.useStore = useStore;
const zheleznaya_1 = require("zheleznaya");
Object.defineProperty(exports, "h", { enumerable: true, get: function () { return zheleznaya_1.h; } });
const SsrStyle = () => {
    return (0, zheleznaya_1.h)("style", { "data-zstyl": "" }, "___SSR_STYLE_REPLACER___");
};
exports.SsrStyle = SsrStyle;
function useStore(initialValue) {
    const root = globalThis.__nzxtRoot__;
    // server side rendering
    if (!root) {
        return initialValue;
    }
    const store = root.getStore();
    // already initialized
    if (store.__on__) {
        return store;
    }
    return root.createStore(initialValue);
}
//# sourceMappingURL=h.js.map