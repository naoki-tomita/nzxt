// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../node_modules/zheleznaya/dist/Settable.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function wrap(obj) {
    if (typeof obj === "string" ||
        typeof obj === "number" ||
        typeof obj === "boolean") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return {
            __original__: obj,
            push: function () {
                var _a;
                var items = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    items[_i] = arguments[_i];
                }
                (_a = this.__original__).push.apply(_a, items);
                this.__emit__();
            },
            map: function (pred) {
                return this.__original__.map(pred);
            },
            __cb__: [],
            __on__: function (cb) {
                this.__cb__.push(cb);
            },
            __emit__: function () {
                this.__cb__.forEach(function (it) { return it(); });
            }
        };
    }
    var original = {};
    Object.keys(obj).forEach(function (key) {
        if (typeof obj[key] === "object") {
            original[key] = wrap(obj[key]);
            original[key].__on__(function () { return settable.__emit__(); });
        }
        else {
            original[key] = obj[key];
        }
    });
    var settable = {
        __original__: original,
        __on__: function (cb) {
            this.__cb__.push(cb);
        },
        __cb__: [],
        __emit__: function () {
            this.__cb__.forEach(function (it) { return it(); });
        }
    };
    Object.keys(obj).forEach(function (key) {
        Object.defineProperty(settable, key, {
            set: function (prop) {
                var _this = this;
                this.__original__[key] =
                    typeof prop === "object" && prop !== null
                        ? wrap(prop.__original__ || prop)
                        : prop;
                this.__original__[key].__on__ &&
                    this.__original__[key].__on__(function () { return _this.__emit__(); });
                this.__emit__();
            },
            get: function () {
                return this.__original__[key];
            }
        });
    });
    return settable;
}
exports.wrap = wrap;
//# sourceMappingURL=Settable.js.map
},{}],"../node_modules/zheleznaya/dist/Equals.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isEquals(left, right) {
    if (typeof left !== typeof right) {
        return false;
    }
    switch (typeof left) {
        case "object":
            if (left === null || right === null) {
                return left === right;
            }
            if (Array.isArray(left) && Array.isArray(right)) {
                return isArrayEquals(left, right);
            }
            return isObjectEquals(left, right);
        default:
            return left === right;
    }
}
exports.isEquals = isEquals;
/**
 * @param {Array<any>} left
 * @param {Array<any>} right
 */
function isArrayEquals(left, right) {
    if (left.length !== right.length) {
        return false;
    }
    return range(left.length).every(function (index) {
        return isEquals(left[index], right[index]);
    });
}
function isObjectEquals(left, right) {
    var _a = [
        Object.keys(left).sort(),
        Object.keys(right).sort()
    ], leftKeys = _a[0], rightKeys = _a[1];
    if (!isArrayEquals(leftKeys, rightKeys)) {
        return false;
    }
    return leftKeys.every(function (key) {
        return isEquals(left[key], right[key]);
    });
}
function range(size) {
    return Array(size)
        .fill(null)
        .map(function (_, i) { return i; });
}
exports.range = range;
//# sourceMappingURL=Equals.js.map
},{}],"../node_modules/zheleznaya/dist/index.js":[function(require,module,exports) {
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var Settable_1 = require("./Settable");
var Equals_1 = require("./Equals");
function h(name, attributes) {
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        children[_i - 2] = arguments[_i];
    }
    return typeof name === "string"
        ? { name: name, attributes: attributes, children: children, type: "html" }
        : function () { return name(attributes, children); };
}
exports.h = h;
var store = {};
function createStore(initialValue) {
    return (store = Settable_1.wrap(initialValue));
}
exports.createStore = createStore;
function getStore() {
    return store;
}
exports.getStore = getStore;
function renderChild(child) {
    if (typeof child === "function") {
        return renderElement(child());
    }
    else if (typeof child === "object") {
        if (Array.isArray(child)) {
            return {
                name: "ArrayNode",
                type: "array",
                attributes: {},
                children: child.map(function (item) { return renderChild(item); })
            };
        }
        return renderElement(child);
    }
    else {
        return {
            name: child.toString(),
            attributes: {},
            children: [],
            type: "text"
        };
    }
}
function renderElement(node) {
    if (typeof node === "function")
        node = node();
    return __assign(__assign({}, node), { children: (node.children || []).map(function (it) {
            return renderChild(it);
        }) });
}
var root;
function render(nodeElement) {
    rerender(nodeElement);
    store !== null && store !== void 0 ? store : store.__on__(function () { return rerender(nodeElement); });
}
exports.render = render;
function renderToText(nodeElement) {
    var nodes = renderElement(nodeElement);
    return renderVNodeToText(nodes);
}
exports.renderToText = renderToText;
function renderVNodeToText(vNode) {
    if (Array.isArray(vNode)) {
        return vNode.map(renderVNodeToText).join();
    }
    switch (vNode.type) {
        case "text":
            return vNode.name;
        case "html":
            return renderHtmlVNodeToText(vNode);
        case "array":
            return vNode.children.map(renderVNodeToText).join();
    }
}
function attributeToString(attr) {
    if (typeof attr == "string") {
        return attr;
    }
    return Object.keys(attr).map(function (key) { return key + "=" + attr[key] + ";"; }).join();
}
function renderHtmlVNodeToText(vNode) {
    return "\n    <" + vNode.name + " " + Object.keys(vNode.attributes || {}).map(function (key) { return key + "=\"" + attributeToString(vNode.attributes[key]) + "\""; }).join(" ") + ">\n      " + vNode.children.map(renderVNodeToText) + "\n    </" + vNode.name + ">";
}
var _oldNode;
function rerender(nodeElement) {
    var renderedNode = renderElement(nodeElement);
    var completedVNode = createRootElement(renderedNode);
    _oldNode = completedVNode;
    if (!root) {
        document.body.appendChild((root = completedVNode.element));
    }
}
function recycleTextElement(node) {
    return {
        name: node.name,
        attributes: {},
        children: [],
        type: "text",
        element: node.name
    };
}
function recycleArrayElement(node, oldNode, parentElement) {
    var _a;
    var elements = [];
    var renderedVNodes = [];
    // replace or remove child elements.
    if ((oldNode === null || oldNode === void 0 ? void 0 : oldNode.type) === "array") {
        (_a = oldNode === null || oldNode === void 0 ? void 0 : oldNode.element) === null || _a === void 0 ? void 0 : _a.forEach(function (it) {
            parentElement === null || parentElement === void 0 ? void 0 : parentElement.removeChild(it);
        });
    }
    else {
        (oldNode === null || oldNode === void 0 ? void 0 : oldNode.element) && (parentElement === null || parentElement === void 0 ? void 0 : parentElement.removeChild(oldNode === null || oldNode === void 0 ? void 0 : oldNode.element));
    }
    oldNode && (oldNode.children = []);
    node.children.forEach(function (it) {
        var child = createElement(it, undefined, parentElement);
        elements.push(child.element);
        renderedVNodes.push(child);
    });
    return {
        name: "ArrayNode",
        attributes: {},
        type: "array",
        children: renderedVNodes,
        element: elements
    };
}
function recycleNodeElement(node, oldNode, parentElement) {
    var _a;
    // standard node.
    // element
    var element;
    if ((oldNode === null || oldNode === void 0 ? void 0 : oldNode.element) != null) {
        element = oldNode.element;
        // replace or remove child elements.
        if (!Equals_1.isEquals(node.name, oldNode.name)) {
            var newElement = document.createElement(node.name);
            if (oldNode.type === "array") {
                (_a = oldNode === null || oldNode === void 0 ? void 0 : oldNode.element) === null || _a === void 0 ? void 0 : _a.forEach(function (it) { return parentElement === null || parentElement === void 0 ? void 0 : parentElement.removeChild(it); });
                parentElement === null || parentElement === void 0 ? void 0 : parentElement.append(newElement);
            }
            else {
                parentElement === null || parentElement === void 0 ? void 0 : parentElement.replaceChild(newElement, oldNode.element);
            }
            oldNode.children = [];
            element = newElement;
        }
    }
    else {
        element = document.createElement(node.name);
    }
    // attributes
    var attributes = node.attributes;
    Object.keys(attributes || {}).forEach(function (key) {
        var attribute = attributes[key];
        if (key === "style") {
            Object.keys(attribute).forEach(function (key) { return (element.style[key] = attribute[key]); });
        }
        else if (key.startsWith("on")) {
            element[key] = attribute;
        }
        else if (typeof attribute === "boolean") {
            attribute ? element.setAttribute(key, "") : element.removeAttribute(key);
        }
        else if (key === "value" && typeof element.value === "string") {
            element.value = attribute;
        }
        else {
            element.setAttribute(key, attribute);
        }
    });
    // children
    var children = [];
    for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        var oldChild = oldNode === null || oldNode === void 0 ? void 0 : oldNode.children[i];
        var childVNode = createElement(child, oldChild, element);
        // エレメントをdocumentに追加する
        if (childVNode.type === "array") {
            // arrayの場合は常に再生成する(めんどいので。いつかkey対応するのでしょう)
            element.append.apply(element, childVNode.children.map(function (it) { return it.element; }));
        }
        else if (!(oldChild === null || oldChild === void 0 ? void 0 : oldChild.element)) {
            // arrayじゃない場合のエレメント追加処理
            element.append(childVNode.element);
        }
        if ((oldChild === null || oldChild === void 0 ? void 0 : oldChild.type) === "text" &&
            !Equals_1.isEquals(childVNode.element, oldChild.element)) {
            // テキストノードの更新処理
            // テキストノード以外は、createElementの中でやっているからいらない
            element.childNodes[i].data = childVNode.element;
        }
        children.push(childVNode);
    }
    return __assign(__assign({}, node), { type: "html", element: element, children: children });
}
function createElement(node, oldNode, parentElement) {
    switch (node.type) {
        case "text":
            return recycleTextElement(node);
        case "array":
            return recycleArrayElement(node, oldNode, parentElement);
        default:
            return recycleNodeElement(node, oldNode, parentElement);
    }
}
function createRootElement(node) {
    return createElement(node, _oldNode, root);
}
//# sourceMappingURL=index.js.map
},{"./Settable":"../node_modules/zheleznaya/dist/Settable.js","./Equals":"../node_modules/zheleznaya/dist/Equals.js"}],"../pages/entries/_id_.tsx":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var zheleznaya_1 = require("zheleznaya");

var Item = function Item(_ref) {
  var id = _ref.id;
  return zheleznaya_1.h("div", null, id);
};

exports.default = Item;
},{"zheleznaya":"../node_modules/zheleznaya/dist/index.js"}],"main.pages_entries__id_.tsx.tsx":[function(require,module,exports) {
"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var zheleznaya_1 = require("zheleznaya");

var _id__tsx_1 = __importDefault(require("../pages/entries/_id_.tsx"));

zheleznaya_1.render(zheleznaya_1.h(_id__tsx_1.default, Object.assign({}, {
  "id": "index.js.map"
})));
},{"zheleznaya":"../node_modules/zheleznaya/dist/index.js","../pages/entries/_id_.tsx":"../pages/entries/_id_.tsx"}]},{},["main.pages_entries__id_.tsx.tsx"], null)