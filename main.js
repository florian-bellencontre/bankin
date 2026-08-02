/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
Object.defineProperty(exports, "ContentScript", ({
  enumerable: true,
  get: function get() {
    return _ContentScript.default;
  }
}));
Object.defineProperty(exports, "RequestInterceptor", ({
  enumerable: true,
  get: function get() {
    return _RequestInterceptor.default;
  }
}));
var _ContentScript = _interopRequireDefault(__webpack_require__(3));
var _RequestInterceptor = _interopRequireDefault(__webpack_require__(49));

/***/ }),
/* 2 */
/***/ ((module) => {

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}

module.exports = _interopRequireDefault;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = exports.WORKER_TYPE = exports.PILOT_TYPE = void 0;
var _regenerator = _interopRequireDefault(__webpack_require__(4));
var _toConsumableArray2 = _interopRequireDefault(__webpack_require__(6));
var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(12));
var _classCallCheck2 = _interopRequireDefault(__webpack_require__(13));
var _createClass2 = _interopRequireDefault(__webpack_require__(14));
var _minilog = _interopRequireDefault(__webpack_require__(15));
var _umd = _interopRequireDefault(__webpack_require__(27));
var _pTimeout = _interopRequireDefault(__webpack_require__(28));
var _pWaitFor = _interopRequireWildcard(__webpack_require__(29));
var _utils = __webpack_require__(30);
var _package = _interopRequireDefault(__webpack_require__(31));
var _LauncherBridge = _interopRequireDefault(__webpack_require__(32));
var _utils2 = __webpack_require__(42);
var _wrapTimer = __webpack_require__(47);
var _window; // @ts-check
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var _log = (0, _minilog.default)('ContentScript class');
var s = 1000;
var m = 60 * s;
var DEFAULT_LOGIN_TIMEOUT = 5 * m;
var DEFAULT_WAIT_FOR_ELEMENT_TIMEOUT = 30 * s;
var DEFAULT_WAIT_FOR_ELEMENT_ACCROSS_PAGES_TIMEOUT = 60 * s;
var PILOT_TYPE = exports.PILOT_TYPE = 'pilot';
var WORKER_TYPE = exports.WORKER_TYPE = 'worker';
if ((_window = window) !== null && _window !== void 0 && _window.addEventListener) {
  // allows cozy-clisk to be embedded in other envs (react-native, jest)
  window.addEventListener('load', function () {
    sendPageMessage('load');
  });
  window.addEventListener('DOMContentLoaded', function () {
    sendPageMessage('DOMContentLoaded');
  });
}
var ContentScript = exports["default"] = /*#__PURE__*/function () {
  function ContentScript() {
    var _this = this;
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck2.default)(this, ContentScript);
    sendPageMessage('NEW_WORKER_INITIALIZING');
    var logDebug = function logDebug(message) {
      return _this.log('debug', message);
    };
    var wrapTimerDebug = (0, _wrapTimer.wrapTimerFactory)({
      logFn: logDebug
    });
    var logInfo = function logInfo(message) {
      return _this.log('info', message);
    };
    var wrapTimerInfo = (0, _wrapTimer.wrapTimerFactory)({
      logFn: logInfo
    });
    this.ensureAuthenticated = wrapTimerInfo(this, 'ensureAuthenticated');
    this.ensureNotAuthenticated = wrapTimerInfo(this, 'ensureNotAuthenticated');
    this.getUserDataFromWebsite = wrapTimerInfo(this, 'getUserDataFromWebsite');
    this.fetch = wrapTimerInfo(this, 'fetch');
    this.waitForAuthenticated = wrapTimerDebug(this, 'waitForAuthenticated');
    this.waitForNotAuthenticated = wrapTimerDebug(this, 'waitForNotAuthenticated');
    this.runInWorker = wrapTimerDebug(this, 'runInWorker', {
      suffixFn: function suffixFn(args) {
        return args === null || args === void 0 ? void 0 : args[0];
      }
    });
    this.runInWorkerUntilTrue = wrapTimerDebug(this, 'runInWorkerUntilTrue', {
      suffixFn: function suffixFn(args) {
        var _args$;
        return (_args$ = args[0]) === null || _args$ === void 0 ? void 0 : _args$.method;
      }
    });
    this.waitForElementInWorker = wrapTimerDebug(this, 'waitForElementInWorker', {
      suffixFn: function suffixFn(args) {
        return args === null || args === void 0 ? void 0 : args[0];
      }
    });
    this.clickAndWait = wrapTimerDebug(this, 'clickAndWait', {
      suffixFn: function suffixFn(args) {
        return "".concat(args === null || args === void 0 ? void 0 : args[0], " ").concat(args === null || args === void 0 ? void 0 : args[1]);
      }
    });
    this.saveFiles = wrapTimerDebug(this, 'saveFiles', {
      suffixFn: function suffixFn(args) {
        return "".concat(args === null || args === void 0 ? void 0 : args[0].length, " files");
      }
    });
    this.saveBills = wrapTimerDebug(this, 'saveBills');
    this.getCredentials = wrapTimerDebug(this, 'getCredentials');
    this.saveCredentials = wrapTimerDebug(this, 'saveCredentials');
    this.saveIdentity = wrapTimerDebug(this, 'saveIdentity');
    this.getCookiesByDomain = wrapTimerDebug(this, 'getCookiesByDomain', {
      suffixFn: function suffixFn(args) {
        return args === null || args === void 0 ? void 0 : args[0];
      }
    });
    this.getCookieFromKeychainByName = wrapTimerDebug(this, 'getCookieFromKeychainByName', {
      suffixFn: function suffixFn(args) {
        return args === null || args === void 0 ? void 0 : args[0];
      }
    });
    this.saveCookieToKeychain = wrapTimerDebug(this, 'saveCookieToKeychain', {
      suffixFn: function suffixFn(args) {
        return args === null || args === void 0 ? void 0 : args[0];
      }
    });
    this.getCookieByDomainAndName = wrapTimerDebug(this, 'getCookieByDomainAndName', {
      suffixFn: function suffixFn(args) {
        return "".concat(args === null || args === void 0 ? void 0 : args[0], " ").concat(args === null || args === void 0 ? void 0 : args[1]);
      }
    });
    this.goto = wrapTimerDebug(this, 'goto', {
      suffixFn: function suffixFn(args) {
        return args === null || args === void 0 ? void 0 : args[0];
      }
    });
    this.downloadFileInWorker = wrapTimerDebug(this, 'downloadFileInWorker', {
      suffixFn: function suffixFn(args) {
        var _args$2;
        return args === null || args === void 0 || (_args$2 = args[0]) === null || _args$2 === void 0 ? void 0 : _args$2.fileurl;
      }
    });
    this.waitForRequestInterception = wrapTimerDebug(this, 'waitForRequestInterception', {
      suffixFn: function suffixFn(args) {
        return args === null || args === void 0 ? void 0 : args[0];
      }
    });
    if (options.requestInterceptor) {
      this.requestInterceptor = options.requestInterceptor;
      this.requestInterceptor.setLogger(this.log.bind(this));
    }
  }
  /**
   * Init the bridge communication with the launcher.
   * It also exposes the methods which will be callable by the launcher
   *
   * @param {object} options : options object
   * @param {Array<string>} [options.additionalExposedMethodsNames] : list of additional method of the
   * content script to expose. To make it callable via the worker.
   */
  (0, _createClass2.default)(ContentScript, [{
    key: "init",
    value: (function () {
      var _init = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee() {
        var _this2 = this;
        var options,
          exposedMethodsNames,
          exposedMethods,
          _i,
          _exposedMethodsNames,
          method,
          _args = arguments;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              options = _args.length > 0 && _args[0] !== undefined ? _args[0] : {};
              this.bridge = new _LauncherBridge.default({
                localWindow: window
              });
              exposedMethodsNames = ['setContentScriptType', 'ensureAuthenticated', 'ensureNotAuthenticated', 'checkAuthenticated', 'waitForAuthenticated', 'waitForNotAuthenticated', 'waitForElementNoReload', 'getUserDataFromWebsite', 'fetch', 'click', 'fillText', 'storeFromWorker', 'clickAndWait', 'getCookiesByDomain', 'getCookieByDomainAndName', 'downloadFileInWorker', 'getDebugData', 'getCliskVersion', 'checkForElement', 'evaluate'];
              if (options.additionalExposedMethodsNames) {
                exposedMethodsNames.push.apply(exposedMethodsNames, options.additionalExposedMethodsNames);
              }
              exposedMethods = {}; // TODO error handling
              // should catch and call onError on the launcher to let it handle the job update
              for (_i = 0, _exposedMethodsNames = exposedMethodsNames; _i < _exposedMethodsNames.length; _i++) {
                method = _exposedMethodsNames[_i];
                exposedMethods[method] = this[method].bind(this);
              }
              this.store = {};
              _context.next = 9;
              return this.bridge.init({
                exposedMethods: exposedMethods
              });
            case 9:
              window.onbeforeunload = function () {
                return _this2.log('debug', "window.beforeunload detected with previous url : ".concat(document.location));
              };
            case 10:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function init() {
        return _init.apply(this, arguments);
      }
      return init;
    }()
    /**
     * This method is called when the worker is ready on the current page. This is a good place to
     * subscribe to dom events for examples. These subscriptions will be replayed on each worker page
     * reload
     */
    )
  }, {
    key: "onWorkerReady",
    value: function onWorkerReady() {}

    /**
     * This method is called fon the pilot when the worker sends workerEvent events to the bridge
     */
  }, {
    key: "onWorkerEvent",
    value: function onWorkerEvent() {}

    /**
     * Set the ContentScript type. This is usefull to know which webview is the pilot or the worker
     *
     * @param {string} contentScriptType - ("pilot" | "worker")
     */
  }, {
    key: "setContentScriptType",
    value: (function () {
      var _setContentScriptType = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee2(contentScriptType) {
        var _this3 = this;
        var _this$requestIntercep;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              this.contentScriptType = contentScriptType;
              _log.info("I am the ".concat(contentScriptType));
              if (this.bridge) {
                _context2.next = 4;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 4:
              if (contentScriptType === WORKER_TYPE) {
                this.onWorkerReady();
                (_this$requestIntercep = this.requestInterceptor) === null || _this$requestIntercep === void 0 || _this$requestIntercep.on('response', function (response) {
                  var _this3$bridge;
                  (_this3$bridge = _this3.bridge) === null || _this3$bridge === void 0 || _this3$bridge.emit('workerEvent', {
                    event: 'requestResponse',
                    payload: response
                  });
                });
              } else if (contentScriptType === PILOT_TYPE) {
                this.bridge.addEventListener('workerEvent', this.onWorkerEvent.bind(this));
              }
            case 5:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function setContentScriptType(_x) {
        return _setContentScriptType.apply(this, arguments);
      }
      return setContentScriptType;
    }()
    /**
     * Check if the user is authenticated or not. This method is made to be overloaded by the child class
     *
     * @returns {Promise.<boolean>} : true if authenticated or false in other case
     */
    )
  }, {
    key: "checkAuthenticated",
    value: (function () {
      var _checkAuthenticated = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee3() {
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              return _context3.abrupt("return", false);
            case 1:
            case "end":
              return _context3.stop();
          }
        }, _callee3);
      }));
      function checkAuthenticated() {
        return _checkAuthenticated.apply(this, arguments);
      }
      return checkAuthenticated;
    }()
    /**
     * This method is made to run in the worker and will resolve as true when
     * the user is authenticated
     *
     * @param {object} options        - options object
     * @param {number} [options.timeout] - number of miliseconds before the function sends a timeout error. Default 5m
     * @param {number} [options.interval] - interval in ms between checkAuthenticated calls. Default 1s
     * @returns {Promise.<true>} : if authenticated
     * @throws {TimeoutError}: TimeoutError from p-wait-for package if timeout expired
     */
    )
  }, {
    key: "waitForAuthenticated",
    value: (function () {
      var _waitForAuthenticated = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee4() {
        var options,
          timeout,
          interval,
          _args4 = arguments;
        return _regenerator.default.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              options = _args4.length > 0 && _args4[0] !== undefined ? _args4[0] : {};
              this.onlyIn(WORKER_TYPE, 'waitForAuthenticated');
              timeout = options.timeout || DEFAULT_LOGIN_TIMEOUT;
              interval = options.interval || 1000;
              _context4.next = 6;
              return (0, _pWaitFor.default)(this.checkAuthenticated.bind(this), {
                interval: interval,
                timeout: {
                  milliseconds: timeout,
                  message: new _pWaitFor.TimeoutError("waitForAuthenticated timed out after ".concat(timeout, "ms"))
                }
              });
            case 6:
              return _context4.abrupt("return", true);
            case 7:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function waitForAuthenticated() {
        return _waitForAuthenticated.apply(this, arguments);
      }
      return waitForAuthenticated;
    }()
    /**
     * Resolves when the dom is ready (DOMContentLoaded event)
     *
     * @returns {Promise<void>}
     */
    )
  }, {
    key: "waitForDomReady",
    value: (function () {
      var _waitForDomReady = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee5() {
        var self, domReadyPromise;
        return _regenerator.default.wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              self = this;
              domReadyPromise = new Promise(function (resolve) {
                var _document, _document2, _document3;
                // first check if the DOMContentLoad has already been called
                if (((_document = document) === null || _document === void 0 ? void 0 : _document.readyState) === 'complete' || ((_document2 = document) === null || _document2 === void 0 ? void 0 : _document2.readyState) === 'loaded' || ((_document3 = document) === null || _document3 === void 0 ? void 0 : _document3.readyState) === 'interactive') {
                  resolve();
                } else {
                  window.addEventListener('DOMContentLoaded', function () {
                    resolve();
                  });
                }
              });
              return _context5.abrupt("return", (0, _pTimeout.default)(domReadyPromise, {
                milliseconds: 10000,
                fallback: function fallback() {
                  return self.log('warn', 'waitForDomReady timed out after 10s, we may have missed the DOMContentLoad event');
                }
              }));
            case 3:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function waitForDomReady() {
        return _waitForDomReady.apply(this, arguments);
      }
      return waitForDomReady;
    }()
    /**
     * This method is made to run in the worker and will resolve as true when
     * the user is not authenticated
     *
     * @param {object} options        - options object
     * @param {number} [options.timeout] - number of miliseconds before the function sends a timeout error. Default 30s
     * @param {number} [options.interval] - interval in ms between checkAuthenticated calls. Default 1s
     * @returns {Promise.<true>} : if not authenticated
     * @throws {TimeoutError}: TimeoutError from p-wait-for package if timeout expired
     */
    )
  }, {
    key: "waitForNotAuthenticated",
    value: (function () {
      var _waitForNotAuthenticated = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee7() {
        var _this4 = this;
        var options,
          timeout,
          interval,
          _args7 = arguments;
        return _regenerator.default.wrap(function _callee7$(_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              options = _args7.length > 0 && _args7[0] !== undefined ? _args7[0] : {};
              this.onlyIn(WORKER_TYPE, 'waitForNotAuthenticated');
              timeout = options.timeout || DEFAULT_WAIT_FOR_ELEMENT_TIMEOUT;
              interval = options.interval || 1000;
              _context7.next = 6;
              return (0, _pWaitFor.default)( /*#__PURE__*/(0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee6() {
                var authenticated;
                return _regenerator.default.wrap(function _callee6$(_context6) {
                  while (1) switch (_context6.prev = _context6.next) {
                    case 0:
                      _context6.next = 2;
                      return _this4.checkAuthenticated.bind(_this4)();
                    case 2:
                      authenticated = _context6.sent;
                      return _context6.abrupt("return", !authenticated);
                    case 4:
                    case "end":
                      return _context6.stop();
                  }
                }, _callee6);
              })), {
                interval: interval,
                timeout: {
                  milliseconds: timeout,
                  message: new _pWaitFor.TimeoutError("waitForNotAuthenticated timed out after ".concat(timeout, "ms"))
                }
              });
            case 6:
              return _context7.abrupt("return", true);
            case 7:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function waitForNotAuthenticated() {
        return _waitForNotAuthenticated.apply(this, arguments);
      }
      return waitForNotAuthenticated;
    }()
    /**
     * Wait for the given identified request to be intercepted. The identified request must be defined and
     * sent to the ContentScript constructor
     *
     * @param {string} identifier - any identifier string defined in the RequestInterceptor
     * @param {object} [options] - options object
     * @param {number} [options.timeout] - number of miliseconds before the function sends a timeout error. Default 60000ms
     */
    )
  }, {
    key: "waitForRequestInterception",
    value: function waitForRequestInterception(identifier) {
      var _options$timeout,
        _this5 = this;
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      this.onlyIn(PILOT_TYPE, 'waitForRequestInterception');
      var timeout = (_options$timeout = options === null || options === void 0 ? void 0 : options.timeout) !== null && _options$timeout !== void 0 ? _options$timeout : 60000;
      var interceptionPromise = new Promise(function (resolve) {
        var listener = function listener(_ref2) {
          var event = _ref2.event,
            payload = _ref2.payload;
          if (event === 'requestResponse' && payload.identifier === identifier) {
            if (!_this5.bridge) {
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            }
            _this5.bridge.removeEventListener('workerEvent', listener);
            resolve(payload);
          }
        };
        if (!_this5.bridge) {
          throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
        }
        _this5.bridge.addEventListener('workerEvent', listener);
      });
      return (0, _pTimeout.default)(interceptionPromise, {
        milliseconds: timeout,
        message: "Timed out after waiting ".concat(timeout, "ms for interception of ").concat(identifier)
      });
    }

    /**
     * Run a specified method in the worker webview
     *
     * @param {string} method : name of the method to run
     */
  }, {
    key: "runInWorker",
    value: (function () {
      var _runInWorker = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee8(method) {
        var _this$bridge;
        var _len,
          args,
          _key,
          _args8 = arguments;
        return _regenerator.default.wrap(function _callee8$(_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'runInWorker');
              if (this.bridge) {
                _context8.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              for (_len = _args8.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = _args8[_key];
              }
              _context8.next = 6;
              return (_this$bridge = this.bridge).call.apply(_this$bridge, ['runInWorker', method].concat(args));
            case 6:
              return _context8.abrupt("return", _context8.sent);
            case 7:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this);
      }));
      function runInWorker(_x2) {
        return _runInWorker.apply(this, arguments);
      }
      return runInWorker;
    }()
    /**
     * Wait for a method to resolve as true on worker
     *
     * @param {object} options        - options object
     * @param {string} options.method - name of the method to run
     * @param {number} [options.timeout] - number of miliseconds before the function sends a timeout error. Default Infinity
     * @param {string} [options.suffix] - suffix used in timeout error message, to better identify error source
     * @param {Array} [options.args] - array of args to pass to the method
     * @returns {Promise<boolean>} - true
     * @throws {TimeoutError} - if timeout expired
     */
    )
  }, {
    key: "runInWorkerUntilTrue",
    value: (function () {
      var _runInWorkerUntilTrue = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee9(_ref3) {
        var method, _ref3$timeout, timeout, _ref3$suffix, suffix, _ref3$args, args, result, start, isTimeout;
        return _regenerator.default.wrap(function _callee9$(_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              method = _ref3.method, _ref3$timeout = _ref3.timeout, timeout = _ref3$timeout === void 0 ? Infinity : _ref3$timeout, _ref3$suffix = _ref3.suffix, suffix = _ref3$suffix === void 0 ? '' : _ref3$suffix, _ref3$args = _ref3.args, args = _ref3$args === void 0 ? [] : _ref3$args;
              this.onlyIn(PILOT_TYPE, 'runInWorkerUntilTrue');
              _log.debug('runInWorkerUntilTrue', method);
              result = false;
              start = Date.now();
              isTimeout = function isTimeout() {
                return Date.now() - start >= timeout;
              };
            case 6:
              if (result) {
                _context9.next = 16;
                break;
              }
              if (!isTimeout()) {
                _context9.next = 9;
                break;
              }
              throw new _pWaitFor.TimeoutError("runInWorkerUntilTrue ".concat(method).concat(suffix, " Timeout error after ").concat(timeout));
            case 9:
              _log.debug('runInWorker call', method);
              _context9.next = 12;
              return this.runInWorker.apply(this, [method].concat((0, _toConsumableArray2.default)(args)));
            case 12:
              result = _context9.sent;
              _log.debug('runInWorker result', result);
              _context9.next = 6;
              break;
            case 16:
              return _context9.abrupt("return", result);
            case 17:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function runInWorkerUntilTrue(_x3) {
        return _runInWorkerUntilTrue.apply(this, arguments);
      }
      return runInWorkerUntilTrue;
    }()
    /**
     * Wait for a dom element to be present on the page, even if there are page redirects or page
     * reloads
     *
     * @param {string} selector - css selector we are waiting for
     * @param {object} options - options object
     * @param {number} [options.timeout] - timeout in ms. Will default to 30s
     * @param {string} [options.includesText] - only select elements with the given text as innerText
     */
    )
  }, {
    key: "waitForElementInWorker",
    value: (function () {
      var _waitForElementInWorker = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee10(selector) {
        var _options$timeout2;
        var options,
          _args10 = arguments;
        return _regenerator.default.wrap(function _callee10$(_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              options = _args10.length > 1 && _args10[1] !== undefined ? _args10[1] : {};
              this.onlyIn(PILOT_TYPE, 'waitForElementInWorker');
              _context10.next = 4;
              return this.runInWorkerUntilTrue({
                method: 'waitForElementNoReload',
                suffix: selector,
                timeout: (_options$timeout2 = options === null || options === void 0 ? void 0 : options.timeout) !== null && _options$timeout2 !== void 0 ? _options$timeout2 : DEFAULT_WAIT_FOR_ELEMENT_ACCROSS_PAGES_TIMEOUT,
                args: [selector, {
                  includesText: options.includesText
                }]
              });
            case 4:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this);
      }));
      function waitForElementInWorker(_x4) {
        return _waitForElementInWorker.apply(this, arguments);
      }
      return waitForElementInWorker;
    }()
    /**
     * Check if dom element is present on the page.
     *
     * @param {string} selector - css selector we are checking for
     * @returns {Promise<boolean>}  - Returns true or false
     */
    )
  }, {
    key: "isElementInWorker",
    value: (function () {
      var _isElementInWorker = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee11(selector) {
        var options,
          _args11 = arguments;
        return _regenerator.default.wrap(function _callee11$(_context11) {
          while (1) switch (_context11.prev = _context11.next) {
            case 0:
              options = _args11.length > 1 && _args11[1] !== undefined ? _args11[1] : {};
              this.onlyIn(PILOT_TYPE, 'isElementInWorker');
              _context11.next = 4;
              return this.runInWorker('checkForElement', selector, options);
            case 4:
              return _context11.abrupt("return", _context11.sent);
            case 5:
            case "end":
              return _context11.stop();
          }
        }, _callee11, this);
      }));
      function isElementInWorker(_x5) {
        return _isElementInWorker.apply(this, arguments);
      }
      return isElementInWorker;
    }()
    /**
     * Wait for a dom element to be present on the page. This won't resolve if the page reloads
     *
     * @param {string} selector - css selector we are waiting for
     * @param {object} [options] - options object
     * @param {string} [options.includesText] - only select elements wich include the given text as innerText
     * @returns {Promise.<true>} - Returns true when ready
     */
    )
  }, {
    key: "waitForElementNoReload",
    value: (function () {
      var _waitForElementNoReload = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee12(selector) {
        var _this6 = this;
        var options,
          _args12 = arguments;
        return _regenerator.default.wrap(function _callee12$(_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              options = _args12.length > 1 && _args12[1] !== undefined ? _args12[1] : {};
              this.onlyIn(WORKER_TYPE, 'waitForElementNoReload');
              _log.debug('waitForElementNoReload', selector);
              _context12.next = 5;
              return (0, _pWaitFor.default)(function () {
                return _this6.checkForElement(selector, options);
              }, {
                timeout: {
                  milliseconds: DEFAULT_WAIT_FOR_ELEMENT_TIMEOUT,
                  message: new _pWaitFor.TimeoutError("waitForElementNoReload ".concat(selector).concat(options !== null && options !== void 0 && options.includesText ? ' "' + options.includesText + '"' : '', " timed out after ").concat(DEFAULT_WAIT_FOR_ELEMENT_TIMEOUT, "ms"))
                }
              });
            case 5:
              return _context12.abrupt("return", true);
            case 6:
            case "end":
              return _context12.stop();
          }
        }, _callee12, this);
      }));
      function waitForElementNoReload(_x6) {
        return _waitForElementNoReload.apply(this, arguments);
      }
      return waitForElementNoReload;
    }()
    /**
     * Check if a dom element is present on the page.
     *
     * @param {string} selector - css selector we are checking for
     * @param {object} [options] - options object
     * @param {string} [options.includesText] - only select elements with the given text as innerText
     * @returns {Promise<boolean>} - Returns true or false
     */
    )
  }, {
    key: "checkForElement",
    value: (function () {
      var _checkForElement = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee13(selector) {
        var options,
          _args13 = arguments;
        return _regenerator.default.wrap(function _callee13$(_context13) {
          while (1) switch (_context13.prev = _context13.next) {
            case 0:
              options = _args13.length > 1 && _args13[1] !== undefined ? _args13[1] : {};
              this.onlyIn(WORKER_TYPE, 'checkForElement');
              return _context13.abrupt("return", Boolean(this.selectElement(selector, options)));
            case 3:
            case "end":
              return _context13.stop();
          }
        }, _callee13, this);
      }));
      function checkForElement(_x7) {
        return _checkForElement.apply(this, arguments);
      }
      return checkForElement;
    }()
    /**
     * Select a dom element with given selector and options
     *
     * @param {string} selector - css selector of the element
     * @param {object} [options] - options object
     * @param {string} [options.includesText] - only select element with the given text as innerText
     * @returns {object|null} - Returns the selected dom element or null
     */
    )
  }, {
    key: "selectElement",
    value: function selectElement(selector) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      this.onlyIn(WORKER_TYPE, 'selectElement');
      if (options !== null && options !== void 0 && options.includesText && typeof options.includesText === 'string' && options.includesText !== undefined) {
        return Array.from(document.querySelectorAll(selector)).find(function (element) {
          var _element$innerHTML;
          return (// @ts-ignore Argument of type 'string | undefined' is not assignable to parameter of type 'string'.  Type 'undefined' is not assignable to type 'string'.ts(2345)
            (_element$innerHTML = element.innerHTML) === null || _element$innerHTML === void 0 ? void 0 : _element$innerHTML.includes(options.includesText)
          );
        });
      } else {
        return document.querySelector(selector);
      }
    }

    /**
     * Click on a given element
     *
     * @param {string} selector - css selector of the element
     * @param {object} [options] - options object
     * @param {string} [options.includesText] - only select element with the given text as innerText
     * @returns {Promise<void>}
     */
  }, {
    key: "click",
    value: (function () {
      var _click = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee14(selector) {
        var options,
          elem,
          _args14 = arguments;
        return _regenerator.default.wrap(function _callee14$(_context14) {
          while (1) switch (_context14.prev = _context14.next) {
            case 0:
              options = _args14.length > 1 && _args14[1] !== undefined ? _args14[1] : {};
              this.onlyIn(WORKER_TYPE, 'click');
              elem = this.selectElement(selector, options);
              if (elem) {
                _context14.next = 5;
                break;
              }
              throw new Error("click: No DOM element is matched with the ".concat(selector, " selector"));
            case 5:
              elem.click();
            case 6:
            case "end":
              return _context14.stop();
          }
        }, _callee14, this);
      }));
      function click(_x8) {
        return _click.apply(this, arguments);
      }
      return click;
    }()
    /**
     * Click on a given element and wait for another given element to be displayed on screen
     *
     * @param {string} elementToClick - css selector of the dom element to click in worker
     * @param {string} elementToWait - css selector of the dom element to wait in worker
     * @returns {Promise<void>}
     */
    )
  }, {
    key: "clickAndWait",
    value: (function () {
      var _clickAndWait = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee15(elementToClick, elementToWait) {
        return _regenerator.default.wrap(function _callee15$(_context15) {
          while (1) switch (_context15.prev = _context15.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'clickAndWait');
              _log.debug('clicking ' + elementToClick);
              _context15.next = 4;
              return this.runInWorker('click', elementToClick);
            case 4:
              _log.debug('waiting for ' + elementToWait);
              _context15.next = 7;
              return this.waitForElementInWorker(elementToWait);
            case 7:
              _log.debug('done waiting ' + elementToWait);
            case 8:
            case "end":
              return _context15.stop();
          }
        }, _callee15, this);
      }));
      function clickAndWait(_x9, _x10) {
        return _clickAndWait.apply(this, arguments);
      }
      return clickAndWait;
    }())
  }, {
    key: "fillText",
    value: function () {
      var _fillText = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee16(selector, text) {
        var elem;
        return _regenerator.default.wrap(function _callee16$(_context16) {
          while (1) switch (_context16.prev = _context16.next) {
            case 0:
              this.onlyIn(WORKER_TYPE, 'fillText');
              elem = this.selectElement(selector);
              if (elem) {
                _context16.next = 4;
                break;
              }
              throw new Error("fillText: No DOM element is matched with the ".concat(selector, " selector"));
            case 4:
              elem.focus();
              elem.value = text;
              elem.dispatchEvent(new Event('input', {
                bubbles: true
              }));
              elem.dispatchEvent(new Event('change', {
                bubbles: true
              }));
            case 8:
            case "end":
              return _context16.stop();
          }
        }, _callee16, this);
      }));
      function fillText(_x11, _x12) {
        return _fillText.apply(this, arguments);
      }
      return fillText;
    }()
    /**
     * Download the file send by the launcher in the worker context
     *
     * @param {object} entry The entry to download with fileurl attribute
     */
  }, {
    key: "downloadFileInWorker",
    value: (function () {
      var _downloadFileInWorker = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee17(entry) {
        var errorMessage, errorToLog;
        return _regenerator.default.wrap(function _callee17$(_context17) {
          while (1) switch (_context17.prev = _context17.next) {
            case 0:
              this.onlyIn(WORKER_TYPE, 'downloadFileInWorker');
              this.log('debug', 'downloading file in worker');
              if (!entry.fileurl) {
                _context17.next = 24;
                break;
              }
              _context17.prev = 3;
              _context17.next = 6;
              return _umd.default.get(entry.fileurl, entry.requestOptions).blob();
            case 6:
              entry.blob = _context17.sent;
              _context17.next = 9;
              return (0, _utils.blobToBase64)(entry.blob);
            case 9:
              entry.dataUri = _context17.sent;
              _context17.next = 24;
              break;
            case 12:
              _context17.prev = 12;
              _context17.t0 = _context17["catch"](3);
              this.log('debug', "Full error : ".concat(JSON.stringify(_context17.t0)));
              errorMessage = _context17.t0.message;
              errorToLog = '';
              if (!errorMessage.includes(/404|403|500|502|503/g)) {
                _context17.next = 23;
                break;
              }
              if (errorMessage.includes('404')) errorToLog = 'Website cannot find the wanted url';else if (errorMessage.includes('403')) errorToLog = 'User is not allowed to access the wanted URL';else errorToLog = 'Website server error accessing the wanted URL';
              this.log('error', errorToLog);
              throw new Error('VENDOR_DOWN');
            case 23:
              throw new Error('UNKNOWN_ERROR');
            case 24:
              return _context17.abrupt("return", entry.dataUri);
            case 25:
            case "end":
              return _context17.stop();
          }
        }, _callee17, this, [[3, 12]]);
      }));
      function downloadFileInWorker(_x13) {
        return _downloadFileInWorker.apply(this, arguments);
      }
      return downloadFileInWorker;
    }())
  }, {
    key: "getDebugData",
    value: function () {
      var _getDebugData = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee18() {
        return _regenerator.default.wrap(function _callee18$(_context18) {
          while (1) switch (_context18.prev = _context18.next) {
            case 0:
              return _context18.abrupt("return", {
                url: window.location.href,
                html: window.document.documentElement.outerHTML
              });
            case 1:
            case "end":
              return _context18.stop();
          }
        }, _callee18);
      }));
      function getDebugData() {
        return _getDebugData.apply(this, arguments);
      }
      return getDebugData;
    }()
    /**
     * Bridge to the saveFiles method from the launcher.
     * - it prefilters files according to the context comming from the launcher
     * - download files when not filtered out
     * - converts blob files to base64 uri to be serializable
     *
     * @param {Array<import('../launcher/saveFiles').saveFilesEntry & {shouldReplaceFile: Function}>} entries : list of file entries to save
     * @param {import('../launcher/saveFiles').saveFileOptions & {context: object, shouldReplaceFile: Function}} options : saveFiles options
     */
  }, {
    key: "saveFiles",
    value: (function () {
      var _saveFiles = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee19(entries, options) {
        var context, updatedEntries;
        return _regenerator.default.wrap(function _callee19$(_context19) {
          while (1) switch (_context19.prev = _context19.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'saveFiles');
              this.log('debug', "saveFiles ".concat(entries.length, " input entries"));
              context = options.context;
              _log.debug(context, 'saveFiles input context');
              if (this.bridge) {
                _context19.next = 6;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 6:
              updatedEntries = this.prepareSaveFileEntries(entries, options);
              _context19.next = 9;
              return this.bridge.call('saveFiles', updatedEntries, options);
            case 9:
              return _context19.abrupt("return", _context19.sent);
            case 10:
            case "end":
              return _context19.stop();
          }
        }, _callee19, this);
      }));
      function saveFiles(_x14, _x15) {
        return _saveFiles.apply(this, arguments);
      }
      return saveFiles;
    }()
    /**
     * Prepare entries to be given to launcher saveFiles. Especially function attributes which will not be serialized to the launcher
     *
     * @param {Array<import('../launcher/saveFiles').saveFilesEntry & {shouldReplaceFile?: Function}>} entries
     * @param {import('../launcher/saveFiles').saveFileOptions & {context: object, shouldReplaceFile?: Function}} options
     */
    )
  }, {
    key: "prepareSaveFileEntries",
    value: function prepareSaveFileEntries(entries, options) {
      var _options$context;
      var existingFilesIndex = (options === null || options === void 0 || (_options$context = options.context) === null || _options$context === void 0 ? void 0 : _options$context.existingFilesIndex) || {};
      var updatedEntries = (0, _toConsumableArray2.default)(entries);
      var _iterator = _createForOfIteratorHelper(updatedEntries),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var entry = _step.value;
          if (entry.forceReplaceFile === true || entry.forceReplaceFile === false) {
            // entry.forceReplaceFile has priority over shouldReplaceFile function
            continue;
          }
          var shouldReplaceFileFn = entry.shouldReplaceFile || options.shouldReplaceFile;
          if (shouldReplaceFileFn) {
            var existingFile = existingFilesIndex[(0, _utils2.calculateFileKey)(entry, options.fileIdAttributes)];
            entry.forceReplaceFile = shouldReplaceFileFn(existingFile, entry, options);
            entry === null || entry === void 0 || delete entry.shouldReplaceFile;
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      options === null || options === void 0 || delete options.shouldReplaceFile;
      return updatedEntries;
    }

    /**
     * Query all the documents corresponding to the given query object. The client with permissions corresponding
     * to the current konnector manifest will be used.
     *
     * @param {import("cozy-client").QueryDefinition} queryDefinition - CozyClient query definition object
     * @param {import('cozy-client/types/types').QueryOptions} options - CozyClient query options
     * @returns {Promise<import('cozy-client/types/types').QueryResult>} Returns the list of documents
     */
  }, {
    key: "queryAll",
    value: (function () {
      var _queryAll = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee20(queryDefinition, options) {
        return _regenerator.default.wrap(function _callee20$(_context20) {
          while (1) switch (_context20.prev = _context20.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'queryAll');
              if (this.bridge) {
                _context20.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context20.next = 5;
              return this.bridge.call('queryAll', queryDefinition.toDefinition(), options);
            case 5:
              return _context20.abrupt("return", _context20.sent);
            case 6:
            case "end":
              return _context20.stop();
          }
        }, _callee20, this);
      }));
      function queryAll(_x16, _x17) {
        return _queryAll.apply(this, arguments);
      }
      return queryAll;
    }()
    /**
     * Bridge to the saveBills method from the launcher.
     * - it first saves the files
     * - then saves bills linked to corresponding files
     *
     * @param {Array} entries : list of file entries to save
     * @param {object} options : saveFiles options
     */
    )
  }, {
    key: "saveBills",
    value: (function () {
      var _saveBills = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee21(entries, options) {
        var files;
        return _regenerator.default.wrap(function _callee21$(_context21) {
          while (1) switch (_context21.prev = _context21.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'saveBills');
              _context21.next = 3;
              return this.saveFiles(entries, options);
            case 3:
              files = _context21.sent;
              if (this.bridge) {
                _context21.next = 6;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 6:
              _context21.next = 8;
              return this.bridge.call('saveBills', files, options);
            case 8:
              return _context21.abrupt("return", _context21.sent);
            case 9:
            case "end":
              return _context21.stop();
          }
        }, _callee21, this);
      }));
      function saveBills(_x18, _x19) {
        return _saveBills.apply(this, arguments);
      }
      return saveBills;
    }()
    /**
     * Bridge to the getCredentials method from the launcher.
     */
    )
  }, {
    key: "getCredentials",
    value: (function () {
      var _getCredentials = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee22() {
        return _regenerator.default.wrap(function _callee22$(_context22) {
          while (1) switch (_context22.prev = _context22.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'getCredentials');
              if (this.bridge) {
                _context22.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context22.next = 5;
              return this.bridge.call('getCredentials');
            case 5:
              return _context22.abrupt("return", _context22.sent);
            case 6:
            case "end":
              return _context22.stop();
          }
        }, _callee22, this);
      }));
      function getCredentials() {
        return _getCredentials.apply(this, arguments);
      }
      return getCredentials;
    }()
    /**
     * Bridge to the saveCredentials method from the launcher.
     *
     * @param {object} credentials : object with credentials specific to the current connector
     */
    )
  }, {
    key: "saveCredentials",
    value: (function () {
      var _saveCredentials = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee23(credentials) {
        return _regenerator.default.wrap(function _callee23$(_context23) {
          while (1) switch (_context23.prev = _context23.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'saveCredentials');
              if (this.bridge) {
                _context23.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context23.next = 5;
              return this.bridge.call('saveCredentials', credentials);
            case 5:
              return _context23.abrupt("return", _context23.sent);
            case 6:
            case "end":
              return _context23.stop();
          }
        }, _callee23, this);
      }));
      function saveCredentials(_x20) {
        return _saveCredentials.apply(this, arguments);
      }
      return saveCredentials;
    }()
    /**
     * Bridge to the saveIdentity method from the launcher.
     *
     * @param {object} identity : io.cozy.contacts object
     */
    )
  }, {
    key: "saveIdentity",
    value: (function () {
      var _saveIdentity = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee24(identity) {
        return _regenerator.default.wrap(function _callee24$(_context24) {
          while (1) switch (_context24.prev = _context24.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'saveIdentity');
              if (this.bridge) {
                _context24.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context24.next = 5;
              return this.bridge.call('saveIdentity', identity);
            case 5:
              return _context24.abrupt("return", _context24.sent);
            case 6:
            case "end":
              return _context24.stop();
          }
        }, _callee24, this);
      }));
      function saveIdentity(_x21) {
        return _saveIdentity.apply(this, arguments);
      }
      return saveIdentity;
    }()
    /**
     * Bridge to the getCookiesByDomain method from the RNlauncher.
     *
     * @param {string} domain : domain name
     */
    )
  }, {
    key: "getCookiesByDomain",
    value: (function () {
      var _getCookiesByDomain = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee25(domain) {
        return _regenerator.default.wrap(function _callee25$(_context25) {
          while (1) switch (_context25.prev = _context25.next) {
            case 0:
              if (this.bridge) {
                _context25.next = 2;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 2:
              _context25.next = 4;
              return this.bridge.call('getCookiesByDomain', domain);
            case 4:
              return _context25.abrupt("return", _context25.sent);
            case 5:
            case "end":
              return _context25.stop();
          }
        }, _callee25, this);
      }));
      function getCookiesByDomain(_x22) {
        return _getCookiesByDomain.apply(this, arguments);
      }
      return getCookiesByDomain;
    }()
    /**
     * Bridge to the getCookieFromKeychainByName method from the RNlauncher.
     *
     * @param {string} cookieName : cookie name
     */
    )
  }, {
    key: "getCookieFromKeychainByName",
    value: (function () {
      var _getCookieFromKeychainByName = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee26(cookieName) {
        return _regenerator.default.wrap(function _callee26$(_context26) {
          while (1) switch (_context26.prev = _context26.next) {
            case 0:
              if (this.bridge) {
                _context26.next = 2;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 2:
              _context26.next = 4;
              return this.bridge.call('getCookieFromKeychainByName', cookieName);
            case 4:
              return _context26.abrupt("return", _context26.sent);
            case 5:
            case "end":
              return _context26.stop();
          }
        }, _callee26, this);
      }));
      function getCookieFromKeychainByName(_x23) {
        return _getCookieFromKeychainByName.apply(this, arguments);
      }
      return getCookieFromKeychainByName;
    }()
    /**
     * Bridge to the saveCookieToKeychain method from the RNlauncher.
     *
     * @param {string} cookieValue : cookie value
     */
    )
  }, {
    key: "saveCookieToKeychain",
    value: (function () {
      var _saveCookieToKeychain = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee27(cookieValue) {
        return _regenerator.default.wrap(function _callee27$(_context27) {
          while (1) switch (_context27.prev = _context27.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'saveCookieToKeychain');
              if (this.bridge) {
                _context27.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context27.next = 5;
              return this.bridge.call('saveCookieToKeychain', cookieValue);
            case 5:
              return _context27.abrupt("return", _context27.sent);
            case 6:
            case "end":
              return _context27.stop();
          }
        }, _callee27, this);
      }));
      function saveCookieToKeychain(_x24) {
        return _saveCookieToKeychain.apply(this, arguments);
      }
      return saveCookieToKeychain;
    }())
  }, {
    key: "getCookieByDomainAndName",
    value: function () {
      var _getCookieByDomainAndName = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee28(cookieDomain, cookieName) {
        var expectedCookie;
        return _regenerator.default.wrap(function _callee28$(_context28) {
          while (1) switch (_context28.prev = _context28.next) {
            case 0:
              this.onlyIn(WORKER_TYPE, 'getCookieByDomainAndName');
              if (this.bridge) {
                _context28.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context28.next = 5;
              return this.bridge.call('getCookieByDomainAndName', cookieDomain, cookieName);
            case 5:
              expectedCookie = _context28.sent;
              return _context28.abrupt("return", expectedCookie);
            case 7:
            case "end":
              return _context28.stop();
          }
        }, _callee28, this);
      }));
      function getCookieByDomainAndName(_x25, _x26) {
        return _getCookieByDomainAndName.apply(this, arguments);
      }
      return getCookieByDomainAndName;
    }()
    /**
     * Send log message to the launcher
     *
     * @param {"debug"|"info"|"warn"|"error"} level : the log level
     * @param {string} message : the log message
     */
  }, {
    key: "log",
    value: function log(level, message) {
      var _this$bridge2;
      if (!message) {
        _log.warn("you are calling log without message, use log(level,message) instead");
        return;
      }
      var now = new Date().toISOString();
      (_this$bridge2 = this.bridge) === null || _this$bridge2 === void 0 || _this$bridge2.emit('log', {
        timestamp: now,
        level: level,
        msg: message
      });
    }

    /**
     * @typedef SetWorkerStateOptions
     * @property {string} [url]      : url displayed by the worker webview for the login
     * @property {boolean} [visible] : will the worker be visible or not
     */

    /**
     * This is a proxy to the "setWorkerState" command in the launcher
     *
     * @param {SetWorkerStateOptions} options : worker state options
     */
  }, {
    key: "setWorkerState",
    value: (function () {
      var _setWorkerState = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee29() {
        var options,
          _args29 = arguments;
        return _regenerator.default.wrap(function _callee29$(_context29) {
          while (1) switch (_context29.prev = _context29.next) {
            case 0:
              options = _args29.length > 0 && _args29[0] !== undefined ? _args29[0] : {};
              this.onlyIn(PILOT_TYPE, 'setWorkerState');
              if (this.bridge) {
                _context29.next = 4;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 4:
              _context29.next = 6;
              return this.bridge.call('setWorkerState', options);
            case 6:
            case "end":
              return _context29.stop();
          }
        }, _callee29, this);
      }));
      function setWorkerState() {
        return _setWorkerState.apply(this, arguments);
      }
      return setWorkerState;
    }()
    /**
     * Set the current url of the worker
     *
     * @param {string} url : the url
     */
    )
  }, {
    key: "goto",
    value: (function () {
      var _goto = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee30(url) {
        return _regenerator.default.wrap(function _callee30$(_context30) {
          while (1) switch (_context30.prev = _context30.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'goto');
              _context30.next = 3;
              return this.setWorkerState({
                url: url
              });
            case 3:
            case "end":
              return _context30.stop();
          }
        }, _callee30, this);
      }));
      function goto(_x27) {
        return _goto.apply(this, arguments);
      }
      return goto;
    }())
  }, {
    key: "blockWorkerInteractions",
    value: function () {
      var _blockWorkerInteractions = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee31() {
        return _regenerator.default.wrap(function _callee31$(_context31) {
          while (1) switch (_context31.prev = _context31.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'blockWorkerInteractions');
              if (this.bridge) {
                _context31.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context31.next = 5;
              return this.bridge.call('blockWorkerInteractions');
            case 5:
            case "end":
              return _context31.stop();
          }
        }, _callee31, this);
      }));
      function blockWorkerInteractions() {
        return _blockWorkerInteractions.apply(this, arguments);
      }
      return blockWorkerInteractions;
    }()
  }, {
    key: "unblockWorkerInteractions",
    value: function () {
      var _unblockWorkerInteractions = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee32() {
        return _regenerator.default.wrap(function _callee32$(_context32) {
          while (1) switch (_context32.prev = _context32.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'unblockWorkerInteractions');
              if (this.bridge) {
                _context32.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              _context32.next = 5;
              return this.bridge.call('unblockWorkerInteractions');
            case 5:
            case "end":
              return _context32.stop();
          }
        }, _callee32, this);
      }));
      function unblockWorkerInteractions() {
        return _unblockWorkerInteractions.apply(this, arguments);
      }
      return unblockWorkerInteractions;
    }()
    /**
     * Evaluates a given function in worker context
     *
     * @param {Function} fn - the function to evaluate
     * @returns {Promise<any>} - function evaluation result
     */
  }, {
    key: "evaluateInWorker",
    value: (function () {
      var _evaluateInWorker = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee33(fn) {
        var _len2,
          args,
          _key2,
          _args33 = arguments;
        return _regenerator.default.wrap(function _callee33$(_context33) {
          while (1) switch (_context33.prev = _context33.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'evaluateInWorker');
              for (_len2 = _args33.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = _args33[_key2];
              }
              _context33.next = 4;
              return this.runInWorker.apply(this, ['evaluate', fn.toString()].concat(args));
            case 4:
              return _context33.abrupt("return", _context33.sent);
            case 5:
            case "end":
              return _context33.stop();
          }
        }, _callee33, this);
      }));
      function evaluateInWorker(_x28) {
        return _evaluateInWorker.apply(this, arguments);
      }
      return evaluateInWorker;
    }()
    /**
     * Evaluates a given function string
     *
     * @param {string} fnString - the function string to evaluate
     * @returns {Promise<any>} - function evaluation result
     */
    )
  }, {
    key: "evaluate",
    value: (function () {
      var _evaluate = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee34(fnString) {
        var _len3,
          args,
          _key3,
          _args34 = arguments;
        return _regenerator.default.wrap(function _callee34$(_context34) {
          while (1) switch (_context34.prev = _context34.next) {
            case 0:
              this.onlyIn(WORKER_TYPE, 'evaluate');
              for (_len3 = _args34.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
                args[_key3 - 1] = _args34[_key3];
              }
              _context34.next = 4;
              return _utils.callStringFunction.apply(void 0, [fnString].concat(args));
            case 4:
              return _context34.abrupt("return", _context34.sent);
            case 5:
            case "end":
              return _context34.stop();
          }
        }, _callee34, this);
      }));
      function evaluate(_x29) {
        return _evaluate.apply(this, arguments);
      }
      return evaluate;
    }()
    /**
     * Make sure that the connector is authenticated to the website.
     * If not, show the login webview to the user to let her/him authenticated.
     * Resolve the promise when authenticated
     *
     * @throws LOGIN_FAILED
     * @returns {Promise.<boolean>} : true if the user is authenticated
     */
    )
  }, {
    key: "ensureAuthenticated",
    value: (function () {
      var _ensureAuthenticated = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee35() {
        return _regenerator.default.wrap(function _callee35$(_context35) {
          while (1) switch (_context35.prev = _context35.next) {
            case 0:
              return _context35.abrupt("return", true);
            case 1:
            case "end":
              return _context35.stop();
          }
        }, _callee35);
      }));
      function ensureAuthenticated() {
        return _ensureAuthenticated.apply(this, arguments);
      }
      return ensureAuthenticated;
    }()
    /**
     * Make sure that the connector is not authenticated anymore to the website.
     *
     * @returns {Promise.<boolean>} : true if the user is not authenticated
     */
    )
  }, {
    key: "ensureNotAuthenticated",
    value: (function () {
      var _ensureNotAuthenticated = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee36() {
        return _regenerator.default.wrap(function _callee36$(_context36) {
          while (1) switch (_context36.prev = _context36.next) {
            case 0:
              return _context36.abrupt("return", true);
            case 1:
            case "end":
              return _context36.stop();
          }
        }, _callee36);
      }));
      function ensureNotAuthenticated() {
        return _ensureNotAuthenticated.apply(this, arguments);
      }
      return ensureNotAuthenticated;
    }()
    /**
     * Returns whatever unique information on the authenticated user which will be usefull
     * to identify fetched data : destination folder name, fetched data metadata
     *
     * @returns {Promise.<object>}  : user data object
     */
    )
  }, {
    key: "getUserDataFromWebsite",
    value: (function () {
      var _getUserDataFromWebsite = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee37() {
        return _regenerator.default.wrap(function _callee37$(_context37) {
          while (1) switch (_context37.prev = _context37.next) {
            case 0:
            case "end":
              return _context37.stop();
          }
        }, _callee37);
      }));
      function getUserDataFromWebsite() {
        return _getUserDataFromWebsite.apply(this, arguments);
      }
      return getUserDataFromWebsite;
    }()
    /**
     * In worker context, send the given data to the pilot to be stored in its own store
     *
     * @param {object} obj : any object with data to store
     */
    )
  }, {
    key: "sendToPilot",
    value: (function () {
      var _sendToPilot = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee38(obj) {
        return _regenerator.default.wrap(function _callee38$(_context38) {
          while (1) switch (_context38.prev = _context38.next) {
            case 0:
              this.onlyIn(WORKER_TYPE, 'sendToPilot');
              if (this.bridge) {
                _context38.next = 3;
                break;
              }
              throw new Error('No bridge is defined, you should call ContentScript.init before using this method');
            case 3:
              return _context38.abrupt("return", this.bridge.call('sendToPilot', obj));
            case 4:
            case "end":
              return _context38.stop();
          }
        }, _callee38, this);
      }));
      function sendToPilot(_x30) {
        return _sendToPilot.apply(this, arguments);
      }
      return sendToPilot;
    }()
    /**
     * Store data sent from worker with sendToPilot method
     *
     * @param {object} obj : any object with data to store
     */
    )
  }, {
    key: "storeFromWorker",
    value: (function () {
      var _storeFromWorker = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee39(obj) {
        return _regenerator.default.wrap(function _callee39$(_context39) {
          while (1) switch (_context39.prev = _context39.next) {
            case 0:
              // @ts-ignore Aucune surcharge ne correspond à cet appel.
              Object.assign(this.store, obj);
            case 1:
            case "end":
              return _context39.stop();
          }
        }, _callee39, this);
      }));
      function storeFromWorker(_x31) {
        return _storeFromWorker.apply(this, arguments);
      }
      return storeFromWorker;
    }())
  }, {
    key: "onlyIn",
    value: function onlyIn(csType, method) {
      if (this.contentScriptType !== csType) {
        throw new Error("Use ".concat(method, " only from the ").concat(csType));
      }
    }

    /**
     * Determine if the konnector must fetch all or parts of the data.
     *
     * @param {object} options - All the data already fetched by the connector in a previous execution.
     *                                   Useful to optimize connector execution by not fetching data we already have.
     * @returns {Promise<object>} - Promise that resolves to an object with the following properties:
     * @property {boolean} shouldFullSync - Indicates if a full synchronization is needed.
     * @property {number|NaN} distanceInDays - The number of days since the last sync, or NaN if not applicable.
     */
  }, {
    key: "shouldFullSync",
    value: (function () {
      var _shouldFullSync = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee40(options) {
        var _trigger$current_stat, _trigger$current_stat2, _trigger$current_stat3, _trigger$current_stat4, _trigger$current_stat5;
        var trigger, flags, forceFullSync, flagFullSync, isFirstJob, isLastJobError, hasLastExecution, distanceInDays, _trigger$current_stat6;
        return _regenerator.default.wrap(function _callee40$(_context40) {
          while (1) switch (_context40.prev = _context40.next) {
            case 0:
              this.onlyIn(PILOT_TYPE, 'shouldFullSync');
              trigger = options.trigger, flags = options.flags;
              forceFullSync = false;
              flagFullSync = false;
              if (flags['clisk.force-full-sync'] === true) {
                this.log('info', 'User forces full sync');
                flagFullSync = true;
              }
              isFirstJob = !((_trigger$current_stat = trigger.current_state) !== null && _trigger$current_stat !== void 0 && _trigger$current_stat.last_failure) && !((_trigger$current_stat2 = trigger.current_state) !== null && _trigger$current_stat2 !== void 0 && _trigger$current_stat2.last_success);
              isLastJobError = !isFirstJob && ((_trigger$current_stat3 = trigger.current_state) === null || _trigger$current_stat3 === void 0 ? void 0 : _trigger$current_stat3.last_failure) > ((_trigger$current_stat4 = trigger.current_state) === null || _trigger$current_stat4 === void 0 ? void 0 : _trigger$current_stat4.last_success);
              hasLastExecution = Boolean((_trigger$current_stat5 = trigger.current_state) === null || _trigger$current_stat5 === void 0 ? void 0 : _trigger$current_stat5.last_execution);
              distanceInDays = 0;
              if (hasLastExecution) {
                distanceInDays = getDateDistanceInDays((_trigger$current_stat6 = trigger.current_state) === null || _trigger$current_stat6 === void 0 ? void 0 : _trigger$current_stat6.last_execution);
              }
              this.log('debug', "distanceInDays: ".concat(distanceInDays));
              if (flagFullSync || !hasLastExecution || isLastJobError || distanceInDays >= 30) {
                this.log('info', '🐢️ Long execution');
                this.log('debug', "isLastJobError: ".concat(isLastJobError, " | hasLastExecution: ").concat(hasLastExecution));
                forceFullSync = true;
              } else {
                this.log('info', '🐇️ Quick execution');
              }
              return _context40.abrupt("return", {
                forceFullSync: forceFullSync,
                distanceInDays: distanceInDays
              });
            case 13:
            case "end":
              return _context40.stop();
          }
        }, _callee40, this);
      }));
      function shouldFullSync(_x32) {
        return _shouldFullSync.apply(this, arguments);
      }
      return shouldFullSync;
    }()
    /**
     * Main function, fetches all connector data and save it to the cozy
     *
     * @param {object} options : options object
     * @param {object} options.context : all the data already fetched by the connector in a previous execution. Will be usefull to optimize
     * connector execution by not fetching data we already have.
     * @returns {Promise.<object>} : Connector execution result. TBD
     */
    // eslint-disable-next-line no-unused-vars
    )
  }, {
    key: "fetch",
    value: (function () {
      var _fetch = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee41(options) {
        return _regenerator.default.wrap(function _callee41$(_context41) {
          while (1) switch (_context41.prev = _context41.next) {
            case 0:
            case "end":
              return _context41.stop();
          }
        }, _callee41);
      }));
      function fetch(_x33) {
        return _fetch.apply(this, arguments);
      }
      return fetch;
    }()
    /**
     * Returns the current clisk version number in package.json file
     */
    )
  }, {
    key: "getCliskVersion",
    value: (function () {
      var _getCliskVersion = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee42() {
        return _regenerator.default.wrap(function _callee42$(_context42) {
          while (1) switch (_context42.prev = _context42.next) {
            case 0:
              return _context42.abrupt("return", _package.default.version);
            case 1:
            case "end":
              return _context42.stop();
          }
        }, _callee42);
      }));
      function getCliskVersion() {
        return _getCliskVersion.apply(this, arguments);
      }
      return getCliskVersion;
    }())
  }]);
  return ContentScript;
}();
function sendPageMessage(message) {
  var _window$ReactNativeWe;
  // @ts-ignore La propriété 'ReactNativeWebView' n'existe pas sur le type 'Window & typeof globalThis'.
  if ((_window$ReactNativeWe = window.ReactNativeWebView) !== null && _window$ReactNativeWe !== void 0 && _window$ReactNativeWe.postMessage) {
    var _window$ReactNativeWe2;
    // @ts-ignore La propriété 'ReactNativeWebView' n'existe pas sur le type 'Window & typeof globalThis'.
    (_window$ReactNativeWe2 = window.ReactNativeWebView) === null || _window$ReactNativeWe2 === void 0 || _window$ReactNativeWe2.postMessage(JSON.stringify({
      message: message
    }));
  } else {
    _log.error('No window.ReactNativeWebView.postMessage available');
  }
}
function getDateDistanceInDays(dateString) {
  var distanceMs = Date.now() - new Date(dateString).getTime();
  var days = 1000 * 60 * 60 * 24;
  return Math.floor(distanceMs / days);
}

/***/ }),
/* 4 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(5);


/***/ }),
/* 5 */
/***/ ((module) => {

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return obj[key];
  }
  try {
    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
    define({}, "");
  } catch (err) {
    define = function(obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunction.displayName = define(
    GeneratorFunctionPrototype,
    toStringTagSymbol,
    "GeneratorFunction"
  );

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      define(prototype, method, function(arg) {
        return this._invoke(method, arg);
      });
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      define(genFun, toStringTagSymbol, "GeneratorFunction");
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  define(Gp, toStringTagSymbol, "Generator");

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   true ? module.exports : 0
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}


/***/ }),
/* 6 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var arrayWithoutHoles = __webpack_require__(7);

var iterableToArray = __webpack_require__(9);

var unsupportedIterableToArray = __webpack_require__(10);

var nonIterableSpread = __webpack_require__(11);

function _toConsumableArray(arr) {
  return arrayWithoutHoles(arr) || iterableToArray(arr) || unsupportedIterableToArray(arr) || nonIterableSpread();
}

module.exports = _toConsumableArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 7 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var arrayLikeToArray = __webpack_require__(8);

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return arrayLikeToArray(arr);
}

module.exports = _arrayWithoutHoles;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 8 */
/***/ ((module) => {

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

module.exports = _arrayLikeToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 9 */
/***/ ((module) => {

function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}

module.exports = _iterableToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 10 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var arrayLikeToArray = __webpack_require__(8);

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
}

module.exports = _unsupportedIterableToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 11 */
/***/ ((module) => {

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

module.exports = _nonIterableSpread;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 12 */
/***/ ((module) => {

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

module.exports = _asyncToGenerator;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 13 */
/***/ ((module) => {

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

module.exports = _classCallCheck;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 14 */
/***/ ((module) => {

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

module.exports = _createClass;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 15 */
/***/ ((module, exports, __webpack_require__) => {

var Minilog = __webpack_require__(16);

var oldEnable = Minilog.enable,
    oldDisable = Minilog.disable,
    isChrome = (typeof navigator != 'undefined' && /chrome/i.test(navigator.userAgent)),
    console = __webpack_require__(20);

// Use a more capable logging backend if on Chrome
Minilog.defaultBackend = (isChrome ? console.minilog : console);

// apply enable inputs from localStorage and from the URL
if(typeof window != 'undefined') {
  try {
    Minilog.enable(JSON.parse(window.localStorage['minilogSettings']));
  } catch(e) {}
  if(window.location && window.location.search) {
    var match = RegExp('[?&]minilog=([^&]*)').exec(window.location.search);
    match && Minilog.enable(decodeURIComponent(match[1]));
  }
}

// Make enable also add to localStorage
Minilog.enable = function() {
  oldEnable.call(Minilog, true);
  try { window.localStorage['minilogSettings'] = JSON.stringify(true); } catch(e) {}
  return this;
};

Minilog.disable = function() {
  oldDisable.call(Minilog);
  try { delete window.localStorage.minilogSettings; } catch(e) {}
  return this;
};

exports = module.exports = Minilog;

exports.backends = {
  array: __webpack_require__(24),
  browser: Minilog.defaultBackend,
  localStorage: __webpack_require__(25),
  jQuery: __webpack_require__(26)
};


/***/ }),
/* 16 */
/***/ ((module, exports, __webpack_require__) => {

var Transform = __webpack_require__(17),
    Filter = __webpack_require__(19);

var log = new Transform(),
    slice = Array.prototype.slice;

exports = module.exports = function create(name) {
  var o   = function() { log.write(name, undefined, slice.call(arguments)); return o; };
  o.debug = function() { log.write(name, 'debug', slice.call(arguments)); return o; };
  o.info  = function() { log.write(name, 'info',  slice.call(arguments)); return o; };
  o.warn  = function() { log.write(name, 'warn',  slice.call(arguments)); return o; };
  o.error = function() { log.write(name, 'error', slice.call(arguments)); return o; };
  o.group = function() { log.write(name, 'group', slice.call(arguments)); return o; };
  o.groupEnd = function() { log.write(name, 'groupEnd', slice.call(arguments)); return o; };
  o.log   = o.debug; // for interface compliance with Node and browser consoles
  o.suggest = exports.suggest;
  o.format = log.format;
  return o;
};

// filled in separately
exports.defaultBackend = exports.defaultFormatter = null;

exports.pipe = function(dest) {
  return log.pipe(dest);
};

exports.end = exports.unpipe = exports.disable = function(from) {
  return log.unpipe(from);
};

exports.Transform = Transform;
exports.Filter = Filter;
// this is the default filter that's applied when .enable() is called normally
// you can bypass it completely and set up your own pipes
exports.suggest = new Filter();

exports.enable = function() {
  if(exports.defaultFormatter) {
    return log.pipe(exports.suggest) // filter
              .pipe(exports.defaultFormatter) // formatter
              .pipe(exports.defaultBackend); // backend
  }
  return log.pipe(exports.suggest) // filter
            .pipe(exports.defaultBackend); // formatter
};



/***/ }),
/* 17 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var microee = __webpack_require__(18);

// Implements a subset of Node's stream.Transform - in a cross-platform manner.
function Transform() {}

microee.mixin(Transform);

// The write() signature is different from Node's
// --> makes it much easier to work with objects in logs.
// One of the lessons from v1 was that it's better to target
// a good browser rather than the lowest common denominator
// internally.
// If you want to use external streams, pipe() to ./stringify.js first.
Transform.prototype.write = function(name, level, args) {
  this.emit('item', name, level, args);
};

Transform.prototype.end = function() {
  this.emit('end');
  this.removeAllListeners();
};

Transform.prototype.pipe = function(dest) {
  var s = this;
  // prevent double piping
  s.emit('unpipe', dest);
  // tell the dest that it's being piped to
  dest.emit('pipe', s);

  function onItem() {
    dest.write.apply(dest, Array.prototype.slice.call(arguments));
  }
  function onEnd() { !dest._isStdio && dest.end(); }

  s.on('item', onItem);
  s.on('end', onEnd);

  s.when('unpipe', function(from) {
    var match = (from === dest) || typeof from == 'undefined';
    if(match) {
      s.removeListener('item', onItem);
      s.removeListener('end', onEnd);
      dest.emit('unpipe');
    }
    return match;
  });

  return dest;
};

Transform.prototype.unpipe = function(from) {
  this.emit('unpipe', from);
  return this;
};

Transform.prototype.format = function(dest) {
  throw new Error([
    'Warning: .format() is deprecated in Minilog v2! Use .pipe() instead. For example:',
    'var Minilog = require(\'minilog\');',
    'Minilog',
    '  .pipe(Minilog.backends.console.formatClean)',
    '  .pipe(Minilog.backends.console);'].join('\n'));
};

Transform.mixin = function(dest) {
  var o = Transform.prototype, k;
  for (k in o) {
    o.hasOwnProperty(k) && (dest.prototype[k] = o[k]);
  }
};

module.exports = Transform;


/***/ }),
/* 18 */
/***/ ((module) => {

function M() { this._events = {}; }
M.prototype = {
  on: function(ev, cb) {
    this._events || (this._events = {});
    var e = this._events;
    (e[ev] || (e[ev] = [])).push(cb);
    return this;
  },
  removeListener: function(ev, cb) {
    var e = this._events[ev] || [], i;
    for(i = e.length-1; i >= 0 && e[i]; i--){
      if(e[i] === cb || e[i].cb === cb) { e.splice(i, 1); }
    }
  },
  removeAllListeners: function(ev) {
    if(!ev) { this._events = {}; }
    else { this._events[ev] && (this._events[ev] = []); }
  },
  listeners: function(ev) {
    return (this._events ? this._events[ev] || [] : []);
  },
  emit: function(ev) {
    this._events || (this._events = {});
    var args = Array.prototype.slice.call(arguments, 1), i, e = this._events[ev] || [];
    for(i = e.length-1; i >= 0 && e[i]; i--){
      e[i].apply(this, args);
    }
    return this;
  },
  when: function(ev, cb) {
    return this.once(ev, cb, true);
  },
  once: function(ev, cb, when) {
    if(!cb) return this;
    function c() {
      if(!when) this.removeListener(ev, c);
      if(cb.apply(this, arguments) && when) this.removeListener(ev, c);
    }
    c.cb = cb;
    this.on(ev, c);
    return this;
  }
};
M.mixin = function(dest) {
  var o = M.prototype, k;
  for (k in o) {
    o.hasOwnProperty(k) && (dest.prototype[k] = o[k]);
  }
};
module.exports = M;


/***/ }),
/* 19 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// default filter
var Transform = __webpack_require__(17);

var levelMap = { debug: 1, info: 2, warn: 3, error: 4 };

function Filter() {
  this.enabled = true;
  this.defaultResult = true;
  this.clear();
}

Transform.mixin(Filter);

// allow all matching, with level >= given level
Filter.prototype.allow = function(name, level) {
  this._white.push({ n: name, l: levelMap[level] });
  return this;
};

// deny all matching, with level <= given level
Filter.prototype.deny = function(name, level) {
  this._black.push({ n: name, l: levelMap[level] });
  return this;
};

Filter.prototype.clear = function() {
  this._white = [];
  this._black = [];
  return this;
};

function test(rule, name) {
  // use .test for RegExps
  return (rule.n.test ? rule.n.test(name) : rule.n == name);
};

Filter.prototype.test = function(name, level) {
  var i, len = Math.max(this._white.length, this._black.length);
  for(i = 0; i < len; i++) {
    if(this._white[i] && test(this._white[i], name) && levelMap[level] >= this._white[i].l) {
      return true;
    }
    if(this._black[i] && test(this._black[i], name) && levelMap[level] <= this._black[i].l) {
      return false;
    }
  }
  return this.defaultResult;
};

Filter.prototype.write = function(name, level, args) {
  if(!this.enabled || this.test(name, level)) {
    return this.emit('item', name, level, args);
  }
};

module.exports = Filter;


/***/ }),
/* 20 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Transform = __webpack_require__(17);

var newlines = /\n+$/,
    logger = new Transform();

logger.write = function(name, level, args) {
  var i = args.length-1;
  if (typeof console === 'undefined' || !console.log) {
    return;
  }
  if(console.log.apply) {
    return console.log.apply(console, [name, level].concat(args));
  } else if(JSON && JSON.stringify) {
    // console.log.apply is undefined in IE8 and IE9
    // for IE8/9: make console.log at least a bit less awful
    if(args[i] && typeof args[i] == 'string') {
      args[i] = args[i].replace(newlines, '');
    }
    try {
      for(i = 0; i < args.length; i++) {
        args[i] = JSON.stringify(args[i]);
      }
    } catch(e) {}
    console.log(args.join(' '));
  }
};

logger.formatters = ['color', 'minilog'];
logger.color = __webpack_require__(21);
logger.minilog = __webpack_require__(23);

module.exports = logger;


/***/ }),
/* 21 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Transform = __webpack_require__(17),
    color = __webpack_require__(22);

var colors = { debug: ['cyan'], info: ['purple' ], warn: [ 'yellow', true ], error: [ 'red', true ] },
    logger = new Transform();

logger.write = function(name, level, args) {
  var fn = console.log;
  if(console[level] && console[level].apply) {
    fn = console[level];
    fn.apply(console, [ '%c'+name+' %c'+level, color('gray'), color.apply(color, colors[level])].concat(args));
  }
};

// NOP, because piping the formatted logs can only cause trouble.
logger.pipe = function() { };

module.exports = logger;


/***/ }),
/* 22 */
/***/ ((module) => {

var hex = {
  black: '#000',
  red: '#c23621',
  green: '#25bc26',
  yellow: '#bbbb00',
  blue:  '#492ee1',
  magenta: '#d338d3',
  cyan: '#33bbc8',
  gray: '#808080',
  purple: '#708'
};
function color(fg, isInverse) {
  if(isInverse) {
    return 'color: #fff; background: '+hex[fg]+';';
  } else {
    return 'color: '+hex[fg]+';';
  }
}

module.exports = color;


/***/ }),
/* 23 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Transform = __webpack_require__(17),
    color = __webpack_require__(22),
    colors = { debug: ['gray'], info: ['purple' ], warn: [ 'yellow', true ], error: [ 'red', true ] },
    logger = new Transform();

logger.write = function(name, level, args) {
  var fn = console.log;
  if(level != 'debug' && console[level]) {
    fn = console[level];
  }

  var subset = [], i = 0;
  if(level != 'info') {
    for(; i < args.length; i++) {
      if(typeof args[i] != 'string') break;
    }
    fn.apply(console, [ '%c'+name +' '+ args.slice(0, i).join(' '), color.apply(color, colors[level]) ].concat(args.slice(i)));
  } else {
    fn.apply(console, [ '%c'+name, color.apply(color, colors[level]) ].concat(args));
  }
};

// NOP, because piping the formatted logs can only cause trouble.
logger.pipe = function() { };

module.exports = logger;


/***/ }),
/* 24 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Transform = __webpack_require__(17),
    cache = [ ];

var logger = new Transform();

logger.write = function(name, level, args) {
  cache.push([ name, level, args ]);
};

// utility functions
logger.get = function() { return cache; };
logger.empty = function() { cache = []; };

module.exports = logger;


/***/ }),
/* 25 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Transform = __webpack_require__(17),
    cache = false;

var logger = new Transform();

logger.write = function(name, level, args) {
  if(typeof window == 'undefined' || typeof JSON == 'undefined' || !JSON.stringify || !JSON.parse) return;
  try {
    if(!cache) { cache = (window.localStorage.minilog ? JSON.parse(window.localStorage.minilog) : []); }
    cache.push([ new Date().toString(), name, level, args ]);
    window.localStorage.minilog = JSON.stringify(cache);
  } catch(e) {}
};

module.exports = logger;

/***/ }),
/* 26 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Transform = __webpack_require__(17);

var cid = new Date().valueOf().toString(36);

function AjaxLogger(options) {
  this.url = options.url || '';
  this.cache = [];
  this.timer = null;
  this.interval = options.interval || 30*1000;
  this.enabled = true;
  this.jQuery = window.jQuery;
  this.extras = {};
}

Transform.mixin(AjaxLogger);

AjaxLogger.prototype.write = function(name, level, args) {
  if(!this.timer) { this.init(); }
  this.cache.push([name, level].concat(args));
};

AjaxLogger.prototype.init = function() {
  if(!this.enabled || !this.jQuery) return;
  var self = this;
  this.timer = setTimeout(function() {
    var i, logs = [], ajaxData, url = self.url;
    if(self.cache.length == 0) return self.init();
    // Test each log line and only log the ones that are valid (e.g. don't have circular references).
    // Slight performance hit but benefit is we log all valid lines.
    for(i = 0; i < self.cache.length; i++) {
      try {
        JSON.stringify(self.cache[i]);
        logs.push(self.cache[i]);
      } catch(e) { }
    }
    if(self.jQuery.isEmptyObject(self.extras)) {
        ajaxData = JSON.stringify({ logs: logs });
        url = self.url + '?client_id=' + cid;
    } else {
        ajaxData = JSON.stringify(self.jQuery.extend({logs: logs}, self.extras));
    }

    self.jQuery.ajax(url, {
      type: 'POST',
      cache: false,
      processData: false,
      data: ajaxData,
      contentType: 'application/json',
      timeout: 10000
    }).success(function(data, status, jqxhr) {
      if(data.interval) {
        self.interval = Math.max(1000, data.interval);
      }
    }).error(function() {
      self.interval = 30000;
    }).always(function() {
      self.init();
    });
    self.cache = [];
  }, this.interval);
};

AjaxLogger.prototype.end = function() {};

// wait until jQuery is defined. Useful if you don't control the load order.
AjaxLogger.jQueryWait = function(onDone) {
  if(typeof window !== 'undefined' && (window.jQuery || window.$)) {
    return onDone(window.jQuery || window.$);
  } else if (typeof window !== 'undefined') {
    setTimeout(function() { AjaxLogger.jQueryWait(onDone); }, 200);
  }
};

module.exports = AjaxLogger;


/***/ }),
/* 27 */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

(function (global, factory) {
	 true ? module.exports = factory() :
	0;
}(this, (function () { 'use strict';

	/*! MIT License © Sindre Sorhus */

	const globals = {};

	const getGlobal = property => {
		/* istanbul ignore next */
		if (typeof self !== 'undefined' && self && property in self) {
			return self;
		}

		/* istanbul ignore next */
		if (typeof window !== 'undefined' && window && property in window) {
			return window;
		}

		if (typeof __webpack_require__.g !== 'undefined' && __webpack_require__.g && property in __webpack_require__.g) {
			return __webpack_require__.g;
		}

		/* istanbul ignore next */
		if (typeof globalThis !== 'undefined' && globalThis) {
			return globalThis;
		}
	};

	const globalProperties = [
		'Headers',
		'Request',
		'Response',
		'ReadableStream',
		'fetch',
		'AbortController',
		'FormData'
	];

	for (const property of globalProperties) {
		Object.defineProperty(globals, property, {
			get() {
				const globalObject = getGlobal(property);
				const value = globalObject && globalObject[property];
				return typeof value === 'function' ? value.bind(globalObject) : value;
			}
		});
	}

	const isObject = value => value !== null && typeof value === 'object';
	const supportsAbortController = typeof globals.AbortController === 'function';
	const supportsStreams = typeof globals.ReadableStream === 'function';
	const supportsFormData = typeof globals.FormData === 'function';

	const mergeHeaders = (source1, source2) => {
		const result = new globals.Headers(source1 || {});
		const isHeadersInstance = source2 instanceof globals.Headers;
		const source = new globals.Headers(source2 || {});

		for (const [key, value] of source) {
			if ((isHeadersInstance && value === 'undefined') || value === undefined) {
				result.delete(key);
			} else {
				result.set(key, value);
			}
		}

		return result;
	};

	const deepMerge = (...sources) => {
		let returnValue = {};
		let headers = {};

		for (const source of sources) {
			if (Array.isArray(source)) {
				if (!(Array.isArray(returnValue))) {
					returnValue = [];
				}

				returnValue = [...returnValue, ...source];
			} else if (isObject(source)) {
				for (let [key, value] of Object.entries(source)) {
					if (isObject(value) && (key in returnValue)) {
						value = deepMerge(returnValue[key], value);
					}

					returnValue = {...returnValue, [key]: value};
				}

				if (isObject(source.headers)) {
					headers = mergeHeaders(headers, source.headers);
				}
			}

			returnValue.headers = headers;
		}

		return returnValue;
	};

	const requestMethods = [
		'get',
		'post',
		'put',
		'patch',
		'head',
		'delete'
	];

	const responseTypes = {
		json: 'application/json',
		text: 'text/*',
		formData: 'multipart/form-data',
		arrayBuffer: '*/*',
		blob: '*/*'
	};

	const retryMethods = [
		'get',
		'put',
		'head',
		'delete',
		'options',
		'trace'
	];

	const retryStatusCodes = [
		408,
		413,
		429,
		500,
		502,
		503,
		504
	];

	const retryAfterStatusCodes = [
		413,
		429,
		503
	];

	const stop = Symbol('stop');

	class HTTPError extends Error {
		constructor(response) {
			// Set the message to the status text, such as Unauthorized,
			// with some fallbacks. This message should never be undefined.
			super(
				response.statusText ||
				String(
					(response.status === 0 || response.status) ?
						response.status : 'Unknown response error'
				)
			);
			this.name = 'HTTPError';
			this.response = response;
		}
	}

	class TimeoutError extends Error {
		constructor(request) {
			super('Request timed out');
			this.name = 'TimeoutError';
			this.request = request;
		}
	}

	const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

	// `Promise.race()` workaround (#91)
	const timeout = (request, abortController, options) =>
		new Promise((resolve, reject) => {
			const timeoutID = setTimeout(() => {
				if (abortController) {
					abortController.abort();
				}

				reject(new TimeoutError(request));
			}, options.timeout);

			/* eslint-disable promise/prefer-await-to-then */
			options.fetch(request)
				.then(resolve)
				.catch(reject)
				.then(() => {
					clearTimeout(timeoutID);
				});
			/* eslint-enable promise/prefer-await-to-then */
		});

	const normalizeRequestMethod = input => requestMethods.includes(input) ? input.toUpperCase() : input;

	const defaultRetryOptions = {
		limit: 2,
		methods: retryMethods,
		statusCodes: retryStatusCodes,
		afterStatusCodes: retryAfterStatusCodes
	};

	const normalizeRetryOptions = (retry = {}) => {
		if (typeof retry === 'number') {
			return {
				...defaultRetryOptions,
				limit: retry
			};
		}

		if (retry.methods && !Array.isArray(retry.methods)) {
			throw new Error('retry.methods must be an array');
		}

		if (retry.statusCodes && !Array.isArray(retry.statusCodes)) {
			throw new Error('retry.statusCodes must be an array');
		}

		return {
			...defaultRetryOptions,
			...retry,
			afterStatusCodes: retryAfterStatusCodes
		};
	};

	// The maximum value of a 32bit int (see issue #117)
	const maxSafeTimeout = 2147483647;

	class Ky {
		constructor(input, options = {}) {
			this._retryCount = 0;
			this._input = input;
			this._options = {
				// TODO: credentials can be removed when the spec change is implemented in all browsers. Context: https://www.chromestatus.com/feature/4539473312350208
				credentials: this._input.credentials || 'same-origin',
				...options,
				headers: mergeHeaders(this._input.headers, options.headers),
				hooks: deepMerge({
					beforeRequest: [],
					beforeRetry: [],
					afterResponse: []
				}, options.hooks),
				method: normalizeRequestMethod(options.method || this._input.method),
				prefixUrl: String(options.prefixUrl || ''),
				retry: normalizeRetryOptions(options.retry),
				throwHttpErrors: options.throwHttpErrors !== false,
				timeout: typeof options.timeout === 'undefined' ? 10000 : options.timeout,
				fetch: options.fetch || globals.fetch
			};

			if (typeof this._input !== 'string' && !(this._input instanceof URL || this._input instanceof globals.Request)) {
				throw new TypeError('`input` must be a string, URL, or Request');
			}

			if (this._options.prefixUrl && typeof this._input === 'string') {
				if (this._input.startsWith('/')) {
					throw new Error('`input` must not begin with a slash when using `prefixUrl`');
				}

				if (!this._options.prefixUrl.endsWith('/')) {
					this._options.prefixUrl += '/';
				}

				this._input = this._options.prefixUrl + this._input;
			}

			if (supportsAbortController) {
				this.abortController = new globals.AbortController();
				if (this._options.signal) {
					this._options.signal.addEventListener('abort', () => {
						this.abortController.abort();
					});
				}

				this._options.signal = this.abortController.signal;
			}

			this.request = new globals.Request(this._input, this._options);

			if (this._options.searchParams) {
				const searchParams = '?' + new URLSearchParams(this._options.searchParams).toString();
				const url = this.request.url.replace(/(?:\?.*?)?(?=#|$)/, searchParams);

				// To provide correct form boundary, Content-Type header should be deleted each time when new Request instantiated from another one
				if (((supportsFormData && this._options.body instanceof globals.FormData) || this._options.body instanceof URLSearchParams) && !(this._options.headers && this._options.headers['content-type'])) {
					this.request.headers.delete('content-type');
				}

				this.request = new globals.Request(new globals.Request(url, this.request), this._options);
			}

			if (this._options.json !== undefined) {
				this._options.body = JSON.stringify(this._options.json);
				this.request.headers.set('content-type', 'application/json');
				this.request = new globals.Request(this.request, {body: this._options.body});
			}

			const fn = async () => {
				if (this._options.timeout > maxSafeTimeout) {
					throw new RangeError(`The \`timeout\` option cannot be greater than ${maxSafeTimeout}`);
				}

				await delay(1);
				let response = await this._fetch();

				for (const hook of this._options.hooks.afterResponse) {
					// eslint-disable-next-line no-await-in-loop
					const modifiedResponse = await hook(
						this.request,
						this._options,
						this._decorateResponse(response.clone())
					);

					if (modifiedResponse instanceof globals.Response) {
						response = modifiedResponse;
					}
				}

				this._decorateResponse(response);

				if (!response.ok && this._options.throwHttpErrors) {
					throw new HTTPError(response);
				}

				// If `onDownloadProgress` is passed, it uses the stream API internally
				/* istanbul ignore next */
				if (this._options.onDownloadProgress) {
					if (typeof this._options.onDownloadProgress !== 'function') {
						throw new TypeError('The `onDownloadProgress` option must be a function');
					}

					if (!supportsStreams) {
						throw new Error('Streams are not supported in your environment. `ReadableStream` is missing.');
					}

					return this._stream(response.clone(), this._options.onDownloadProgress);
				}

				return response;
			};

			const isRetriableMethod = this._options.retry.methods.includes(this.request.method.toLowerCase());
			const result = isRetriableMethod ? this._retry(fn) : fn();

			for (const [type, mimeType] of Object.entries(responseTypes)) {
				result[type] = async () => {
					this.request.headers.set('accept', this.request.headers.get('accept') || mimeType);

					const response = (await result).clone();

					if (type === 'json') {
						if (response.status === 204) {
							return '';
						}

						if (options.parseJson) {
							return options.parseJson(await response.text());
						}
					}

					return response[type]();
				};
			}

			return result;
		}

		_calculateRetryDelay(error) {
			this._retryCount++;

			if (this._retryCount < this._options.retry.limit && !(error instanceof TimeoutError)) {
				if (error instanceof HTTPError) {
					if (!this._options.retry.statusCodes.includes(error.response.status)) {
						return 0;
					}

					const retryAfter = error.response.headers.get('Retry-After');
					if (retryAfter && this._options.retry.afterStatusCodes.includes(error.response.status)) {
						let after = Number(retryAfter);
						if (Number.isNaN(after)) {
							after = Date.parse(retryAfter) - Date.now();
						} else {
							after *= 1000;
						}

						if (typeof this._options.retry.maxRetryAfter !== 'undefined' && after > this._options.retry.maxRetryAfter) {
							return 0;
						}

						return after;
					}

					if (error.response.status === 413) {
						return 0;
					}
				}

				const BACKOFF_FACTOR = 0.3;
				return BACKOFF_FACTOR * (2 ** (this._retryCount - 1)) * 1000;
			}

			return 0;
		}

		_decorateResponse(response) {
			if (this._options.parseJson) {
				response.json = async () => {
					return this._options.parseJson(await response.text());
				};
			}

			return response;
		}

		async _retry(fn) {
			try {
				return await fn();
			} catch (error) {
				const ms = Math.min(this._calculateRetryDelay(error), maxSafeTimeout);
				if (ms !== 0 && this._retryCount > 0) {
					await delay(ms);

					for (const hook of this._options.hooks.beforeRetry) {
						// eslint-disable-next-line no-await-in-loop
						const hookResult = await hook({
							request: this.request,
							options: this._options,
							error,
							retryCount: this._retryCount
						});

						// If `stop` is returned from the hook, the retry process is stopped
						if (hookResult === stop) {
							return;
						}
					}

					return this._retry(fn);
				}

				if (this._options.throwHttpErrors) {
					throw error;
				}
			}
		}

		async _fetch() {
			for (const hook of this._options.hooks.beforeRequest) {
				// eslint-disable-next-line no-await-in-loop
				const result = await hook(this.request, this._options);

				if (result instanceof Request) {
					this.request = result;
					break;
				}

				if (result instanceof Response) {
					return result;
				}
			}

			if (this._options.timeout === false) {
				return this._options.fetch(this.request.clone());
			}

			return timeout(this.request.clone(), this.abortController, this._options);
		}

		/* istanbul ignore next */
		_stream(response, onDownloadProgress) {
			const totalBytes = Number(response.headers.get('content-length')) || 0;
			let transferredBytes = 0;

			return new globals.Response(
				new globals.ReadableStream({
					start(controller) {
						const reader = response.body.getReader();

						if (onDownloadProgress) {
							onDownloadProgress({percent: 0, transferredBytes: 0, totalBytes}, new Uint8Array());
						}

						async function read() {
							const {done, value} = await reader.read();
							if (done) {
								controller.close();
								return;
							}

							if (onDownloadProgress) {
								transferredBytes += value.byteLength;
								const percent = totalBytes === 0 ? 0 : transferredBytes / totalBytes;
								onDownloadProgress({percent, transferredBytes, totalBytes}, value);
							}

							controller.enqueue(value);
							read();
						}

						read();
					}
				})
			);
		}
	}

	const validateAndMerge = (...sources) => {
		for (const source of sources) {
			if ((!isObject(source) || Array.isArray(source)) && typeof source !== 'undefined') {
				throw new TypeError('The `options` argument must be an object');
			}
		}

		return deepMerge({}, ...sources);
	};

	const createInstance = defaults => {
		const ky = (input, options) => new Ky(input, validateAndMerge(defaults, options));

		for (const method of requestMethods) {
			ky[method] = (input, options) => new Ky(input, validateAndMerge(defaults, options, {method}));
		}

		ky.HTTPError = HTTPError;
		ky.TimeoutError = TimeoutError;
		ky.create = newDefaults => createInstance(validateAndMerge(newDefaults));
		ky.extend = newDefaults => createInstance(validateAndMerge(defaults, newDefaults));
		ky.stop = stop;

		return ky;
	};

	var index = createInstance();

	return index;

})));


/***/ }),
/* 28 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AbortError": () => (/* binding */ AbortError),
/* harmony export */   "TimeoutError": () => (/* binding */ TimeoutError),
/* harmony export */   "default": () => (/* binding */ pTimeout)
/* harmony export */ });
class TimeoutError extends Error {
	constructor(message) {
		super(message);
		this.name = 'TimeoutError';
	}
}

/**
An error to be thrown when the request is aborted by AbortController.
DOMException is thrown instead of this Error when DOMException is available.
*/
class AbortError extends Error {
	constructor(message) {
		super();
		this.name = 'AbortError';
		this.message = message;
	}
}

/**
TODO: Remove AbortError and just throw DOMException when targeting Node 18.
*/
const getDOMException = errorMessage => globalThis.DOMException === undefined
	? new AbortError(errorMessage)
	: new DOMException(errorMessage);

/**
TODO: Remove below function and just 'reject(signal.reason)' when targeting Node 18.
*/
const getAbortedReason = signal => {
	const reason = signal.reason === undefined
		? getDOMException('This operation was aborted.')
		: signal.reason;

	return reason instanceof Error ? reason : getDOMException(reason);
};

function pTimeout(promise, options) {
	const {
		milliseconds,
		fallback,
		message,
		customTimers = {setTimeout, clearTimeout},
	} = options;

	let timer;
	let abortHandler;

	const wrappedPromise = new Promise((resolve, reject) => {
		if (typeof milliseconds !== 'number' || Math.sign(milliseconds) !== 1) {
			throw new TypeError(`Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``);
		}

		if (options.signal) {
			const {signal} = options;
			if (signal.aborted) {
				reject(getAbortedReason(signal));
			}

			abortHandler = () => {
				reject(getAbortedReason(signal));
			};

			signal.addEventListener('abort', abortHandler, {once: true});
		}

		if (milliseconds === Number.POSITIVE_INFINITY) {
			promise.then(resolve, reject);
			return;
		}

		// We create the error outside of `setTimeout` to preserve the stack trace.
		const timeoutError = new TimeoutError();

		timer = customTimers.setTimeout.call(undefined, () => {
			if (fallback) {
				try {
					resolve(fallback());
				} catch (error) {
					reject(error);
				}

				return;
			}

			if (typeof promise.cancel === 'function') {
				promise.cancel();
			}

			if (message === false) {
				resolve();
			} else if (message instanceof Error) {
				reject(message);
			} else {
				timeoutError.message = message ?? `Promise timed out after ${milliseconds} milliseconds`;
				reject(timeoutError);
			}
		}, milliseconds);

		(async () => {
			try {
				resolve(await promise);
			} catch (error) {
				reject(error);
			}
		})();
	});

	const cancelablePromise = wrappedPromise.finally(() => {
		cancelablePromise.clear();
		if (abortHandler && options.signal) {
			options.signal.removeEventListener('abort', abortHandler);
		}
	});

	cancelablePromise.clear = () => {
		customTimers.clearTimeout.call(undefined, timer);
		timer = undefined;
	};

	return cancelablePromise;
}


/***/ }),
/* 29 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TimeoutError": () => (/* reexport safe */ p_timeout__WEBPACK_IMPORTED_MODULE_0__.TimeoutError),
/* harmony export */   "default": () => (/* binding */ pWaitFor)
/* harmony export */ });
/* harmony import */ var p_timeout__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(28);


const resolveValue = Symbol('resolveValue');

async function pWaitFor(condition, options = {}) {
	const {
		interval = 20,
		timeout = Number.POSITIVE_INFINITY,
		before = true,
	} = options;

	let retryTimeout;
	let abort = false;

	const promise = new Promise((resolve, reject) => {
		const check = async () => {
			try {
				const value = await condition();

				if (typeof value === 'object' && value[resolveValue]) {
					resolve(value[resolveValue]);
				} else if (typeof value !== 'boolean') {
					throw new TypeError('Expected condition to return a boolean');
				} else if (value === true) {
					resolve();
				} else if (!abort) {
					retryTimeout = setTimeout(check, interval);
				}
			} catch (error) {
				reject(error);
			}
		};

		if (before) {
			check();
		} else {
			retryTimeout = setTimeout(check, interval);
		}
	});

	if (timeout === Number.POSITIVE_INFINITY) {
		return promise;
	}

	try {
		return await (0,p_timeout__WEBPACK_IMPORTED_MODULE_0__["default"])(promise, typeof timeout === 'number' ? {milliseconds: timeout} : timeout);
	} finally {
		abort = true;
		clearTimeout(retryTimeout);
	}
}

pWaitFor.resolveWith = value => ({[resolveValue]: value});




/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.blobToBase64 = blobToBase64;
exports.callStringFunction = callStringFunction;
exports.deserializeStringFunction = deserializeStringFunction;
var _regenerator = _interopRequireDefault(__webpack_require__(4));
var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(12));
/**
 * Convert a blob object to a base64 uri
 *
 * @param {Blob} blob : blob object
 * @returns {Promise.<string>} : base64 form of the blob
 */
function blobToBase64(_x) {
  return _blobToBase.apply(this, arguments);
}
/**
 * Convert a string function to the corresponding function.
 *
 * @param {string} fnString - function string to convert
 * @returns {Function} - the resulting function
 */
function _blobToBase() {
  _blobToBase = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee(blob) {
    var reader;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          reader = new window.FileReader();
          _context.next = 3;
          return new Promise(function (resolve, reject) {
            reader.onload = resolve;
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        case 3:
          return _context.abrupt("return", reader.result);
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _blobToBase.apply(this, arguments);
}
function deserializeStringFunction(fnString) {
  return eval('(' + fnString.trim() + ')');
}

/**
 * Calls and awaits the given string function with given arguments
 *
 * @param {string} fnString - function string to convert
 * @returns {Promise<any>} - the result of the execution of the string function
 */
function callStringFunction(_x2) {
  return _callStringFunction.apply(this, arguments);
}
function _callStringFunction() {
  _callStringFunction = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee2(fnString) {
    var fn,
      _len,
      args,
      _key,
      _args2 = arguments;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          fn = deserializeStringFunction(fnString);
          for (_len = _args2.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = _args2[_key];
          }
          _context2.next = 4;
          return fn.apply(void 0, args);
        case 4:
          return _context2.abrupt("return", _context2.sent);
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _callStringFunction.apply(this, arguments);
}

/***/ }),
/* 31 */
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"name":"cozy-clisk","version":"0.38.2","description":"All the libs needed to run a cozy client connector","repository":{"type":"git","url":"git+https://github.com/konnectors/libs.git"},"files":["dist"],"keywords":["konnector"],"main":"dist/index.js","author":"doubleface <christophe@cozycloud.cc>","license":"MIT","bugs":{"url":"https://github.com/konnectors/libs/issues"},"homepage":"https://github.com/konnectors/libs#readme","scripts":{"lint":"eslint \'src/**/*.js\'","prepublishOnly":"yarn run build","build":"babel --root-mode upward src/ -d dist/ --copy-files --verbose --ignore \'**/*.spec.js\',\'**/*.spec.jsx\'","test":"jest src"},"devDependencies":{"@babel/core":"7.24.0","babel-jest":"29.7.0","babel-preset-cozy-app":"2.1.0","eslint-plugin-import":"^2.29.1","eslint-plugin-jest":"^27.9.0","eslint-plugin-prettier":"^5.1.3","jest":"29.7.0","jest-environment-jsdom":"29.7.0","prettier":"^3.2.5","typescript":"4.9.5"},"dependencies":{"@cozy/minilog":"^1.0.0","bluebird-retry":"^0.11.0","ky":"^0.25.1","lodash":"^4.17.21","microee":"^0.0.6","p-timeout":"^6.0.0","p-wait-for":"^5.0.2","post-me":"^0.4.5"},"peerDependencies":{"cozy-client":">=41.2.0"},"gitHead":"9842e5b91d6df4b059dc691f5c3ace2ebf498759"}');

/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(__webpack_require__(4));
var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(12));
var _classCallCheck2 = _interopRequireDefault(__webpack_require__(13));
var _createClass2 = _interopRequireDefault(__webpack_require__(14));
var _possibleConstructorReturn2 = _interopRequireDefault(__webpack_require__(33));
var _getPrototypeOf2 = _interopRequireDefault(__webpack_require__(36));
var _inherits2 = _interopRequireDefault(__webpack_require__(37));
var _postMe = __webpack_require__(39);
var _ContentScriptMessenger = _interopRequireDefault(__webpack_require__(40));
var _bridgeInterfaces = __webpack_require__(41);
function _callSuper(t, o, e) { return o = (0, _getPrototypeOf2.default)(o), (0, _possibleConstructorReturn2.default)(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], (0, _getPrototypeOf2.default)(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
/**
 * Bridge to the Launcher object via post-me
 */
var LauncherBridge = exports["default"] = /*#__PURE__*/function (_Bridge) {
  (0, _inherits2.default)(LauncherBridge, _Bridge);
  /**
   * Init the window which will be used to communicate with the launcher
   *
   * @param {object} options             : option object
   * @param {object} options.localWindow : The window used to communicate with the launcher
   */
  function LauncherBridge(_ref) {
    var _this;
    var localWindow = _ref.localWindow;
    (0, _classCallCheck2.default)(this, LauncherBridge);
    _this = _callSuper(this, LauncherBridge);
    _this.localWindow = localWindow;
    return _this;
  }
  (0, _createClass2.default)(LauncherBridge, [{
    key: "init",
    value: function () {
      var _init = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee() {
        var _ref2,
          _ref2$exposedMethods,
          exposedMethods,
          messenger,
          _args = arguments;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _ref2 = _args.length > 0 && _args[0] !== undefined ? _args[0] : {}, _ref2$exposedMethods = _ref2.exposedMethods, exposedMethods = _ref2$exposedMethods === void 0 ? {} : _ref2$exposedMethods;
              messenger = new _ContentScriptMessenger.default({
                localWindow: this.localWindow
              });
              _context.next = 4;
              return (0, _postMe.ChildHandshake)(messenger, exposedMethods);
            case 4:
              this.connection = _context.sent;
              this.localHandle = this.connection.localHandle();
              this.remoteHandle = this.connection.remoteHandle();
            case 7:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function init() {
        return _init.apply(this, arguments);
      }
      return init;
    }()
  }]);
  return LauncherBridge;
}(_bridgeInterfaces.Bridge);

/***/ }),
/* 33 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _typeof = (__webpack_require__(34)["default"]);

var assertThisInitialized = __webpack_require__(35);

function _possibleConstructorReturn(self, call) {
  if (call && (_typeof(call) === "object" || typeof call === "function")) {
    return call;
  }

  return assertThisInitialized(self);
}

module.exports = _possibleConstructorReturn;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 34 */
/***/ ((module) => {

function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    module.exports = _typeof = function _typeof(obj) {
      return typeof obj;
    };

    module.exports["default"] = module.exports, module.exports.__esModule = true;
  } else {
    module.exports = _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };

    module.exports["default"] = module.exports, module.exports.__esModule = true;
  }

  return _typeof(obj);
}

module.exports = _typeof;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 35 */
/***/ ((module) => {

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

module.exports = _assertThisInitialized;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 36 */
/***/ ((module) => {

function _getPrototypeOf(o) {
  module.exports = _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  module.exports["default"] = module.exports, module.exports.__esModule = true;
  return _getPrototypeOf(o);
}

module.exports = _getPrototypeOf;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 37 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var setPrototypeOf = __webpack_require__(38);

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) setPrototypeOf(subClass, superClass);
}

module.exports = _inherits;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 38 */
/***/ ((module) => {

function _setPrototypeOf(o, p) {
  module.exports = _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  module.exports["default"] = module.exports, module.exports.__esModule = true;
  return _setPrototypeOf(o, p);
}

module.exports = _setPrototypeOf;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 39 */
/***/ (function(module, exports) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.ChildHandshake = ChildHandshake;
  _exports.DebugMessenger = DebugMessenger;
  _exports.ParentHandshake = ParentHandshake;
  _exports.debug = debug;
  _exports.WorkerMessenger = _exports.WindowMessenger = _exports.PortMessenger = _exports.ConcreteEmitter = _exports.BareMessenger = void 0;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

  function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

  function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

  function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

  function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var MARKER = '@post-me';

  function createUniqueIdFn() {
    var __id = 0;
    return function () {
      var id = __id;
      __id += 1;
      return id;
    };
  }
  /**
   * A concrete implementation of the {@link Emitter} interface
   *
   * @public
   */


  var ConcreteEmitter = /*#__PURE__*/function () {
    function ConcreteEmitter() {
      _classCallCheck(this, ConcreteEmitter);

      this._listeners = {};
    }
    /** {@inheritDoc Emitter.addEventListener} */


    _createClass(ConcreteEmitter, [{
      key: "addEventListener",
      value: function addEventListener(eventName, listener) {
        var listeners = this._listeners[eventName];

        if (!listeners) {
          listeners = new Set();
          this._listeners[eventName] = listeners;
        }

        listeners.add(listener);
      }
      /** {@inheritDoc Emitter.removeEventListener} */

    }, {
      key: "removeEventListener",
      value: function removeEventListener(eventName, listener) {
        var listeners = this._listeners[eventName];

        if (!listeners) {
          return;
        }

        listeners["delete"](listener);
      }
      /** {@inheritDoc Emitter.once} */

    }, {
      key: "once",
      value: function once(eventName) {
        var _this = this;

        return new Promise(function (resolve) {
          var listener = function listener(data) {
            _this.removeEventListener(eventName, listener);

            resolve(data);
          };

          _this.addEventListener(eventName, listener);
        });
      }
      /** @internal */

    }, {
      key: "emit",
      value: function emit(eventName, data) {
        var listeners = this._listeners[eventName];

        if (!listeners) {
          return;
        }

        listeners.forEach(function (listener) {
          listener(data);
        });
      }
      /** @internal */

    }, {
      key: "removeAllListeners",
      value: function removeAllListeners() {
        Object.values(this._listeners).forEach(function (listeners) {
          if (listeners) {
            listeners.clear();
          }
        });
      }
    }]);

    return ConcreteEmitter;
  }();

  _exports.ConcreteEmitter = ConcreteEmitter;
  var MessageType;

  (function (MessageType) {
    MessageType["HandshakeRequest"] = "handshake-request";
    MessageType["HandshakeResponse"] = "handshake-response";
    MessageType["Call"] = "call";
    MessageType["Response"] = "response";
    MessageType["Error"] = "error";
    MessageType["Event"] = "event";
    MessageType["Callback"] = "callback";
  })(MessageType || (MessageType = {})); // Message Creators


  function createHandshakeRequestMessage(sessionId) {
    return {
      type: MARKER,
      action: MessageType.HandshakeRequest,
      sessionId: sessionId
    };
  }

  function createHandshakeResponseMessage(sessionId) {
    return {
      type: MARKER,
      action: MessageType.HandshakeResponse,
      sessionId: sessionId
    };
  }

  function createCallMessage(sessionId, requestId, methodName, args) {
    return {
      type: MARKER,
      action: MessageType.Call,
      sessionId: sessionId,
      requestId: requestId,
      methodName: methodName,
      args: args
    };
  }

  function createResponsMessage(sessionId, requestId, result, error) {
    var message = {
      type: MARKER,
      action: MessageType.Response,
      sessionId: sessionId,
      requestId: requestId
    };

    if (result !== undefined) {
      message.result = result;
    }

    if (error !== undefined) {
      message.error = error;
    }

    return message;
  }

  function createCallbackMessage(sessionId, requestId, callbackId, args) {
    return {
      type: MARKER,
      action: MessageType.Callback,
      sessionId: sessionId,
      requestId: requestId,
      callbackId: callbackId,
      args: args
    };
  }

  function createEventMessage(sessionId, eventName, payload) {
    return {
      type: MARKER,
      action: MessageType.Event,
      sessionId: sessionId,
      eventName: eventName,
      payload: payload
    };
  } // Type Guards


  function isMessage(m) {
    return m && m.type === MARKER;
  }

  function isHandshakeRequestMessage(m) {
    return isMessage(m) && m.action === MessageType.HandshakeRequest;
  }

  function isHandshakeResponseMessage(m) {
    return isMessage(m) && m.action === MessageType.HandshakeResponse;
  }

  function isCallMessage(m) {
    return isMessage(m) && m.action === MessageType.Call;
  }

  function isResponseMessage(m) {
    return isMessage(m) && m.action === MessageType.Response;
  }

  function isCallbackMessage(m) {
    return isMessage(m) && m.action === MessageType.Callback;
  }

  function isEventMessage(m) {
    return isMessage(m) && m.action === MessageType.Event;
  }

  function makeCallbackEvent(requestId) {
    return "callback_".concat(requestId);
  }

  function makeResponseEvent(requestId) {
    return "response_".concat(requestId);
  }

  var Dispatcher = /*#__PURE__*/function (_ConcreteEmitter) {
    _inherits(Dispatcher, _ConcreteEmitter);

    var _super = _createSuper(Dispatcher);

    function Dispatcher(messenger, sessionId) {
      var _this2;

      _classCallCheck(this, Dispatcher);

      _this2 = _super.call(this);
      _this2.uniqueId = createUniqueIdFn();
      _this2.messenger = messenger;
      _this2.sessionId = sessionId;
      _this2.removeMessengerListener = _this2.messenger.addMessageListener(_this2.messengerListener.bind(_assertThisInitialized(_this2)));
      return _this2;
    }

    _createClass(Dispatcher, [{
      key: "messengerListener",
      value: function messengerListener(event) {
        var data = event.data;

        if (!isMessage(data)) {
          return;
        }

        if (this.sessionId !== data.sessionId) {
          return;
        }

        if (isCallMessage(data)) {
          this.emit(MessageType.Call, data);
        } else if (isResponseMessage(data)) {
          this.emit(makeResponseEvent(data.requestId), data);
        } else if (isEventMessage(data)) {
          this.emit(MessageType.Event, data);
        } else if (isCallbackMessage(data)) {
          this.emit(makeCallbackEvent(data.requestId), data);
        }
      }
    }, {
      key: "callOnRemote",
      value: function callOnRemote(methodName, args, transfer) {
        var requestId = this.uniqueId();
        var callbackEvent = makeCallbackEvent(requestId);
        var responseEvent = makeResponseEvent(requestId);
        var message = createCallMessage(this.sessionId, requestId, methodName, args);
        this.messenger.postMessage(message, transfer);
        return {
          callbackEvent: callbackEvent,
          responseEvent: responseEvent
        };
      }
    }, {
      key: "respondToRemote",
      value: function respondToRemote(requestId, value, error, transfer) {
        if (error instanceof Error) {
          error = {
            name: error.name,
            message: error.message
          };
        }

        var message = createResponsMessage(this.sessionId, requestId, value, error);
        this.messenger.postMessage(message, transfer);
      }
    }, {
      key: "callbackToRemote",
      value: function callbackToRemote(requestId, callbackId, args) {
        var message = createCallbackMessage(this.sessionId, requestId, callbackId, args);
        this.messenger.postMessage(message);
      }
    }, {
      key: "emitToRemote",
      value: function emitToRemote(eventName, payload, transfer) {
        var message = createEventMessage(this.sessionId, eventName, payload);
        this.messenger.postMessage(message, transfer);
      }
    }, {
      key: "close",
      value: function close() {
        this.removeMessengerListener();
        this.removeAllListeners();
      }
    }]);

    return Dispatcher;
  }(ConcreteEmitter);

  var ParentHandshakeDispatcher = /*#__PURE__*/function (_ConcreteEmitter2) {
    _inherits(ParentHandshakeDispatcher, _ConcreteEmitter2);

    var _super2 = _createSuper(ParentHandshakeDispatcher);

    function ParentHandshakeDispatcher(messenger, sessionId) {
      var _this3;

      _classCallCheck(this, ParentHandshakeDispatcher);

      _this3 = _super2.call(this);
      _this3.messenger = messenger;
      _this3.sessionId = sessionId;
      _this3.removeMessengerListener = _this3.messenger.addMessageListener(_this3.messengerListener.bind(_assertThisInitialized(_this3)));
      return _this3;
    }

    _createClass(ParentHandshakeDispatcher, [{
      key: "messengerListener",
      value: function messengerListener(event) {
        var data = event.data;

        if (!isMessage(data)) {
          return;
        }

        if (this.sessionId !== data.sessionId) {
          return;
        }

        if (isHandshakeResponseMessage(data)) {
          this.emit(data.sessionId, data);
        }
      }
    }, {
      key: "initiateHandshake",
      value: function initiateHandshake() {
        var message = createHandshakeRequestMessage(this.sessionId);
        this.messenger.postMessage(message);
        return this.sessionId;
      }
    }, {
      key: "close",
      value: function close() {
        this.removeMessengerListener();
        this.removeAllListeners();
      }
    }]);

    return ParentHandshakeDispatcher;
  }(ConcreteEmitter);

  var ChildHandshakeDispatcher = /*#__PURE__*/function (_ConcreteEmitter3) {
    _inherits(ChildHandshakeDispatcher, _ConcreteEmitter3);

    var _super3 = _createSuper(ChildHandshakeDispatcher);

    function ChildHandshakeDispatcher(messenger) {
      var _this4;

      _classCallCheck(this, ChildHandshakeDispatcher);

      _this4 = _super3.call(this);
      _this4.messenger = messenger;
      _this4.removeMessengerListener = _this4.messenger.addMessageListener(_this4.messengerListener.bind(_assertThisInitialized(_this4)));
      return _this4;
    }

    _createClass(ChildHandshakeDispatcher, [{
      key: "messengerListener",
      value: function messengerListener(event) {
        var data = event.data;

        if (isHandshakeRequestMessage(data)) {
          this.emit(MessageType.HandshakeRequest, data);
        }
      }
    }, {
      key: "acceptHandshake",
      value: function acceptHandshake(sessionId) {
        var message = createHandshakeResponseMessage(sessionId);
        this.messenger.postMessage(message);
      }
    }, {
      key: "close",
      value: function close() {
        this.removeMessengerListener();
        this.removeAllListeners();
      }
    }]);

    return ChildHandshakeDispatcher;
  }(ConcreteEmitter);

  var ProxyType;

  (function (ProxyType) {
    ProxyType["Callback"] = "callback";
  })(ProxyType || (ProxyType = {}));

  function createCallbackProxy(callbackId) {
    return {
      type: MARKER,
      proxy: ProxyType.Callback,
      callbackId: callbackId
    };
  }

  function isCallbackProxy(p) {
    return p && p.type === MARKER && p.proxy === ProxyType.Callback;
  }

  var ConcreteRemoteHandle = /*#__PURE__*/function (_ConcreteEmitter4) {
    _inherits(ConcreteRemoteHandle, _ConcreteEmitter4);

    var _super4 = _createSuper(ConcreteRemoteHandle);

    function ConcreteRemoteHandle(dispatcher) {
      var _this5;

      _classCallCheck(this, ConcreteRemoteHandle);

      _this5 = _super4.call(this);
      _this5._dispatcher = dispatcher;
      _this5._callTransfer = {};

      _this5._dispatcher.addEventListener(MessageType.Event, _this5._handleEvent.bind(_assertThisInitialized(_this5)));

      return _this5;
    }

    _createClass(ConcreteRemoteHandle, [{
      key: "close",
      value: function close() {
        this.removeAllListeners();
      }
    }, {
      key: "setCallTransfer",
      value: function setCallTransfer(methodName, transfer) {
        this._callTransfer[methodName] = transfer;
      }
    }, {
      key: "call",
      value: function call(methodName) {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        return this.customCall(methodName, args);
      }
    }, {
      key: "customCall",
      value: function customCall(methodName, args) {
        var _this6 = this;

        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        return new Promise(function (resolve, reject) {
          var sanitizedArgs = [];
          var callbacks = [];
          var callbackId = 0;
          args.forEach(function (arg) {
            if (typeof arg === 'function') {
              callbacks.push(arg);
              sanitizedArgs.push(createCallbackProxy(callbackId));
              callbackId += 1;
            } else {
              sanitizedArgs.push(arg);
            }
          });
          var hasCallbacks = callbacks.length > 0;
          var callbackListener = undefined;

          if (hasCallbacks) {
            callbackListener = function callbackListener(data) {
              var callbackId = data.callbackId,
                  args = data.args;
              callbacks[callbackId].apply(callbacks, _toConsumableArray(args));
            };
          }

          var transfer = options.transfer;

          if (transfer === undefined && _this6._callTransfer[methodName]) {
            var _this6$_callTransfer;

            transfer = (_this6$_callTransfer = _this6._callTransfer)[methodName].apply(_this6$_callTransfer, sanitizedArgs);
          }

          var _this6$_dispatcher$ca = _this6._dispatcher.callOnRemote(methodName, sanitizedArgs, transfer),
              callbackEvent = _this6$_dispatcher$ca.callbackEvent,
              responseEvent = _this6$_dispatcher$ca.responseEvent;

          if (hasCallbacks) {
            _this6._dispatcher.addEventListener(callbackEvent, callbackListener);
          }

          _this6._dispatcher.once(responseEvent).then(function (response) {
            if (callbackListener) {
              _this6._dispatcher.removeEventListener(callbackEvent, callbackListener);
            }

            var result = response.result,
                error = response.error;

            if (error !== undefined) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
      }
    }, {
      key: "_handleEvent",
      value: function _handleEvent(data) {
        var eventName = data.eventName,
            payload = data.payload;
        this.emit(eventName, payload);
      }
    }]);

    return ConcreteRemoteHandle;
  }(ConcreteEmitter);

  var ConcreteLocalHandle = /*#__PURE__*/function () {
    function ConcreteLocalHandle(dispatcher, localMethods) {
      _classCallCheck(this, ConcreteLocalHandle);

      this._dispatcher = dispatcher;
      this._methods = localMethods;
      this._returnTransfer = {};
      this._emitTransfer = {};

      this._dispatcher.addEventListener(MessageType.Call, this._handleCall.bind(this));
    }

    _createClass(ConcreteLocalHandle, [{
      key: "emit",
      value: function emit(eventName, payload) {
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        var transfer = options.transfer;

        if (transfer === undefined && this._emitTransfer[eventName]) {
          transfer = this._emitTransfer[eventName](payload);
        }

        this._dispatcher.emitToRemote(eventName, payload, transfer);
      }
    }, {
      key: "setMethods",
      value: function setMethods(methods) {
        this._methods = methods;
      }
    }, {
      key: "setMethod",
      value: function setMethod(methodName, method) {
        this._methods[methodName] = method;
      }
    }, {
      key: "setReturnTransfer",
      value: function setReturnTransfer(methodName, transfer) {
        this._returnTransfer[methodName] = transfer;
      }
    }, {
      key: "setEmitTransfer",
      value: function setEmitTransfer(eventName, transfer) {
        this._emitTransfer[eventName] = transfer;
      }
    }, {
      key: "_handleCall",
      value: function _handleCall(data) {
        var _this7 = this;

        var requestId = data.requestId,
            methodName = data.methodName,
            args = data.args;
        var callMethod = new Promise(function (resolve, reject) {
          var _this7$_methods;

          var method = _this7._methods[methodName];

          if (typeof method !== 'function') {
            reject(new Error("The method \"".concat(methodName, "\" has not been implemented.")));
            return;
          }

          var desanitizedArgs = args.map(function (arg) {
            if (isCallbackProxy(arg)) {
              var callbackId = arg.callbackId;
              return function () {
                for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                  args[_key2] = arguments[_key2];
                }

                _this7._dispatcher.callbackToRemote(requestId, callbackId, args);
              };
            } else {
              return arg;
            }
          });
          Promise.resolve((_this7$_methods = _this7._methods)[methodName].apply(_this7$_methods, _toConsumableArray(desanitizedArgs))).then(resolve)["catch"](reject);
        });
        callMethod.then(function (result) {
          var transfer;

          if (_this7._returnTransfer[methodName]) {
            transfer = _this7._returnTransfer[methodName](result);
          }

          _this7._dispatcher.respondToRemote(requestId, result, undefined, transfer);
        })["catch"](function (error) {
          _this7._dispatcher.respondToRemote(requestId, undefined, error);
        });
      }
    }]);

    return ConcreteLocalHandle;
  }();

  var ConcreteConnection = /*#__PURE__*/function () {
    function ConcreteConnection(dispatcher, localMethods) {
      _classCallCheck(this, ConcreteConnection);

      this._dispatcher = dispatcher;
      this._localHandle = new ConcreteLocalHandle(dispatcher, localMethods);
      this._remoteHandle = new ConcreteRemoteHandle(dispatcher);
    }

    _createClass(ConcreteConnection, [{
      key: "close",
      value: function close() {
        this._dispatcher.close();

        this.remoteHandle().close();
      }
    }, {
      key: "localHandle",
      value: function localHandle() {
        return this._localHandle;
      }
    }, {
      key: "remoteHandle",
      value: function remoteHandle() {
        return this._remoteHandle;
      }
    }]);

    return ConcreteConnection;
  }();

  var uniqueSessionId = createUniqueIdFn();

  var runUntil = function runUntil(worker, condition, unfulfilled, maxAttempts, attemptInterval) {
    var attempt = 0;

    var fn = function fn() {
      if (!condition() && (attempt < maxAttempts || maxAttempts < 1)) {
        worker();
        attempt += 1;
        setTimeout(fn, attemptInterval);
      } else if (!condition() && attempt >= maxAttempts && maxAttempts >= 1) {
        unfulfilled();
      }
    };

    fn();
  };
  /**
   * Initiate the handshake from the Parent side
   *
   * @param messenger - The Messenger used to send and receive messages from the other end
   * @param localMethods - The methods that will be exposed to the other end
   * @param maxAttempts - The maximum number of handshake attempts
   * @param attemptsInterval - The interval between handshake attempts
   * @returns A Promise to an active {@link Connection} to the other end
   *
   * @public
   */


  function ParentHandshake(messenger) {
    var localMethods = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var maxAttempts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5;
    var attemptsInterval = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
    var thisSessionId = uniqueSessionId();
    var connected = false;
    return new Promise(function (resolve, reject) {
      var handshakeDispatcher = new ParentHandshakeDispatcher(messenger, thisSessionId);
      handshakeDispatcher.once(thisSessionId).then(function (response) {
        connected = true;
        handshakeDispatcher.close();
        var sessionId = response.sessionId;
        var dispatcher = new Dispatcher(messenger, sessionId);
        var connection = new ConcreteConnection(dispatcher, localMethods);
        resolve(connection);
      });
      runUntil(function () {
        return handshakeDispatcher.initiateHandshake();
      }, function () {
        return connected;
      }, function () {
        return reject(new Error("Handshake failed, reached maximum number of attempts"));
      }, maxAttempts, attemptsInterval);
    });
  }
  /**
   * Initiate the handshake from the Child side
   *
   * @param messenger - The Messenger used to send and receive messages from the other end
   * @param localMethods - The methods that will be exposed to the other end
   * @returns A Promise to an active {@link Connection} to the other end
   *
   * @public
   */


  function ChildHandshake(messenger) {
    var localMethods = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return new Promise(function (resolve, reject) {
      var handshakeDispatcher = new ChildHandshakeDispatcher(messenger);
      handshakeDispatcher.once(MessageType.HandshakeRequest).then(function (response) {
        var sessionId = response.sessionId;
        handshakeDispatcher.acceptHandshake(sessionId);
        handshakeDispatcher.close();
        var dispatcher = new Dispatcher(messenger, sessionId);
        var connection = new ConcreteConnection(dispatcher, localMethods);
        resolve(connection);
      });
    });
  }

  var acceptableMessageEvent = function acceptableMessageEvent(event, remoteWindow, acceptedOrigin) {
    var source = event.source,
        origin = event.origin;

    if (source !== remoteWindow) {
      return false;
    }

    if (origin !== acceptedOrigin && acceptedOrigin !== '*') {
      return false;
    }

    return true;
  };
  /**
   * A concrete implementation of {@link Messenger} used to communicate with another Window.
   *
   * @public
   *
   */


  var WindowMessenger = function WindowMessenger(_ref) {
    var localWindow = _ref.localWindow,
        remoteWindow = _ref.remoteWindow,
        remoteOrigin = _ref.remoteOrigin;

    _classCallCheck(this, WindowMessenger);

    localWindow = localWindow || window;

    this.postMessage = function (message, transfer) {
      remoteWindow.postMessage(message, remoteOrigin, transfer);
    };

    this.addMessageListener = function (listener) {
      var outerListener = function outerListener(event) {
        if (acceptableMessageEvent(event, remoteWindow, remoteOrigin)) {
          listener(event);
        }
      };

      localWindow.addEventListener('message', outerListener);

      var removeListener = function removeListener() {
        localWindow.removeEventListener('message', outerListener);
      };

      return removeListener;
    };
  };
  /** @public */


  _exports.WindowMessenger = WindowMessenger;

  var BareMessenger = function BareMessenger(postable) {
    _classCallCheck(this, BareMessenger);

    this.postMessage = function (message) {
      var transfer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      postable.postMessage(message, transfer);
    };

    this.addMessageListener = function (listener) {
      var outerListener = function outerListener(event) {
        listener(event);
      };

      postable.addEventListener('message', outerListener);

      var removeListener = function removeListener() {
        postable.removeEventListener('message', outerListener);
      };

      return removeListener;
    };
  };
  /**
   * A concrete implementation of {@link Messenger} used to communicate with a Worker.
   *
   * Takes a {@link Postable} representing the `Worker` (when calling from
   * the parent context) or the `self` `DedicatedWorkerGlobalScope` object
   * (when calling from the child context).
   *
   * @public
   *
   */


  _exports.BareMessenger = BareMessenger;

  var WorkerMessenger = /*#__PURE__*/function (_BareMessenger) {
    _inherits(WorkerMessenger, _BareMessenger);

    var _super5 = _createSuper(WorkerMessenger);

    function WorkerMessenger(_ref2) {
      var worker = _ref2.worker;

      _classCallCheck(this, WorkerMessenger);

      return _super5.call(this, worker);
    }

    return WorkerMessenger;
  }(BareMessenger);
  /**
   * A concrete implementation of {@link Messenger} used to communicate with a MessagePort.
   *
   * @public
   *
   */


  _exports.WorkerMessenger = WorkerMessenger;

  var PortMessenger = /*#__PURE__*/function (_BareMessenger2) {
    _inherits(PortMessenger, _BareMessenger2);

    var _super6 = _createSuper(PortMessenger);

    function PortMessenger(_ref3) {
      var port = _ref3.port;

      _classCallCheck(this, PortMessenger);

      port.start();
      return _super6.call(this, port);
    }

    return PortMessenger;
  }(BareMessenger);
  /**
   * Create a logger function with a specific namespace
   *
   * @param namespace - The namespace will be prepended to all the arguments passed to the logger function
   * @param log - The underlying logger (`console.log` by default)
   *
   * @public
   *
   */


  _exports.PortMessenger = PortMessenger;

  function debug(namespace, log) {
    log = log || console.debug || console.log || function () {};

    return function () {
      for (var _len3 = arguments.length, data = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        data[_key3] = arguments[_key3];
      }

      log.apply(void 0, [namespace].concat(data));
    };
  }
  /**
   * Decorate a {@link Messenger} so that it will log any message exchanged
   * @param messenger - The Messenger that will be decorated
   * @param log - The logger function that will receive each message
   * @returns A decorated Messenger
   *
   * @public
   *
   */


  function DebugMessenger(messenger, log) {
    log = log || debug('post-me');

    var debugListener = function debugListener(event) {
      var data = event.data;
      log('⬅️ received message', data);
    };

    messenger.addMessageListener(debugListener);
    return {
      postMessage: function postMessage(message, transfer) {
        log('➡️ sending message', message);
        messenger.postMessage(message, transfer);
      },
      addMessageListener: function addMessageListener(listener) {
        return messenger.addMessageListener(listener);
      }
    };
  }
});


/***/ }),
/* 40 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _classCallCheck2 = _interopRequireDefault(__webpack_require__(13));
var _createClass2 = _interopRequireDefault(__webpack_require__(14));
var _possibleConstructorReturn2 = _interopRequireDefault(__webpack_require__(33));
var _getPrototypeOf2 = _interopRequireDefault(__webpack_require__(36));
var _inherits2 = _interopRequireDefault(__webpack_require__(37));
var _bridgeInterfaces = __webpack_require__(41);
function _callSuper(t, o, e) { return o = (0, _getPrototypeOf2.default)(o), (0, _possibleConstructorReturn2.default)(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], (0, _getPrototypeOf2.default)(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); } // @ts-check
/**
 * post-me messenger implementation for a content script implanted in a react native webview
 */
var ReactNativeWebviewMessenger = exports["default"] = /*#__PURE__*/function (_MessengerInterface) {
  (0, _inherits2.default)(ReactNativeWebviewMessenger, _MessengerInterface);
  /**
   * Init the window which will be used to post messages and listen to messages
   *
   * @param  {object} options             : options object
   * @param  {object} options.localWindow : The window object
   */
  function ReactNativeWebviewMessenger(_ref) {
    var _this;
    var localWindow = _ref.localWindow;
    (0, _classCallCheck2.default)(this, ReactNativeWebviewMessenger);
    _this = _callSuper(this, ReactNativeWebviewMessenger);
    _this.localWindow = localWindow;
    return _this;
  }
  (0, _createClass2.default)(ReactNativeWebviewMessenger, [{
    key: "postMessage",
    value: function postMessage(message) {
      this.localWindow.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }, {
    key: "addMessageListener",
    value: function addMessageListener(listener) {
      var _this2 = this;
      var outerListener = function outerListener(event) {
        listener(event);
      };
      this.localWindow.addEventListener('message', outerListener);
      var removeMessageListener = function removeMessageListener() {
        _this2.localWindow.removeEventListener('message', outerListener);
      };
      return removeMessageListener;
    }
  }]);
  return ReactNativeWebviewMessenger;
}(_bridgeInterfaces.MessengerInterface);

/***/ }),
/* 41 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.MessengerInterface = exports.Bridge = void 0;
var _regenerator = _interopRequireDefault(__webpack_require__(4));
var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(12));
var _classCallCheck2 = _interopRequireDefault(__webpack_require__(13));
var _createClass2 = _interopRequireDefault(__webpack_require__(14));
/* eslint-disable no-unused-vars */
/**
 * @typedef PostMeConnection
 * @property {Function} localHandle  : get handle to the local end of the connection
 * @property {Function} remoteHandle : get handle to the remote end of the connection
 * @property {Function} close        : stop listening to incoming message from the other side
 */
/**
 * All bridges are supposed to implement this interface
 */
var Bridge = exports.Bridge = /*#__PURE__*/function () {
  function Bridge() {
    (0, _classCallCheck2.default)(this, Bridge);
  }
  (0, _createClass2.default)(Bridge, [{
    key: "init",
    value: (
    /**
     * Initialize the communication between the parent and the child via post-me protocol
     * https://github.com/alesgenova/post-me
     *
     * @param  {object} options                             : Options object
     * @param  {object} options.root                        : The object which will contain the exposed method names
     * @param  {Array.<string>} options.exposedMethodNames  : The list of method names of the root object, which will be exposed via the post-me interface to the content script
     * @param  {Array.<string>} options.listenedEventsNames : The list of method names of the root object, which will be call on given event name via the post-me interface to the content script
     * @param  {object} options.webViewRef                  : Reference to the webview obect containing the content script
     * @returns {Promise.<PostMeConnection>} : the resulting post-me connection
     */
    function () {
      var _init = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee(options) {
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function init(_x) {
        return _init.apply(this, arguments);
      }
      return init;
    }()
    /**
     * Shortcut to remoteHandle.call method
     *
     * @param  {string} method : The remote method name
     * @param  {Array} args    : Any number of parameters which will be given to the remote method.
     * It is also possible to pass callback functions (which must support serialization). post-me
     * will wait the the remote method end before resolving the promise
     * @returns {Promise.<any>} remote method return value
     */
    )
  }, {
    key: "call",
    value: (function () {
      var _call = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee2(method) {
        var _this$remoteHandle;
        var _len,
          args,
          _key,
          _args2 = arguments;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              for (_len = _args2.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = _args2[_key];
              }
              return _context2.abrupt("return", (_this$remoteHandle = this.remoteHandle).call.apply(_this$remoteHandle, [method].concat(args)));
            case 2:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function call(_x2) {
        return _call.apply(this, arguments);
      }
      return call;
    }()
    /**
     * Shortcut to localHandle.emit method. Will emit an event which could be listened by the remote
     * object
     *
     * @param  {string} eventName : Name of the event
     * @param  {Array} args       : Any number of parameters.
     */
    )
  }, {
    key: "emit",
    value: function emit(eventName) {
      var _this$localHandle;
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      (_this$localHandle = this.localHandle).emit.apply(_this$localHandle, [eventName].concat(args));
    }

    /**
     * Shortcut to remoteHandle.addEventListener method. Will listen to the given event on the remote
     * object and call the listener function
     *
     * @param  {string} remoteEventName : Name of the remove event
     * @param  {Function} listener      : Listener function
     */
  }, {
    key: "addEventListener",
    value: function addEventListener(remoteEventName, listener) {
      this.remoteHandle.addEventListener(remoteEventName, listener);
    }

    /**
     * Shortcut to remoteHandle.removeEventListener method. Will stop listening to the given event
     * on the remote object.
     *
     * @param  {string} remoteEventName : Name of the remote event
     * @param  {Function} listener      : Previously defined listener function
     */
  }, {
    key: "removeEventListener",
    value: function removeEventListener(remoteEventName, listener) {
      this.remoteHandle.removeEventListener(remoteEventName, listener);
    }
  }]);
  return Bridge;
}();
/**
 * All messengers are supposed to implement this interface
 *
 * @interface
 */
var MessengerInterface = exports.MessengerInterface = /*#__PURE__*/function () {
  function MessengerInterface() {
    (0, _classCallCheck2.default)(this, MessengerInterface);
  }
  (0, _createClass2.default)(MessengerInterface, [{
    key: "postMessage",
    value:
    /**
     * Send a message to the other context
     *
     * @param {string} message : The payload of the message
     */
    function postMessage(message) {}

    /**
     * Add a listener to messages received by the other context
     *
     * @param {Function} listener : A listener that will receive the MessageEvent
     * @returns {Function} A function that can be invoked to remove the listener
     */
  }, {
    key: "addMessageListener",
    value: function addMessageListener(listener) {}
  }]);
  return MessengerInterface;
}();

/***/ }),
/* 42 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.dataUriToArrayBuffer = exports.calculateFileKey = void 0;
var _slicedToArray2 = _interopRequireDefault(__webpack_require__(43));
/**
 * @typedef ArrayBufferWithContentType
 * @property {string} contentType - dataUri included content type
 * @property {ArrayBuffer} arrayBuffer - resulting decoded data
 */

/**
 * Converts a data URI string to an Array Buffer with its content Type
 *
 * @param {string} dataURI - data URI string containing content type and base64 encoded data
 * @returns {ArrayBufferWithContentType} : array buffer with content type
 */
var dataUriToArrayBuffer = exports.dataUriToArrayBuffer = function dataUriToArrayBuffer(dataURI) {
  var parsed = dataURI.match(/^data:(.*);base64,(.*)$/);
  if (parsed === null) {
    throw new Error('dataUriToArrayBuffer: dataURI is malformed. Should be in the form data:...;base64,...');
  }
  var _parsed$slice = parsed.slice(1),
    _parsed$slice2 = (0, _slicedToArray2.default)(_parsed$slice, 2),
    contentType = _parsed$slice2[0],
    base64String = _parsed$slice2[1];
  var byteString = __webpack_require__.g.atob(base64String);
  var arrayBuffer = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(arrayBuffer);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return {
    contentType: contentType,
    arrayBuffer: arrayBuffer
  };
};

/**
 * Calculate the file key from an entry given to saveFiles
 *
 * @param {import('../launcher/saveFiles').saveFilesEntry} entry - a savefiles entry
 * @param {Array<string>} fileIdAttributes - list of entry attributes which will be used to identify the entry in a unique way
 * @returns {string} - The resulting file key
 */
var calculateFileKey = exports.calculateFileKey = function calculateFileKey(entry, fileIdAttributes) {
  return fileIdAttributes.sort().map(function (key) {
    return entry === null || entry === void 0 ? void 0 : entry[key];
  }).join('####');
};

/***/ }),
/* 43 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var arrayWithHoles = __webpack_require__(44);

var iterableToArrayLimit = __webpack_require__(45);

var unsupportedIterableToArray = __webpack_require__(10);

var nonIterableRest = __webpack_require__(46);

function _slicedToArray(arr, i) {
  return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || unsupportedIterableToArray(arr, i) || nonIterableRest();
}

module.exports = _slicedToArray;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 44 */
/***/ ((module) => {

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

module.exports = _arrayWithHoles;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 45 */
/***/ ((module) => {

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

module.exports = _iterableToArrayLimit;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 46 */
/***/ ((module) => {

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

module.exports = _nonIterableRest;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 47 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.wrapTimerFactory = exports.wrapTimer = void 0;
var _regenerator = _interopRequireDefault(__webpack_require__(4));
var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(12));
var _defineProperty2 = _interopRequireDefault(__webpack_require__(48));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2.default)(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
/**
 * Create a wrapTimer function with given defaults as options
 *
 * @param {WrapTimerOptions} defaults
 * @returns {Function} - wrapTimer function
 */
var wrapTimerFactory = exports.wrapTimerFactory = function wrapTimerFactory(defaults) {
  return function (obj, name) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return wrapTimer(obj, name, _objectSpread(_objectSpread({}, defaults), options));
  };
};

/**
 * Wrap any async method of an object to display it's time of execution
 *
 * @param {object} obj - The object which will be considered as `this`
 * @param {string} name - The name of the method to wrap
 * @param {WrapTimerOptions} [options] - Options object
 * @returns {Function} - Wrapped async function
 */
var wrapTimer = exports.wrapTimer = function wrapTimer(obj, name) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var _options$displayName = options.displayName,
    displayName = _options$displayName === void 0 ? name : _options$displayName,
    _options$logFn = options.logFn,
    logFn = _options$logFn === void 0 ? console.log.bind(console) : _options$logFn,
    _options$suffixFn = options.suffixFn,
    suffixFn = _options$suffixFn === void 0 ? null : _options$suffixFn;
  var fn = obj[name];
  if (!fn) {
    throw new Error("".concat(name, " cannot be found on ").concat(obj.name || obj.constructor.name));
  }
  return /*#__PURE__*/(0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee() {
    var start,
      res,
      end,
      suffix,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          start = Date.now();
          _context.next = 3;
          return fn.apply(this, _args);
        case 3:
          res = _context.sent;
          end = Date.now();
          suffix = suffixFn ? ' ' + suffixFn(_args) : '';
          logFn("\u231B ".concat(displayName).concat(suffix, " took ").concat(Math.round((end - start) / 10) / 100, "s"));
          return _context.abrupt("return", res);
        case 8:
        case "end":
          return _context.stop();
      }
    }, _callee, this);
  }));
};

/**
 * @typedef WrapTimerOptions
 * @property {string} [options.displayName] - Name which will be displayed in the final log
 * @property {Function} [options.logFn] - logging function. Defaults to console.log
 * @property {Function} [options.suffixFn] - function which will be called with method arguments which return a suffix to the name of the method
 */

/***/ }),
/* 48 */
/***/ ((module) => {

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

module.exports = _defineProperty;
module.exports["default"] = module.exports, module.exports.__esModule = true;

/***/ }),
/* 49 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(__webpack_require__(4));
var _asyncToGenerator2 = _interopRequireDefault(__webpack_require__(12));
var _slicedToArray2 = _interopRequireDefault(__webpack_require__(43));
var _classCallCheck2 = _interopRequireDefault(__webpack_require__(13));
var _createClass2 = _interopRequireDefault(__webpack_require__(14));
var _microee = _interopRequireDefault(__webpack_require__(18));
var _utils = __webpack_require__(30);
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; } /* eslint no-console: off */
/**
 * Intercept any xhr or fetch request corresponding to the given interception list
 */
var RequestInterceptor = /*#__PURE__*/function () {
  /**
   * @function Object() { [native code] }
   * @param {Array<InterceptionDocument>} interceptions - the list of url to intercept
   */
  function RequestInterceptor(interceptions) {
    (0, _classCallCheck2.default)(this, RequestInterceptor);
    this.interceptions = interceptions;
    this.savedSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
    this.savedOpen = window.XMLHttpRequest.prototype.open;
    this.savedFetch = window.fetch;
  }

  /**
   * Restore original request function to default values
   */
  (0, _createClass2.default)(RequestInterceptor, [{
    key: "restore",
    value: function restore() {
      window.XMLHttpRequest.prototype.setRequestHeader = this.savedSetRequestHeader;
      window.XMLHttpRequest.prototype.open = this.savedOpen;
      window.fetch = this.savedFetch;
    }

    /**
     * Init the replacemenet of xhr and fetch function to be able to intercept requests
     */
  }, {
    key: "init",
    value: function init() {
      try {
        var self = this;
        window.XMLHttpRequest.prototype.setRequestHeader = function (key, value) {
          try {
            var newValue = this._requestHeaders[key] ? this._requestHeaders[key] += ', ' + value : value;
            this._requestHeaders[key] = newValue;
            return self.savedSetRequestHeader.apply(this, [].slice.call(arguments));
          } catch (err) {
            this.log('error', '❌❌❌ xhr setRequestHeader interception error ' + err.message);
          }
        };
        window.XMLHttpRequest.prototype.open = function (method, url) {
          try {
            var response = this;
            response._requestHeaders = {};
            response.addEventListener('readystatechange', function () {
              if (response.readyState === 4) {
                var responseHeaders = {};
                var allResponseHeaders = response.getAllResponseHeaders() ? response.getAllResponseHeaders().split('\r\n') : [];
                var _iterator = _createForOfIteratorHelper(allResponseHeaders),
                  _step;
                try {
                  for (_iterator.s(); !(_step = _iterator.n()).done;) {
                    var header = _step.value;
                    var _header$split = header.split(': '),
                      _header$split2 = (0, _slicedToArray2.default)(_header$split, 2),
                      key = _header$split2[0],
                      value = _header$split2[1];
                    responseHeaders[key] = value;
                  }
                } catch (err) {
                  _iterator.e(err);
                } finally {
                  _iterator.f();
                }
                self.serializeAndEmitResponse({
                  method: method,
                  url: url,
                  response: response,
                  responseHeaders: responseHeaders,
                  requestHeaders: response._requestHeaders
                });
              }
              return response;
            });
            return self.savedOpen.apply(response, [].slice.call(arguments));
          } catch (err) {
            this.log('error', '❌❌❌ xhr interception error ' + err.message);
          }
        };
        window.fetch = /*#__PURE__*/(0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee() {
          var _len,
            args,
            _key,
            response,
            input,
            options,
            url,
            method,
            responseHeaders,
            _iterator2,
            _step2,
            _step2$value,
            key,
            value,
            _args = arguments;
          return _regenerator.default.wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                for (_len = _args.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                  args[_key] = _args[_key];
                }
                _context.next = 3;
                return self.savedFetch.apply(window, args);
              case 3:
                response = _context.sent;
                _context.prev = 4;
                input = args[0], options = args[1];
                url = typeof input === 'string' ? input : (input === null || input === void 0 ? void 0 : input.url) || (input === null || input === void 0 ? void 0 : input.toString());
                method = (options === null || options === void 0 ? void 0 : options.method) || (input === null || input === void 0 ? void 0 : input.method) || 'GET';
                responseHeaders = {};
                _iterator2 = _createForOfIteratorHelper(response.headers.entries());
                try {
                  for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                    _step2$value = (0, _slicedToArray2.default)(_step2.value, 2), key = _step2$value[0], value = _step2$value[1];
                    responseHeaders[key] = value;
                  }
                } catch (err) {
                  _iterator2.e(err);
                } finally {
                  _iterator2.f();
                }
                self.serializeAndEmitResponse({
                  method: method,
                  url: url,
                  response: response,
                  responseHeaders: responseHeaders,
                  requestHeaders: options === null || options === void 0 ? void 0 : options.headers
                });
                return _context.abrupt("return", response);
              case 15:
                _context.prev = 15;
                _context.t0 = _context["catch"](4);
                this.log('error', '❌❌❌ fetch interception error ' + _context.t0.message);
              case 18:
              case "end":
                return _context.stop();
            }
          }, _callee, this, [[4, 15]]);
        }));
      } catch (err) {
        this.log('error', '❌❌❌ interceptor init error ' + err.message);
      }
    }
    /**
     * Serialize the intercepted response according to the "serialize" attribute given in the
     * interception list and emit it as a "response" event
     *
     * @param {Response} resp - HTTP response
     */
  }, {
    key: "serializeAndEmitResponse",
    value: (function () {
      var _serializeAndEmitResponse = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee2(resp) {
        var interception;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              interception = this.interceptions.find(function (doc) {
                return resp.method === doc.method && doc.exact ? resp.url === doc.url : resp.url.includes(doc.url);
              });
              if (interception) {
                _context2.next = 3;
                break;
              }
              return _context2.abrupt("return");
            case 3:
              if (interception.label) {
                this.log('warn', "RequestInterceptor: interception.label is deprecated, you should use interception.identifier");
              }
              resp.identifier = interception.identifier || interception.label;

              // response serialization, to be able to transfer to the pilot
              if (!(interception.serialization === 'json')) {
                _context2.next = 15;
                break;
              }
              if (!(resp.response instanceof Response)) {
                _context2.next = 12;
                break;
              }
              _context2.next = 9;
              return resp.response.clone().json();
            case 9:
              resp.response = _context2.sent;
              _context2.next = 13;
              break;
            case 12:
              resp.response = JSON.parse(resp.response.responseText);
            case 13:
              _context2.next = 38;
              break;
            case 15:
              if (!(interception.serialization === 'text')) {
                _context2.next = 25;
                break;
              }
              if (!(resp.response instanceof Response)) {
                _context2.next = 22;
                break;
              }
              _context2.next = 19;
              return resp.response.clone().text();
            case 19:
              resp.response = _context2.sent;
              _context2.next = 23;
              break;
            case 22:
              resp.response = resp.response.responseText;
            case 23:
              _context2.next = 38;
              break;
            case 25:
              if (!(interception.serialization === 'dataUri')) {
                _context2.next = 37;
                break;
              }
              if (!(resp.response instanceof Response)) {
                _context2.next = 34;
                break;
              }
              _context2.t0 = _utils.blobToBase64;
              _context2.next = 30;
              return resp.response.clone().blob();
            case 30:
              _context2.t1 = _context2.sent;
              resp.response = (0, _context2.t0)(_context2.t1);
              _context2.next = 35;
              break;
            case 34:
              resp.response = (0, _utils.blobToBase64)(resp.response.response);
            case 35:
              _context2.next = 38;
              break;
            case 37:
              this.log('error', '❌❌❌ wrong serialization method : ' + interception.serialization);
            case 38:
              this.emit('response', resp);
              this.log('debug', "RequestInterceptor: intercepted ".concat(resp.method, " ").concat(resp.url, " response"));
            case 40:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function serializeAndEmitResponse(_x) {
        return _serializeAndEmitResponse.apply(this, arguments);
      }
      return serializeAndEmitResponse;
    }())
  }, {
    key: "setLogger",
    value: function setLogger(logger) {
      this.log = logger;
    }
  }]);
  return RequestInterceptor;
}();
_microee.default.mixin(RequestInterceptor);
var _default = exports["default"] = RequestInterceptor;
/**
 * @typedef EmittedResponse
 * @property {string} [label] - a name given to the interception (deprecated in favor of identifier)
 * @property {string} identifier - an identifier given to the interception
 * @property {'GET'|'POST'|'PUT'|'DELETE'} method - the method of the intercepted request
 * @property {string} url - the url intercepted request url
 * @property {Response} response - raw response of the intercepted request
 * @property {object} responseHeaders - response headers
 * @property {object} requestHeaders - request headers
 */
/**
 * @typedef InterceptionDocument
 * @property {string} [label] - a name given to the interception, will be found in the response later (deprecated in favor of identifier)
 * @property {string} identifier - an identifier given to the interception
 * @property {string} url - the url to intercept
 * @property {'GET'|'POST'|'PUT'|'DELETE'} method - the method of the url to intercept
 * @property {boolean} exact - true if the intercepted url must exactly correspond to the given url
 */

/***/ }),
/* 50 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Turning the Bankin' API payloads into Cozy documents.
 *
 * Shared by the two halves of the konnector: the client-side part calls the
 * API from the webview, the server-side part still has its own code path for
 * standalone runs. Keeping the mapping here means both produce documents that
 * dedupe against each other.
 */
const accountTypeMapping = __webpack_require__(51)
const operationCategoryMapping = __webpack_require__(52)

/**
 * The banks endpoint answers a country > parent bank > bank tree; flatten it
 * to a bank id -> bank lookup.
 */
const formatBanks = countries => {
  const banks = {}

  countries.forEach(country => {
    country.parent_banks.forEach(parentBank => {
      parentBank.banks.forEach(bank => {
        banks[bank.id] = bank
      })
    })
  })

  return banks
}

const formatAccounts = (accounts, banks) =>
  accounts.map(account => ({
    label: account.name,
    institutionLabel:
      account.bank.id in banks ? banks[account.bank.id].name : 'none',
    balance: account.balance,
    type:
      account.type in accountTypeMapping
        ? accountTypeMapping[account.type]
        : 'none',
    number: String(account.id),
    vendorId: String(account.id)
  }))

const formatOperations = operations =>
  operations.map(operation => ({
    // a bare 'YYYY-MM-DD' is parsed as UTC midnight, which can land on the
    // previous day once rendered in a western timezone: pin it to midday
    date: operation.date + 'T12:00:00.000Z',
    label: operation.description,
    originalBankLabel: operation.raw_description,
    type: 'none',
    automaticCategoryId:
      operation.category.id in operationCategoryMapping
        ? operationCategoryMapping[operation.category.id].cozyCategoryId
        : 0,
    // ISO strings rather than Date objects: the client-side part sends these
    // documents over the launcher bridge, which JSON-serialises them anyway,
    // and cozy-doctypes' matcher reads dates as strings (`op.date.substr`).
    // Keeping strings on both paths makes them produce identical documents.
    dateImport: new Date().toISOString(),
    dateOperation: new Date(operation.date).toISOString(),
    currency: operation.currency_code,
    vendorAccountId: String(operation.account.id),
    vendorId: operation.id,
    amount: operation.amount,
    // kept so the server part can filter out operations that have not
    // happened yet, then dropped before saving
    is_future: operation.is_future
  }))

module.exports = { formatBanks, formatAccounts, formatOperations }


/***/ }),
/* 51 */
/***/ ((module) => {

module.exports = {
  checking: 'bank',
  savings: 'bank',
  securities: 'bank',
  card: 'credit card',
  loan: 'liability',
  share_savings_plan: 'asset',
  pending: 'none',
  life_insurance: 'bank',
  special: 'none',
  unknown: 'none'
}


/***/ }),
/* 52 */
/***/ ((module) => {

module.exports = {
  '1': {
    id: 1,
    name: 'A catégoriser',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '2': {
    id: 2,
    name: "Entrées d'argent",
    cozyCategory: 'incomeCat',
    cozyCategoryId: '200100'
  },
  '3': {
    id: 3,
    name: 'Autres rentrées',
    cozyCategory: 'incomeCat',
    cozyCategoryId: '200100'
  },
  '78': {
    id: 78,
    name: 'Virements',
    cozyCategory: 'potentialTransfer',
    cozyCategoryId: '100'
  },
  '79': {
    id: 79,
    name: 'Frais bancaires',
    cozyCategory: 'bankFees',
    cozyCategoryId: '400340'
  },
  '80': {
    id: 80,
    name: 'Intérêts financiers',
    cozyCategory: 'interests',
    cozyCategoryId: '200130'
  },
  '83': {
    id: 83,
    name: 'Restaurants',
    cozyCategory: 'restaurantsAndBars',
    cozyCategoryId: '400810'
  },
  '84': {
    id: 84,
    name: 'Frais de déplacements - Autres',
    cozyCategory: 'transportation',
    cozyCategoryId: '400200'
  },
  '85': {
    id: 85,
    name: 'Retraits',
    cozyCategory: 'atm',
    cozyCategoryId: '300'
  },
  '87': {
    id: 87,
    name: 'Carburant',
    cozyCategory: 'vehiculeGas',
    cozyCategoryId: '400250'
  },
  '88': {
    id: 88,
    name: 'Chèques',
    cozyCategory: 'check',
    cozyCategoryId: '200'
  },
  '89': {
    id: 89,
    name: 'Remboursement emprunt',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '90': {
    id: 90,
    name: 'Frais généraux - Autres',
    cozyCategory: 'services',
    cozyCategoryId: '400300'
  },
  '159': {
    id: 159,
    name: 'Impôts & Taxes',
    cozyCategory: 'tax',
    cozyCategoryId: '400500'
  },
  '160': {
    id: 160,
    name: 'Divers',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '161': {
    id: 161,
    name: 'Logement',
    cozyCategory: 'homeAndRealEstate',
    cozyCategoryId: '401000'
  },
  '162': {
    id: 162,
    name: 'Achats & Shopping',
    cozyCategory: 'shoppingECommerce',
    cozyCategoryId: '400112'
  },
  '163': {
    id: 163,
    name: 'Santé',
    cozyCategory: 'health',
    cozyCategoryId: '400600'
  },
  '164': {
    id: 164,
    name: 'Banque',
    cozyCategory: 'bankFees',
    cozyCategoryId: '400340'
  },
  '165': {
    id: 165,
    name: 'Auto & Transports',
    cozyCategory: 'transportation',
    cozyCategoryId: '400200'
  },
  '166': {
    id: 166,
    name: 'Dépenses pro',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '167': {
    id: 167,
    name: 'Scolarité & Enfants',
    cozyCategory: 'educationAndTraining',
    cozyCategoryId: '400900'
  },
  '168': {
    id: 168,
    name: 'Alimentation & Restau.',
    cozyCategory: 'supermarket',
    cozyCategoryId: '400110'
  },
  '170': {
    id: 170,
    name: 'Loisirs & Sorties',
    cozyCategory: 'activities',
    cozyCategoryId: '400700'
  },
  '171': {
    id: 171,
    name: 'Abonnements',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '180': {
    id: 180,
    name: 'Internet',
    cozyCategory: 'telecom',
    cozyCategoryId: '400150'
  },
  '183': {
    id: 183,
    name: 'Cadeaux',
    cozyCategory: 'toysAndGifts',
    cozyCategoryId: '400450'
  },
  '184': {
    id: 184,
    name: 'Matériel',
    cozyCategory: 'shoppingECommerce',
    cozyCategoryId: '400112'
  },
  '186': {
    id: 186,
    name: 'Achats & Shopping - Autres',
    cozyCategory: 'shoppingECommerce',
    cozyCategoryId: '400112'
  },
  '188': {
    id: 188,
    name: 'Alimentation - Autres',
    cozyCategory: 'supermarket',
    cozyCategoryId: '400110'
  },
  '191': {
    id: 191,
    name: 'Débit mensuel carte',
    cozyCategory: 'bankFees',
    cozyCategoryId: '400340'
  },
  '192': {
    id: 192,
    name: 'Epargne',
    cozyCategory: 'savings',
    cozyCategoryId: '600170'
  },
  '194': {
    id: 194,
    name: 'Hypothèque',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '195': {
    id: 195,
    name: 'Banque - Autres',
    cozyCategory: 'bankFees',
    cozyCategoryId: '400340'
  },
  '196': {
    id: 196,
    name: 'Transports en commun',
    cozyCategory: 'publicTransportation',
    cozyCategoryId: '400280'
  },
  '197': {
    id: 197,
    name: 'Billets de train',
    cozyCategory: 'journey',
    cozyCategoryId: '400850'
  },
  '198': {
    id: 198,
    name: "Billets d'avion",
    cozyCategory: 'journey',
    cozyCategoryId: '400850'
  },
  '202': {
    id: 202,
    name: 'Publicité',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '203': {
    id: 203,
    name: 'Maintenance bureaux',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '204': {
    id: 204,
    name: "Frais d'expéditions",
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '205': {
    id: 205,
    name: "Frais d'impressions",
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '206': {
    id: 206,
    name: 'Impôts & Taxes - Autres',
    cozyCategory: 'tax',
    cozyCategoryId: '400500'
  },
  '207': {
    id: 207,
    name: 'Amendes',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '208': {
    id: 208,
    name: 'IS',
    cozyCategory: 'realEstateTax',
    cozyCategoryId: '400540'
  },
  '209': {
    id: 209,
    name: 'CFE',
    cozyCategory: 'realEstateTax',
    cozyCategoryId: '400540'
  },
  '216': {
    id: 216,
    name: 'Loyer / Locaux',
    cozyCategory: 'rent',
    cozyCategoryId: '401020'
  },
  '217': {
    id: 217,
    name: 'Electricité',
    cozyCategory: 'power',
    cozyCategoryId: '401080'
  },
  '218': {
    id: 218,
    name: 'Gaz',
    cozyCategory: 'power',
    cozyCategoryId: '401080'
  },
  '219': {
    id: 219,
    name: 'Câble / Satellite',
    cozyCategory: 'telecom',
    cozyCategoryId: '400150'
  },
  '220': {
    id: 220,
    name: 'Bureaux - Autres',
    cozyCategory: 'professionalExpenses',
    cozyCategoryId: '600140'
  },
  '221': {
    id: 221,
    name: 'Décoration',
    cozyCategory: 'homeImprovement',
    cozyCategoryId: '401050'
  },
  '222': {
    id: 222,
    name: 'Entretien',
    cozyCategory: 'homeCharges',
    cozyCategoryId: '401030'
  },
  '223': {
    id: 223,
    name: 'Loisirs & Sorties - Autres',
    cozyCategory: 'activities',
    cozyCategoryId: '400700'
  },
  '224': {
    id: 224,
    name: 'Frais Animaux',
    cozyCategory: 'pets',
    cozyCategoryId: '400140'
  },
  '226': {
    id: 226,
    name: 'Hobbies',
    cozyCategory: 'hobbyAndPassion',
    cozyCategoryId: '400760'
  },
  '227': {
    id: 227,
    name: 'Bars / Clubs',
    cozyCategory: 'restaurantsAndBars',
    cozyCategoryId: '400810'
  },
  '230': {
    id: 230,
    name: 'Salaires',
    cozyCategory: 'activityIncome',
    cozyCategoryId: '200110'
  },
  '231': {
    id: 231,
    name: 'Ventes de biens',
    cozyCategory: 'incomeCat',
    cozyCategoryId: '200100'
  },
  '232': {
    id: 232,
    name: 'Ventes de services',
    cozyCategory: 'incomeCat',
    cozyCategoryId: '200100'
  },
  '233': {
    id: 233,
    name: 'Extra',
    cozyCategory: 'additionalIncome',
    cozyCategoryId: '200180'
  },
  '235': {
    id: 235,
    name: 'Coiffeur',
    cozyCategory: 'personalCare',
    cozyCategoryId: '400190'
  },
  '236': {
    id: 236,
    name: 'Pharmacie',
    cozyCategory: 'health',
    cozyCategoryId: '400600'
  },
  '237': {
    id: 237,
    name: 'Scolarité & Enfants - Autres',
    cozyCategory: 'educationAndTraining',
    cozyCategoryId: '400900'
  },
  '238': {
    id: 238,
    name: 'Fournitures scolaires',
    cozyCategory: 'eduBooksAndSupplies',
    cozyCategoryId: '400920'
  },
  '239': {
    id: 239,
    name: 'Ecole',
    cozyCategory: 'tuition',
    cozyCategoryId: '400910'
  },
  '240': {
    id: 240,
    name: 'Pensions',
    cozyCategory: 'educationAndTraining',
    cozyCategoryId: '400900'
  },
  '241': {
    id: 241,
    name: 'Logement étudiant',
    cozyCategory: 'homeCharges',
    cozyCategoryId: '401030'
  },
  '242': {
    id: 242,
    name: 'Sport',
    cozyCategory: 'activities',
    cozyCategoryId: '400700'
  },
  '243': {
    id: 243,
    name: 'Livres',
    cozyCategory: 'booksMoviesMusic',
    cozyCategoryId: '400750'
  },
  '244': {
    id: 244,
    name: 'Sorties culturelles',
    cozyCategory: 'goingOutCulture',
    cozyCategoryId: '400830'
  },
  '245': {
    id: 245,
    name: 'Mutuelle',
    cozyCategory: 'healthInsurance',
    cozyCategoryId: '400620'
  },
  '246': {
    id: 246,
    name: 'Assurance habitation',
    cozyCategory: 'homeInsurance',
    cozyCategoryId: '401040'
  },
  '247': {
    id: 247,
    name: 'Assurance véhicule',
    cozyCategory: 'vehiculeInsurance',
    cozyCategoryId: '400230'
  },
  '248': {
    id: 248,
    name: 'Cosmétique',
    cozyCategory: 'personalCare',
    cozyCategoryId: '400190'
  },
  '249': {
    id: 249,
    name: 'Voyages / Vacances',
    cozyCategory: 'travel',
    cozyCategoryId: '400840'
  },
  '251': {
    id: 251,
    name: 'Stationnement',
    cozyCategory: 'parkingAndToll',
    cozyCategoryId: '400270'
  },
  '258': {
    id: 258,
    name: 'Téléphonie fixe',
    cozyCategory: 'telecom',
    cozyCategoryId: '400150'
  },
  '259': {
    id: 259,
    name: 'Prêt étudiant',
    cozyCategory: 'studentLoan',
    cozyCategoryId: '400930'
  },
  '260': {
    id: 260,
    name: 'Restauration rapide',
    cozyCategory: 'restaurantsAndBars',
    cozyCategoryId: '400810'
  },
  '261': {
    id: 261,
    name: 'Médecin',
    cozyCategory: 'health',
    cozyCategoryId: '400600'
  },
  '262': {
    id: 262,
    name: 'Articles de sport',
    cozyCategory: 'activityEquipments',
    cozyCategoryId: '400720'
  },
  '263': {
    id: 263,
    name: 'Hôtels',
    cozyCategory: 'goingOutAndTravel',
    cozyCategoryId: '400800'
  },
  '264': {
    id: 264,
    name: 'Location de véhicule',
    cozyCategory: 'vehiculeRental',
    cozyCategoryId: '400220'
  },
  '265': {
    id: 265,
    name: 'Notes de frais',
    cozyCategory: 'professionalExpenses',
    cozyCategoryId: '600140'
  },
  '266': {
    id: 266,
    name: 'Jouets',
    cozyCategory: 'toysAndGifts',
    cozyCategoryId: '400450'
  },
  '267': {
    id: 267,
    name: 'Baby-sitters & Crèches',
    cozyCategory: 'childCare',
    cozyCategoryId: '400430'
  },
  '268': {
    id: 268,
    name: 'Santé - Autres',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '269': {
    id: 269,
    name: 'Divertissements',
    cozyCategory: 'activities',
    cozyCategoryId: '400700'
  },
  '270': {
    id: 270,
    name: 'Services en ligne',
    cozyCategory: 'services',
    cozyCategoryId: '400300'
  },
  '271': {
    id: 271,
    name: "Dépôt d'argent",
    cozyCategory: 'incomeCat',
    cozyCategoryId: '200100'
  },
  '272': {
    id: 272,
    name: 'Vêtements/Chaussures',
    cozyCategory: 'dressing',
    cozyCategoryId: '400130'
  },
  '273': {
    id: 273,
    name: 'Supermarché / Epicerie',
    cozyCategory: 'supermarket',
    cozyCategoryId: '400110'
  },
  '274': {
    id: 274,
    name: 'Fournitures de bureau',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '276': {
    id: 276,
    name: 'Autres dépenses',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '277': {
    id: 277,
    name: 'Téléphonie mobile',
    cozyCategory: 'telecom',
    cozyCategoryId: '400150'
  },
  '278': {
    id: 278,
    name: 'Assurance',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '279': {
    id: 279,
    name: 'Retraite',
    cozyCategory: 'retirement',
    cozyCategoryId: '200190'
  },
  '280': {
    id: 280,
    name: 'Abonnements - Autres',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '282': {
    id: 282,
    name: 'Virements internes',
    cozyCategory: 'internalTransfer',
    cozyCategoryId: '600110'
  },
  '283': {
    id: 283,
    name: 'Remboursements pro',
    cozyCategory: 'additionalIncome',
    cozyCategoryId: '200180'
  },
  '288': {
    id: 288,
    name: 'Entretien véhicule',
    cozyCategory: 'vehiculeMaintenance',
    cozyCategoryId: '400240'
  },
  '289': {
    id: 289,
    name: 'Economies',
    cozyCategory: 'additionalIncome',
    cozyCategoryId: '200180'
  },
  '293': {
    id: 293,
    name: 'Eau',
    cozyCategory: 'water',
    cozyCategoryId: '401070'
  },
  '294': {
    id: 294,
    name: 'Dons',
    cozyCategory: 'donationsReceived',
    cozyCategoryId: '200150'
  },
  '302': {
    id: 302,
    name: 'Taxes',
    cozyCategory: 'tax',
    cozyCategoryId: '400500'
  },
  '303': {
    id: 303,
    name: 'Retraits, Chq. et Vir.',
    cozyCategory: 'atm',
    cozyCategoryId: '300'
  },
  '306': {
    id: 306,
    name: 'Services Bancaires',
    cozyCategory: 'bankFees',
    cozyCategoryId: '400340'
  },
  '308': {
    id: 308,
    name: 'Tabac',
    cozyCategory: 'tobaccoPress',
    cozyCategoryId: '400111'
  },
  '309': {
    id: 309,
    name: 'Péage',
    cozyCategory: 'parkingAndToll',
    cozyCategoryId: '400270'
  },
  '310': {
    id: 310,
    name: "Sports d'hiver",
    cozyCategory: 'activities',
    cozyCategoryId: '400700'
  },
  '313': {
    id: 313,
    name: 'Café',
    cozyCategory: 'restaurantsAndBars',
    cozyCategoryId: '400810'
  },
  '314': {
    id: 314,
    name: 'Loyers reçus',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '315': {
    id: 315,
    name: 'Esthétique & Soins',
    cozyCategory: 'personalCare',
    cozyCategoryId: '400190'
  },
  '316': {
    id: 316,
    name: 'Spa & Massage',
    cozyCategory: 'personalCare',
    cozyCategoryId: '400190'
  },
  '317': {
    id: 317,
    name: 'Esthétique & Soins - Autres',
    cozyCategory: 'personalCare',
    cozyCategoryId: '400190'
  },
  '318': {
    id: 318,
    name: 'Musique',
    cozyCategory: 'booksMoviesMusic',
    cozyCategoryId: '400750'
  },
  '319': {
    id: 319,
    name: 'Films & DVDs',
    cozyCategory: 'booksMoviesMusic',
    cozyCategoryId: '400750'
  },
  '320': {
    id: 320,
    name: 'Sortie au restaurant',
    cozyCategory: 'restaurantsAndBars',
    cozyCategoryId: '400810'
  },
  '321': {
    id: 321,
    name: 'Esthétique',
    cozyCategory: 'personalCare',
    cozyCategoryId: '400190'
  },
  '322': {
    id: 322,
    name: 'Opticien / Ophtalmo.',
    cozyCategory: 'healthExpenses',
    cozyCategoryId: '400610'
  },
  '323': {
    id: 323,
    name: 'Extérieur et jardin',
    cozyCategory: 'homeImprovement',
    cozyCategoryId: '401050'
  },
  '324': {
    id: 324,
    name: 'Pressing',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '325': {
    id: 325,
    name: 'Dentiste',
    cozyCategory: 'healthExpenses',
    cozyCategoryId: '400610'
  },
  '326': {
    id: 326,
    name: 'Virements internes',
    cozyCategory: 'internalTransfer',
    cozyCategoryId: '600110'
  },
  '327': {
    id: 327,
    name: 'Allocations et pensions',
    cozyCategory: 'allocations',
    cozyCategoryId: '200160'
  },
  '328': {
    id: 328,
    name: 'Charges diverses',
    cozyCategory: 'homeCharges',
    cozyCategoryId: '401030'
  },
  '441886': {
    id: 441886,
    name: 'Cotisations Sociales',
    cozyCategory: 'professionalExpenses',
    cozyCategoryId: '600140'
  },
  '441888': {
    id: 441888,
    name: 'Licenses',
    cozyCategory: 'shoppingECommerce',
    cozyCategoryId: '400112'
  },
  '441889': {
    id: 441889,
    name: 'Comptabilité',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441890': {
    id: 441890,
    name: 'Salaires',
    cozyCategory: 'activityIncome',
    cozyCategoryId: '200110'
  },
  '441891': {
    id: 441891,
    name: 'Rémunérations dirigeants',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441892': {
    id: 441892,
    name: 'Frais de recrutement',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441893': {
    id: 441893,
    name: 'Subventions',
    cozyCategory: 'additionalIncome',
    cozyCategoryId: '200180'
  },
  '441894': {
    id: 441894,
    name: 'Prêt',
    cozyCategory: 'loanCredit',
    cozyCategoryId: '600130'
  },
  '441895': {
    id: 441895,
    name: 'Conseils',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441896': {
    id: 441896,
    name: 'Sous-traitance informatique',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441897': {
    id: 441897,
    name: 'Prévoyance',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441898': {
    id: 441898,
    name: "Taxe d'apprentissage",
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441899': {
    id: 441899,
    name: 'Frais juridique',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441900': {
    id: 441900,
    name: 'Marketing - Autres',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  },
  '441988': {
    id: 441988,
    name: 'TVA',
    cozyCategory: 'uncategorized',
    cozyCategoryId: '0'
  }
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var cozy_clisk_dist_contentscript__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _cozy_minilog__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(15);
/* harmony import */ var _cozy_minilog__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_cozy_minilog__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _bankin_format__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(50);
/* harmony import */ var _bankin_format__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_bankin_format__WEBPACK_IMPORTED_MODULE_2__);
/**
 * Client-side part of the Bankin' konnector.
 *
 * Bankin' put an hCaptcha in front of /v2/authenticate, so a server cannot log
 * in any more: the challenge is checked before the credentials, a wrong
 * password gets the very same `challenge_required` answer. The user therefore
 * signs in inside the webview, solving the captcha themselves.
 *
 * Every call to the Bankin' API is then made *from the webview*, so they all
 * come from the user's own IP with the webview user agent, exactly like a
 * normal use of the app. The server part never talks to Bankin': it only
 * receives the collected data and writes it to the Cozy.
 */
// Import the subpath, not the package root: the root re-exports cozy-client,
// which pulls react into the webview bundle. cozy-clisk is pinned to 0.38.2
// for the same reason, 0.42 having an "exports" field that hides this path.





const log = _cozy_minilog__WEBPACK_IMPORTED_MODULE_1___default()('ContentScript')
_cozy_minilog__WEBPACK_IMPORTED_MODULE_1___default().enable()

const baseUrl = 'https://app2.bankin.com'
const apiUrl = 'https://sync.bankin.com'
const bankinVersion = '2018-06-15'
// Cookie names used by the web app, read from its bundle. They are minified
// and could be renamed by a redeploy, so they are only the preferred names:
// findAccessToken/findDeviceId fall back to recognising the value itself.
const ACCESS_TOKEN_COOKIE = 'bwAt'
const DEVICE_ID_COOKIE = 'bwDi'
// Cookies that make up a Bankin session. The device id is deliberately NOT
// restored: the API ties a token to the device it was issued for, so putting
// an old device back in the page makes every freshly obtained token be
// rejected. Let the app manage bwDi itself.
// The access token is deliberately absent. Writing it back creates a second
// cookie of the same name — ours is host-only, the app's is set on the parent
// domain — and document.cookie then returns ours, hiding the live session
// behind a dead token. It only lives two hours anyway, so restoring it buys
// almost nothing.
const SESSION_COOKIES = ['bwLg', 'bwPs']
// ...but it is still part of a session and must go when we drop one.
const DEVICE_COOKIE_TO_WIPE = 'bwDi'
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// No API client is hardcoded here. It is read at runtime from the Bankin' web
// app itself (see readWebAppApiClient): the app ships its client to every
// visitor, so the konnector picks it up the same way instead of carrying a
// copy. The account fields and a build-time value still take precedence.
const DEFAULT_CLIENT_ID = null
const DEFAULT_CLIENT_SECRET = null

// Always re-read this many days, whatever is already saved: a bank can
// confirm an operation days late, and a pending one changes when it settles.
const ALWAYS_REFETCH_DAYS = 30
// A quiet stretch longer than this between two saved days is treated as a
// missed run rather than a bank that moved no money.
const HOLE_GAP_DAYS = 10
// When the saved history stops dead (the old 3 month window), extend it by
// this much per run instead of pulling everything at once.
const BACKFILL_DAYS = 180

// CouchDB refuses documents above 8 MB and the payload rides in the account
// document; ~370 bytes per operation leaves plenty of room at this size.
const MAX_OPERATIONS_PER_BATCH = 5000

/**
 * Cut the collected data into slices small enough for the account document.
 * Every slice carries all the accounts: the server part needs them to attach
 * the operations, and they are tiny compared to the operations.
 */
const splitOperations = (bankinData, size) => {
  const { accounts, allOperations } = bankinData
  if (allOperations.length <= size) return [bankinData]
  const batches = []
  for (let i = 0; i < allOperations.length; i += size) {
    batches.push({ accounts, allOperations: allOperations.slice(i, i + size) })
  }
  return batches
}

// The access token lives two hours (maxAge 0x1c20 in the app bundle). It is
// written back with exactly that lifetime, and never restored once older,
// so the page cannot end up holding a token that outlived its validity.
const TOKEN_LIFETIME_SECONDS = 7200

// After a login the app needs a moment to store its session; poll instead of
// trusting the first value the page exposes.
const SESSION_READY_ATTEMPTS = 6
const SESSION_READY_DELAY_MS = 1000

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const dateMinusDays = (day, count) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - count)
  return date.toISOString().slice(0, 10)
}

const daysBetween = (from, to) =>
  Math.round(
    (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000
  )

// The sourceAccountIdentifier must be byte-for-byte the same on every run,
// see getUserDataFromWebsite.
const normalizeEmail = email => String(email).trim().toLowerCase()

// ---------------------------------------------------------------------------
// Watching the app's own API traffic
//
// Every version of this konnector so far tried to work out *where* the app
// keeps its session — a cookie, sessionStorage, the native jar — and every one
// of them ended up reading a token the API answered "expired" to, seconds
// after a successful login. Guessing the storage is the wrong problem.
//
// Whatever it stores and wherever it stores it, the app puts the token it
// considers current in the Authorization header of every call it makes, and
// receives a brand new one in the body of /v2/authenticate. Watching those two
// things gives the live session with no guesswork at all, and answers the
// question the logs never could: does the app re-authenticate when the user
// signs in, or does it reuse something stale?
// ---------------------------------------------------------------------------

// Requests made by the konnector carry this header so the watcher can tell
// them from the app's, and never hands back a token it supplied itself.
const OWN_REQUEST_MARK = 'X-Cozy-Konnector'

const captured = {
  accessToken: null,
  deviceId: null,
  // where the token came from, for the logs
  from: null,
  // did the app really call /v2/authenticate during this run?
  authenticateSeen: false
}

const resetCapturedAuth = () => {
  captured.accessToken = null
  captured.deviceId = null
  captured.from = null
  captured.authenticateSeen = false
}

const headerLookup = headers => name => {
  if (!headers) return null
  if (typeof headers.get === 'function') return headers.get(name)
  const key = Object.keys(headers).find(
    candidate => candidate.toLowerCase() === name.toLowerCase()
  )
  return key ? headers[key] : null
}

/**
 * Record the session carried by a request the app just made.
 * Only requests to the API count, and only the app's own: ours are marked.
 */
const rememberRequest = (url, headers, from) => {
  if (!url || !String(url).includes('sync.bankin.com')) return
  const header = headerLookup(headers)
  if (header(OWN_REQUEST_MARK)) return
  const authorization = header('Authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  const device = header('Bankin-Device')
  if (device) captured.deviceId = device
  if (!token) return
  if (token !== captured.accessToken) {
    captured.accessToken = token
    captured.from = from
  }
}

/**
 * Patch fetch and XHR to read the Authorization header off the app's calls.
 * Nothing is read from the responses here and no value is ever logged.
 */
const watchApiTraffic = () => {
  const savedFetch = window.fetch
  window.fetch = function (input, options) {
    try {
      const url =
        typeof input === 'string'
          ? input
          : (input && input.url) || String(input)
      const headers =
        (options && options.headers) || (input && input.headers) || null
      rememberRequest(url, headers, 'a fetch call')
    } catch (err) {
      log.warn(`Could not watch a fetch call: ${err.message}`)
    }
    return savedFetch.apply(window, arguments)
  }

  const savedOpen = window.XMLHttpRequest.prototype.open
  const savedSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader
  window.XMLHttpRequest.prototype.open = function (method, url) {
    this._bankinUrl = url
    this._bankinHeaders = {}
    return savedOpen.apply(this, arguments)
  }
  window.XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    try {
      if (this._bankinHeaders) {
        this._bankinHeaders[name] = value
        rememberRequest(this._bankinUrl, this._bankinHeaders, 'an xhr call')
      }
    } catch (err) {
      log.warn(`Could not watch an xhr header: ${err.message}`)
    }
    return savedSetRequestHeader.apply(this, arguments)
  }
}

// The response of a login is the only place a token appears before the app has
// stored it anywhere, so it is also the only proof that a login really
// happened. Kept apart from the header watcher: this one answers "did the app
// authenticate", the other "what is it using right now".
const requestInterceptor = new cozy_clisk_dist_contentscript__WEBPACK_IMPORTED_MODULE_0__.RequestInterceptor([
  {
    identifier: 'authenticate',
    method: 'POST',
    url: '/v2/authenticate',
    serialization: 'json'
  }
])
requestInterceptor.on('response', ({ identifier, response }) => {
  if (identifier !== 'authenticate') return
  captured.authenticateSeen = true
  const token = response && response.access_token
  if (token) {
    captured.accessToken = token
    captured.from = 'the login response'
  }
})
requestInterceptor.init()
watchApiTraffic()

class BankinContentScript extends cozy_clisk_dist_contentscript__WEBPACK_IMPORTED_MODULE_0__.ContentScript {
  // P
  async ensureAuthenticated({ account } = {}) {
    this.log('info', '📍️ ensureAuthenticated starts')

    // Copy whatever the user filled in the account to the keychain, right
    // away: the launcher overwrites auth with {accountName} as soon as it
    // knows the identifier, so these values are only readable on the first
    // runs, while they are needed on every one.
    await this.keepAccountFields(account)

    // An account created before this konnector became client-side has no
    // auth.accountName. The launcher then compares our identifier to
    // undefined, always disagrees, logs the user out and retries for ever
    // (WRONG_ACCOUNT_IDENTIFIER). Nothing here can fix it — the check runs
    // before the launcher writes the name — so at least say so out loud.
    if (account && account._id && !(account.auth && account.auth.accountName)) {
      this.log(
        'warn',
        'This account has no auth.accountName: the app will refuse every ' +
          'identifier and keep logging you out. Delete the Bankin account in ' +
          'the Cozy and add it again to get a clean one.'
      )
    }

    // Never log the user out first, unlike most konnectors: the session is
    // the only thing we have. Signing in again costs a captcha, and the token
    // only lives two hours, so an existing session is precious.
    await this.goto(baseUrl)
    await this.waitForElementInWorker('#signin_email, #root')

    // Grab the API client now, while a page of the app is loaded: it lives in
    // the app bundle, which is not reachable from the login page, and every
    // check below needs it.
    await this.getApiCredentials()

    // A token in the page only means a session was opened at some point. It
    // lives two hours, and an expired one still looks perfectly valid from
    // here, so ask the API whether it is actually still good — otherwise the
    // run goes all the way to the first API call before failing on a 401.
    if (await this.runInWorker('checkAuthenticated')) {
      if (await this.isSessionUsable()) {
        this.log('info', 'Already authenticated')
        await this.saveSession()
        return true
      }
      // Same reason as below: a dead token left in the page would satisfy
      // waitForAuthenticated straight away.
      this.log('info', 'A session is present but the API rejects it, clearing')
      await this.clearSession()
    }

    // The webview starts blank on every run, so put back the session saved
    // last time before asking anything: as long as it holds, the user has
    // nothing to do.
    if (await this.restoreSession()) {
      if (
        (await this.runInWorker('checkAuthenticated')) &&
        (await this.isSessionUsable())
      ) {
        this.log('info', 'Session restored, no need to sign in again')
        return true
      }
      // Wipe what we just put back. Those cookies are dead, and leaving them
      // in the page would make waitForAuthenticated — which polls
      // checkAuthenticated, and a token is a token — return at once, as if
      // the user had already signed in.
      this.log('info', 'The saved session has expired, clearing it')
      await this.clearSession()
    }

    // No autologin attempt on purpose: the captcha makes it pointless, and a
    // failed programmatic login is exactly what gets an account flagged.
    this.log('info', 'Not authenticated, showing the login form')
    await this.showLoginFormAndWaitForAuthentication()
    // Back to normal: incognito was only there to force a real login, and
    // leaving it on would throw the fresh session away at the end of the run.
    if (this.incognito) {
      try {
        await this.bridge.call('setIncognito', false)
        this.incognito = false
      } catch (err) {
        this.log('warn', `Could not leave incognito: ${err.message}`)
      }
    }
    // Give the app a moment to finish settling its session: it writes its
    // cookies as the dashboard loads, and reading them too early gets the
    // half-written state — which is what a token refused milliseconds after
    // a successful login looks like.
    await this.waitForSessionReady()
    await this.saveSession()
    return true
  }

  /**
   * Wait until the session in the page is actually accepted by the API.
   * Right after a login the app is still storing its token, so the first
   * value readable from the page can be the previous one, or a partial one.
   */
  // P
  async waitForSessionReady() {
    for (let attempt = 1; attempt <= SESSION_READY_ATTEMPTS; attempt++) {
      if (await this.isSessionUsable()) {
        this.log('info', `Session ready after ${attempt} attempt(s)`)
        return true
      }
      if (attempt < SESSION_READY_ATTEMPTS) {
        await sleep(SESSION_READY_DELAY_MS)
      }
    }
    this.log(
      'warn',
      'The session is still refused after the login; carrying on anyway, ' +
        'the fetch will tell'
    )
    return false
  }

  /**
   * Is the session in the page still accepted by the API? The token expires
   * after two hours and nothing in the page says so, so ask the cheapest
   * authenticated endpoint. A network problem answers "yes" on purpose: it
   * is better to try the run than to send the user through a captcha for
   * what may be a passing glitch.
   */
  // P
  async isSessionUsable() {
    const token = await this.runInWorker('findAccessToken')
    if (!token) return false
    const apiClient = await this.getApiCredentials()
    let status = await this.runInWorker('checkToken', token, apiClient)
    // Calls to the API are blocked from the login page; if that is where we
    // are, move to an app page and ask again before concluding.
    if (String(status).startsWith('network')) {
      this.log('info', 'Token check blocked, retrying from an app page')
      await this.goto(baseUrl)
      await this.waitForElementInWorker('#signin_email, #root')
      status = await this.runInWorker('checkToken', token, apiClient)
    }
    if (status === 'ok') return true
    if (String(status).startsWith('expired')) {
      // log the reason the API gave, it is the only thing that says whether
      // the token is stale, tied to another device, or something else
      this.log('info', `The access token is not accepted — ${status}`)
      return false
    }
    // Anything else means the question could not be answered: no API client,
    // or a request that did not even reach Bankin' — which happens when the
    // worker sits on the login page, where calls to the API are blocked.
    // Treating that as "probably fine" is what kept letting dead sessions
    // through, only to fail later in the middle of the fetch. A login costs
    // the user one captcha; a false positive costs the whole run.
    this.log('warn', `Could not check the token (${status}), asking to login`)
    return false
  }

  /**
   * Ask the API whether the token still works. Returns 'ok', 'expired' or a
   * short reason, never throws: an exception would reach the pilot as a bare
   * "false" and be indistinguishable from an expired token.
   */
  // W
  async checkToken(token, apiClient) {
    const { clientId, clientSecret } = this.getApiClient(apiClient)
    if (!clientId || !clientSecret) return 'no api client'
    // Describe the token without ever logging it: when the API keeps
    // refusing a freshly obtained one, the shape says whether we are even
    // reading the right value.
    this.log(
      'info',
      `Checking a token of ${String(token).length} chars ` +
        `(${/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) ? 'jwt' : 'opaque'}), ` +
        `device ${this.findDeviceId() ? 'present' : 'MISSING'}, ` +
        `cookies: ${
          this.getCookies()
            .map(cookie => cookie.name)
            .join(',') || 'none'
        }`
    )
    try {
      const response = await window.fetch(`${apiUrl}/v2/users/me`, {
        headers: {
          [OWN_REQUEST_MARK]: '1',
          'Bankin-Version': bankinVersion,
          'Bankin-Device': this.findDeviceId(),
          'Client-Id': clientId,
          'Client-Secret': clientSecret,
          Authorization: `Bearer ${token}`
        }
      })
      if (response.ok) return 'ok'
      // The body names the actual reason (expired_token, invalid_token,
      // device_mismatch...). Without it a 401 says nothing about what to fix.
      let detail = ''
      try {
        detail = (await response.text()).slice(0, 200)
      } catch (err) {
        detail = '(no body)'
      }
      if (response.status === 401 || response.status === 403) {
        return `expired: ${detail}`
      }
      return `http ${response.status}: ${detail}`
    } catch (err) {
      return `network: ${err.message}`
    }
  }

  /**
   * The account fields (login, and the optional API client) only survive
   * until the launcher rewrites auth with the account name, so copy them to
   * the keychain while they can still be read.
   */
  // P
  async keepAccountFields(account) {
    const auth = (account && account.auth) || {}
    const worth = ['login', 'email', 'password', 'clientId', 'clientSecret']
      .filter(key => auth[key])
      .reduce((kept, key) => {
        kept[key === 'login' ? 'email' : key] = auth[key]
        return kept
      }, {})
    if (!Object.keys(worth).length) return false
    try {
      const previous = (await this.getCredentials()) || {}
      await this.saveCredentials({ ...previous, ...worth })
      this.log(
        'info',
        `Kept the account fields: ${Object.keys(worth).join(', ')}`
      )
      return true
    } catch (err) {
      this.log('warn', `Could not keep the account fields: ${err.message}`)
      return false
    }
  }

  /**
   * Drop the session from the page. Used when a token turns out to be dead:
   * leaving it there would fool waitForAuthenticated, which only looks for
   * the presence of a token.
   */
  // P
  async clearSession() {
    await this.runInWorker('wipeSessionCookies')
    // Forget the token captured earlier too, otherwise fetch() would happily
    // reuse the expired one it was handed before the check.
    if (this.store) {
      delete this.store.accessToken
      delete this.store.deviceId
    }
    await this.goto(`${baseUrl}/signin`)
    await this.waitForElementInWorker('#signin_email')

    // document.cookie only reaches the cookies the page can see; the webview
    // keeps its own jar. When an expired token survives there, the app reads
    // it on load, believes it is still signed in, never calls
    // /v2/authenticate — and the user signs in on a form that hands back the
    // very same dead token. Incognito is the only way to make the webview
    // start from nothing.
    if (await this.runInWorker('findAccessToken')) {
      this.log(
        'info',
        'A token survived in the webview jar, restarting it incognito so the ' +
          'app really signs in again'
      )
      try {
        await this.bridge.call('setIncognito', true)
        this.incognito = true
        await this.goto(`${baseUrl}/signin`)
        await this.waitForElementInWorker('#signin_email')
      } catch (err) {
        this.log('warn', `Could not switch to incognito: ${err.message}`)
      }
    }
  }

  // W
  async wipeSessionCookies() {
    // Dropping a session means forgetting the token seen on the wire too,
    // otherwise findAccessToken would keep handing back the dead one it
    // captured before the wipe.
    resetCapturedAuth()
    // Every cookie the app owns, not just the ones we know by name: a
    // leftover would be mistaken for a token by findAccessToken. The device
    // id is kept: it identifies this webview to Bankin', a token is issued
    // for it, and removing it makes the app register a new device on every
    // login for nothing.
    const names = new Set(
      [
        ...SESSION_COOKIES,
        ...this.getCookies()
          .map(cookie => cookie.name)
          .filter(name => /^bw[A-Za-z]{2}$/.test(name)),
        // the access token is not in SESSION_COOKIES any more, but a copy
        // written by an older version may still shadow the live one
        ACCESS_TOKEN_COOKIE
      ].filter(name => name !== DEVICE_COOKIE_TO_WIPE)
    )
    // A cookie is only removed by an expiry that repeats its exact domain and
    // path. The app sets some of them on the bare host and others on the
    // parent domain, and document.cookie does not say which — so expire every
    // combination.
    const host = window.location.hostname
    const domains = [
      null, // no domain attribute: matches the ones set without it
      host, // app2.bankin.com
      `.${host}`,
      host.split('.').slice(-2).join('.'), // bankin.com
      `.${host.split('.').slice(-2).join('.')}`
    ]
    const past = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'
    for (const name of names) {
      for (const domain of domains) {
        for (const path of ['/', window.location.pathname]) {
          document.cookie =
            `${name}=;path=${path};${past}` +
            (domain ? `;domain=${domain}` : '')
        }
      }
    }
    try {
      window.sessionStorage.removeItem('ACCESS_TOKEN')
      window.localStorage.removeItem('ACCESS_TOKEN')
    } catch (err) {
      // storage disabled, the cookies were the important part
    }
    return true
  }

  /**
   * Keep the session cookies so the next run does not have to ask for a new
   * login. They are stored in the phone keychain, per account.
   */
  // P
  async saveSession() {
    const cookies = await this.runInWorker('readSessionCookies')
    if (!cookies || !cookies.length) {
      this.log('info', 'No session cookie to save')
      return false
    }
    let saved = 0
    for (const cookie of cookies) {
      try {
        await this.bridge.call('saveCookieToKeychain', cookie)
        saved++
      } catch (err) {
        this.log('warn', `Could not save the cookie ${cookie.name}`)
      }
    }
    if (saved) {
      // Remember when: a token older than its two hour life must not be put
      // back, it would be read as the current session and refused.
      try {
        const credentials = (await this.getCredentials()) || {}
        await this.saveCredentials({
          ...credentials,
          sessionSavedAt: String(Date.now())
        })
      } catch (err) {
        this.log('warn', `Could not record the session date: ${err.message}`)
      }
    }
    this.log('info', `Saved ${saved} session cookie(s) for the next run`)
    return saved > 0
  }

  /**
   * Put back the cookies saved by a previous run. Returns false when there is
   * nothing to restore, so the caller knows a login is unavoidable.
   */
  // P
  async restoreSession() {
    this.log('info', 'Looking for a saved session')
    // Skip the whole dance when the saved session cannot possibly still be
    // valid: restoring a dead token only gets it read back as the current
    // one, and the API then answers expired_token on a fresh login.
    const credentials = (await this.getCredentials()) || {}
    const savedAt = Number(credentials.sessionSavedAt || 0)
    if (savedAt) {
      const ageSeconds = Math.round((Date.now() - savedAt) / 1000)
      if (ageSeconds > TOKEN_LIFETIME_SECONDS) {
        this.log(
          'info',
          `The saved session is ${Math.round(ageSeconds / 60)} min old, ` +
            'past its two hour life: not restoring it'
        )
        return false
      }
      this.log('info', `The saved session is ${ageSeconds}s old`)
    }
    const restored = []
    for (const name of SESSION_COOKIES) {
      let cookie
      try {
        cookie = await this.bridge.call('getCookieFromKeychainByName', name)
      } catch (err) {
        this.log('warn', `Could not read the saved cookie ${name}`)
        continue
      }
      if (cookie && cookie.value) {
        restored.push({ name, value: cookie.value })
      }
    }
    if (!restored.length) {
      this.log('info', 'No saved session')
      return false
    }
    await this.runInWorker('writeSessionCookies', restored)
    // the app reads its cookies on start, so reload for them to take effect
    await this.goto(baseUrl)
    await this.waitForElementInWorker('#signin_email, #root')
    this.log('info', `Restored ${restored.length} session cookie(s)`)
    return true
  }

  // W
  async readSessionCookies() {
    const cookies = this.getCookies()
      .filter(cookie => SESSION_COOKIES.includes(cookie.name))
      .map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: window.location.hostname,
        path: '/'
      }))
    return cookies
  }

  // W
  async writeSessionCookies(cookies) {
    for (const cookie of cookies) {
      // Two hours, exactly like the app does: writing the token with a one
      // year lifetime made it outlive its own validity in the page, so a
      // later run kept reading a long-dead token instead of the fresh one.
      document.cookie = `${cookie.name}=${encodeURIComponent(
        cookie.value
      )};path=/;max-age=${TOKEN_LIFETIME_SECONDS}`
    }
    return true
  }

  /**
   * Called by the launcher when the user asks to reconnect the account. This
   * is the only place allowed to drop the session.
   */
  // P
  async ensureNotAuthenticated() {
    this.log('info', '📍️ ensureNotAuthenticated starts')
    await this.goto(baseUrl)
    await this.waitForElementInWorker('#signin_email, #root')
    if (!(await this.runInWorker('checkAuthenticated'))) {
      this.log('info', 'Already logged out')
      return true
    }
    this.log('info', 'Clearing the session')
    await this.evaluateInWorker(function clearSession() {
      window.localStorage.clear()
      window.sessionStorage.clear()
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim()
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      })
    })
    await this.goto(`${baseUrl}/signin`)
    await this.waitForElementInWorker('#signin_email')
    return true
  }

  // W
  async checkAuthenticated() {
    // Watch the login fields while the user types: their email is what gives
    // a stable sourceAccountIdentifier. This method is polled during the
    // login, so it doubles as the place to (re)install the listeners.
    // 'input' as well as 'change': the app may submit before a change event
    // is emitted, and then the page is gone.
    for (const [selector, key] of [
      ['#signin_email', 'email'],
      ['#signin_password', 'password']
    ]) {
      const field = document.querySelector(selector)
      if (field && !field.dataset.cliskListener) {
        field.dataset.cliskListener = '1'
        const send = () => {
          if (field.value) {
            this.sendToPilot({ [key]: field.value })
          }
        }
        field.addEventListener('input', send)
        field.addEventListener('change', send)
      }
    }
    // Do not rely on the token alone: the app stores it either in a cookie or
    // in sessionStorage, and it may even be HttpOnly, in which case the page
    // cannot see it at all and the login would never be detected. Leaving the
    // signin page is the reliable signal.
    // Being on the login page means not authenticated, whatever token may be
    // lying around: a cookie we failed to expire would otherwise end the wait
    // immediately and close the form under the user's eyes.
    const onSignInPage =
      window.location.pathname.startsWith('/signin') ||
      Boolean(document.querySelector('#signin_email'))
    if (onSignInPage) return false

    // Only now is a token worth keeping. Sending it from the login page would
    // hand over the stale one that survived the wipe, and it would then be
    // used instead of the one the user just obtained.
    const token = this.findAccessToken()
    if (token) {
      this.sendToPilot({ accessToken: token, deviceId: this.findDeviceId() })
    }
    return true
  }

  /**
   * Put the saved identifiers back in the form before showing it. They are
   * already in the Cozy account, so retyping them every run is pure friction.
   *
   * Prefilled, never submitted: the captcha needs a human anyway, and a
   * programmatic login attempt is exactly what gets an account flagged.
   */
  // P
  async prefillLoginForm() {
    const credentials = (await this.getCredentials()) || {}
    const email = credentials.email || (this.store && this.store.email)
    const password = credentials.password || (this.store && this.store.password)
    if (!email && !password) {
      this.log('info', 'Nothing saved to prefill the login form with')
      return false
    }
    // Only ever log which fields were filled, never what went in them.
    const filled = await this.runInWorker('fillLoginForm', email, password)
    if (filled && filled.length) {
      this.log('info', `Login form prefilled (${filled.join(', ')})`)
      return true
    }
    this.log('info', 'The login form was not there to be prefilled')
    return false
  }

  // W
  fillLoginForm(email, password) {
    // React keeps its own copy of the value and ignores a plain assignment,
    // leaving the field looking filled while the app still submits an empty
    // one. Going through the native setter is what makes it notice.
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set
    const filled = []
    for (const [selector, value, name] of [
      ['#signin_email', email, 'email'],
      ['#signin_password', password, 'password']
    ]) {
      if (!value) continue
      const field = document.querySelector(selector)
      if (!field) continue
      nativeSetter.call(field, value)
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
      filled.push(name)
    }
    return filled
  }

  // P
  async showLoginFormAndWaitForAuthentication() {
    this.log('info', '📍️ showLoginFormAndWaitForAuthentication starts')
    await this.prefillLoginForm()
    await this.setWorkerState({ visible: true })
    await this.runInWorkerUntilTrue({
      method: 'waitForAuthenticated',
      // the default timeout is short for a login that needs a captcha
      timeout: 5 * 60 * 1000
    })
    await this.setWorkerState({ visible: false })

    // The one thing the logs never said. If the app did not authenticate,
    // then whatever token is readable afterwards is not a new one, and no
    // amount of looking for it in a better place will help.
    const seen = (await this.runInWorker('readCapturedAuth')) || {}
    if (seen.authenticateSeen) {
      this.log('info', 'The app called /v2/authenticate: this login is real')
    } else {
      this.log(
        'warn',
        'The app never called /v2/authenticate during this login: it reused a ' +
          'session it already had'
      )
    }
    this.log(
      'info',
      seen.hasToken
        ? `Token captured from ${seen.from} (${seen.tokenLength} chars)`
        : 'No token seen on the app traffic, falling back to the stored ones'
    )
  }

  /**
   * The API client id/secret, in order of preference:
   *  1. the account's advanced fields, kept in the phone keychain
   *  2. the Bankin' web app itself, which ships its own client to every
   *     visitor (see readWebAppApiClient)
   * Nothing is hardcoded in this konnector.
   */
  // P
  async getApiCredentials() {
    // Read once per run: it is asked for at several points, and reading it
    // depends on the page currently loaded — from /signin the app bundle is
    // not reachable, and a miss there used to silently disable the token
    // check.
    if (this.apiCredentials) return this.apiCredentials

    const credentials = await this.getCredentials()
    if (credentials && credentials.clientId && credentials.clientSecret) {
      this.log('info', 'API client from the saved credentials')
      this.apiCredentials = {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      }
      return this.apiCredentials
    }

    const fromWebApp = await this.runInWorker('readWebAppApiClient')
    if (fromWebApp && fromWebApp.clientId && fromWebApp.clientSecret) {
      this.log('info', 'API client read from the Bankin web app')
      this.apiCredentials = fromWebApp
      // Keep it for the next runs: the app bundle is only readable from its
      // own pages, and this saves re-downloading it every time.
      try {
        await this.saveCredentials({ ...(credentials || {}), ...fromWebApp })
      } catch (err) {
        this.log('warn', `Could not keep the API client: ${err.message}`)
      }
      return this.apiCredentials
    }

    this.log('warn', 'Could not determine the API client')
    return null
  }

  /**
   * Read the API client out of the web app's own javascript bundle. The app
   * declares it next to the API base url, and its client secret is the only
   * 64 character literal of the bundle. Doing it at runtime keeps those
   * values out of this repository, and follows Bankin' if they rotate them.
   */
  // W
  async readWebAppApiClient() {
    try {
      const scripts = [...document.querySelectorAll('script[src]')]
        .map(script => script.src)
        .filter(src => src.includes('/static/js/'))
      for (const src of scripts) {
        const source = await window.fetch(src).then(response => response.text())
        // '<api url>','<32 hex client id>'
        const idMatch = source.match(
          /sync\.bankin\.com\/v2['"],\s*['"]([0-9a-f]{32})['"]/
        )
        if (!idMatch) continue
        const secretMatch = source.match(/['"]([0-9a-zA-Z]{64})['"]/)
        if (!secretMatch) continue
        return { clientId: idMatch[1], clientSecret: secretMatch[1] }
      }
      return null
    } catch (err) {
      this.log('warn', `Could not read the web app api client: ${err.message}`)
      return null
    }
  }

  /**
   * Last resort when the token cannot be seen from the page: the launcher can
   * read the native cookie jar, which also holds the HttpOnly cookies.
   * Only the pilot can call it, hence this being here and not in the worker.
   */
  // P
  async findTokenInNativeCookies() {
    this.log('info', 'Looking for the token in the native cookie jar')
    let cookies
    try {
      cookies = await this.bridge.call('getCookiesByDomain', 'app2.bankin.com')
    } catch (err) {
      this.log('warn', `Could not read the native cookies: ${err.message}`)
      return null
    }
    const names = Object.keys(cookies || {})
    this.log('info', `Native cookies: ${names.join(', ') || 'none'}`)
    const valueOf = cookie =>
      cookie && typeof cookie === 'object' ? cookie.value : cookie

    const known = valueOf(cookies && cookies[ACCESS_TOKEN_COOKIE])
    if (known) return known

    const guessedName = names.find(name => {
      const value = valueOf(cookies[name]) || ''
      return (
        value.length >= 20 &&
        !UUID_RE.test(value) &&
        !/^(bwLg|bwAm|bwCk|bwPs)$/.test(name)
      )
    })
    return guessedName ? valueOf(cookies[guessedName]) : null
  }

  /**
   * The launcher compares this to account.auth.accountName on EVERY run and,
   * when they differ, logs the user out and starts the authentication over
   * (WRONG_ACCOUNT_IDENTIFIER) — an endless login/logout loop. The value must
   * therefore be identical on every single run.
   *
   * The API answer is the most reliable source here: it identifies the
   * Bankin' account itself, while the login form is only filled in on the
   * runs where the user actually signs in. The typed email is kept as a
   * fallback for when the API cannot be reached.
   */
  // P
  async getUserDataFromWebsite() {
    this.log('info', '📍️ getUserDataFromWebsite starts')

    const token =
      (await this.runInWorker('findAccessToken')) ||
      (await this.findTokenInNativeCookies())
    const email = await this.runInWorker(
      'getUserEmail',
      token,
      await this.getApiCredentials()
    )
    if (email) {
      this.log('info', 'Identifier taken from the API')
      return { sourceAccountIdentifier: normalizeEmail(email) }
    }

    const credentials = await this.getCredentials()
    if (credentials && credentials.email) {
      this.log('info', 'Identifier taken from the saved credentials')
      return { sourceAccountIdentifier: normalizeEmail(credentials.email) }
    }

    const typedEmail = this.store && this.store.email
    if (typedEmail) {
      this.log('info', 'Identifier taken from the login form')
      return { sourceAccountIdentifier: normalizeEmail(typedEmail) }
    }

    throw new Error(
      'Could not find the user email, cannot give a sourceAccountIdentifier'
    )
  }

  // W
  async getUserEmail(givenToken, givenApiClient) {
    const token = givenToken || this.findAccessToken()
    if (!token) return null
    const { clientId, clientSecret } = this.getApiClient(givenApiClient)
    if (!clientId || !clientSecret) return null
    // Never throw from here: the caller has a fallback on the email typed in
    // the login form, and losing the identifier would abort the whole run.
    try {
      const response = await window.fetch(`${apiUrl}/v2/users/me`, {
        headers: {
          [OWN_REQUEST_MARK]: '1',
          'Bankin-Version': bankinVersion,
          'Bankin-Device': this.findDeviceId(),
          'Client-Id': clientId,
          'Client-Secret': clientSecret,
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        this.log('warn', `/v2/users/me answered ${response.status}`)
        return null
      }
      const user = await response.json()
      return user.email || null
    } catch (err) {
      this.log('warn', `Could not reach /v2/users/me: ${err.message}`)
      return null
    }
  }

  /**
   * How far back this run has to go.
   *
   * The API is paginated newest first, so the cost of a run is the number of
   * pages walked. Two rules decide where to stop:
   *
   *  - always re-read the last ALWAYS_REFETCH_DAYS days. Banks confirm
   *    operations days after they happened, and a pending one can change its
   *    date or amount when it settles, so the recent past is never final;
   *  - if the saved history has holes — days missing inside a stretch we are
   *    supposed to have — go back to before the oldest hole to fill it.
   *
   * With nothing saved yet, take everything: that is the first import.
   */
  // P
  async getFetchSince() {
    let operations
    try {
      operations = await this.queryAll({
        toDefinition: () => ({ doctype: 'io.cozy.bank.operations' })
      })
    } catch (err) {
      this.log('warn', `Could not read the saved operations: ${err.message}`)
      return null // no idea, take everything
    }

    const saved = (operations || []).filter(
      operation => operation && operation.date
    )
    const allDays = [
      ...new Set(saved.map(operation => String(operation.date).slice(0, 10)))
    ].sort()

    if (!allDays.length) {
      this.log('info', 'No operation saved yet, importing the whole history')
      return { fallback: null, byAccount: {} }
    }

    const newest = allDays[allDays.length - 1]
    const oldest = allDays[0]

    // Holes are looked for per account, not over all of them at once. With 22
    // accounts, one of them missing three months is invisible in the union:
    // the others keep every day covered, the calendar looks continuous, and
    // nothing is ever refetched. That is exactly how a whole quarter can go
    // missing from a single account while the logs report a healthy history.
    const daysByAccount = new Map()
    for (const operation of saved) {
      const key = String(operation.vendorAccountId || '')
      if (!key) continue
      if (!daysByAccount.has(key)) daysByAccount.set(key, new Set())
      daysByAccount.get(key).add(String(operation.date).slice(0, 10))
    }

    // The truncated past: previous versions only kept a 3 month window, so
    // the history stops dead at its start instead of at the real beginning of
    // the account. That edge is a hole too, and the loop above cannot see it
    // because there is nothing saved before it. Walk back a slice at a time,
    // run after run, and stop as soon as a run brings nothing older: the
    // account has then given everything it has.
    // Compare against how far the previous run *asked*, not what it got: when
    // we already asked for older operations and the history still starts
    // here, the account simply has nothing before that date and there is no
    // point digging every run.
    const askedBefore = await this.getKnownHistoryStart()
    let deepest = null
    if (askedBefore && askedBefore < oldest) {
      this.log(
        'info',
        `History goes back to ${oldest} and ${askedBefore} was already asked ` +
          'for: nothing older to get'
      )
    } else {
      deepest = dateMinusDays(oldest, BACKFILL_DAYS)
      await this.setKnownHistoryStart(deepest)
      this.log(
        'info',
        `History starts at ${oldest}, reaching back to ${deepest} to extend it`
      )
    }

    const byAccount = {}
    let holes = 0
    for (const [vendorAccountId, daySet] of daysByAccount) {
      const days = [...daySet].sort()
      let since = dateMinusDays(days[days.length - 1], ALWAYS_REFETCH_DAYS)
      // A quiet stretch inside one account's own history: the bank did not
      // simply move no money for that long, a run was missed or cut short.
      for (let i = 1; i < days.length; i++) {
        const gap = daysBetween(days[i - 1], days[i])
        if (gap > HOLE_GAP_DAYS) {
          const holeStart = dateMinusDays(days[i - 1], 1)
          if (holeStart < since) since = holeStart
          holes++
          this.log(
            'warn',
            `Account ${vendorAccountId}: nothing between ${days[i - 1]} and ` +
              `${days[i]} (${gap} days), going back there to fill the hole`
          )
          break
        }
      }
      if (deepest && deepest < since) since = deepest
      byAccount[vendorAccountId] = since
    }

    this.log(
      'info',
      `${allDays.length} days saved (${oldest} to ${newest}) over ` +
        `${daysByAccount.size} account(s), ${holes} with a hole to fill`
    )
    // Accounts with nothing saved — new ones, and the ones that never had a
    // single operation — are not in the map and take the whole history. That
    // costs one page for an empty account, and is the only way a genuinely
    // new account gets imported in full.
    return { fallback: null, byAccount }
  }

  /**
   * The oldest day we have already imported, remembered between runs so the
   * backfill knows whether it made progress last time.
   */
  // P
  async getKnownHistoryStart() {
    const credentials = await this.getCredentials()
    return (credentials && credentials.historyStart) || null
  }

  // P
  async setKnownHistoryStart(day) {
    try {
      const credentials = (await this.getCredentials()) || {}
      await this.saveCredentials({ ...credentials, historyStart: day })
    } catch (err) {
      this.log('warn', `Could not remember the history start: ${err.message}`)
    }
  }

  // P
  async fetch(context) {
    this.log('info', '📍️ fetch starts')

    // Persist what the user typed, so that the next runs have a stable
    // sourceAccountIdentifier even when nothing is typed (see
    // getUserDataFromWebsite). The password is only stored so the account
    // behaves like other konnectors; it is never replayed, the captcha
    // makes an automatic login impossible anyway.
    //
    // The API client id/secret are kept here too: they live in the phone
    // keychain, never in the published bundle. They come from the account
    // fields, which the launcher wipes from auth once it writes accountName,
    // so this is the only place they survive from one run to the next.
    const previousCredentials = (await this.getCredentials()) || {}
    const accountAuth = (context.account && context.account.auth) || {}
    const credentials = {
      ...previousCredentials,
      ...(this.store && this.store.email ? { email: this.store.email } : {}),
      ...(this.store && this.store.password
        ? { password: this.store.password }
        : {}),
      ...(accountAuth.clientId ? { clientId: accountAuth.clientId } : {}),
      ...(accountAuth.clientSecret
        ? { clientSecret: accountAuth.clientSecret }
        : {})
    }
    if (Object.keys(credentials).length) {
      try {
        await this.saveCredentials(credentials)
      } catch (err) {
        this.log('warn', `Could not save the credentials: ${err.message}`)
      }
    }

    // Do NOT navigate before reading the token: the app keeps it in
    // sessionStorage, which is wiped by a reload, and the token grabbed
    // during the authentication is the one we want.
    // Prefer what the page holds right now over what was captured earlier:
    // after a fresh login the page has the new token, while the pilot may
    // still be holding one from before.
    let token = await this.runInWorker('findAccessToken')
    if (token === false) {
      // not "no token": the worker reloaded mid-call
      this.log('warn', 'The worker reloaded, asking for the token again')
      token = await this.runInWorker('findAccessToken')
    }
    if (token) {
      this.log('info', 'Using the token currently in the page')
    } else if (this.store && this.store.accessToken) {
      token = this.store.accessToken
      this.log('info', 'Using the token captured during the authentication')
    }
    if (token) {
      this.log('info', 'Access token available')
    } else {
      this.log('info', 'No token visible from the page, trying the cookie jar')
      token = await this.findTokenInNativeCookies()
      if (!token) {
        throw new Error(
          'Could not find the Bankin access token, neither in the page nor ' +
            'in the native cookies. The session may have expired: run the ' +
            'konnector again and sign in.'
        )
      }
      this.log('info', 'Access token found in the native cookie jar')
    }

    // Collect everything from the webview, i.e. from the user's own IP.
    // runInWorker resolves to false when the worker reloaded mid-call, so
    // retry once rather than reporting a fetch failure.
    const deviceId = (this.store && this.store.deviceId) || ''
    const apiClient = await this.getApiCredentials()
    const since = await this.getFetchSince()
    this.log(
      'info',
      `API client: ${
        apiClient ? 'from the saved credentials' : 'from the build'
      }`
    )
    let bankinData = await this.runInWorker(
      'fetchBankinData',
      token,
      deviceId,
      apiClient,
      since
    )
    if (bankinData === false) {
      this.log('warn', 'The worker returned false, retrying once')
      bankinData = await this.runInWorker(
        'fetchBankinData',
        token,
        deviceId,
        apiClient,
        since
      )
    }
    // the worker reports its failures as data, an exception would cross the
    // bridge as a bare "false" and lose the message
    if (bankinData && bankinData.error) {
      throw new Error(bankinData.error)
    }
    if (!bankinData || !bankinData.accounts) {
      // A session that expired between the check and here is by far the most
      // common cause, and it is not something the user can act on beyond
      // running the konnector again.
      if (!(await this.isSessionUsable())) {
        throw new Error(
          'The Bankin session expired during the run (the token only lives ' +
            'two hours). Run the konnector again and sign in.'
        )
      }
      throw new Error(
        'Could not fetch the accounts from the Bankin API ' +
          `(the worker returned ${JSON.stringify(bankinData)}). If this is ` +
          '"false", the webview reloaded while fetching.'
      )
    }
    this.log(
      'info',
      `Fetched ${bankinData.accounts.length} accounts and ` +
        `${bankinData.allOperations.length} operations`
    )
    if (bankinData.accounts.length === 0) {
      this.log(
        'warn',
        'The API returned no account at all: nothing will be saved'
      )
    }

    // Hand the data over to the server part, which owns the bank doctypes:
    // the clisk bridge cannot write io.cozy.bank.* itself. The payload
    // travels through the account document, and CouchDB refuses documents
    // above 8 MB, so send it in slices when the history gets long.
    const payloadSize = JSON.stringify(bankinData).length
    this.log(
      'info',
      `${Math.round(payloadSize / 1024)} KB to hand over to the server part`
    )
    const batches = splitOperations(bankinData, MAX_OPERATIONS_PER_BATCH)
    if (batches.length > 1) {
      this.log(
        'info',
        `Sending it in ${batches.length} batches to stay under the document ` +
          'size limit'
      )
    }
    for (const [index, batch] of batches.entries()) {
      if (batches.length > 1) {
        this.log(
          'info',
          `Batch ${index + 1}/${batches.length}: ` +
            `${batch.allOperations.length} operations`
        )
      }
      await this.sendToServer(context, batch)
    }
    return
  }

  /**
   * Give one slice of the collected data to the server part and wait for it
   * to be written.
   */
  // P
  async sendToServer(context, bankinData) {
    // saveAccountData and runServerJob are exposed by the flagship launcher
    // (see ReactNativeLauncher exposedMethodsNames) but cozy-clisk has no
    // wrapper for them, so go through the bridge like its own methods do.
    // The launcher hands us {manifest, account, trigger, job,
    // sourceAccountIdentifier, flags}: the existing data lives in account.data
    // and must be kept, it holds the device id used by the server part.
    const previousData = (context.account && context.account.data) || {}
    try {
      await this.bridge.call('saveAccountData', {
        ...previousData,
        bankinData
      })
    } catch (err) {
      this.log(
        'error',
        `Could not save the data on the account: ${err.message}`
      )
      throw err
    }

    // The data is safe in the account from here on: even if the job below
    // never runs, the next execution will import it.
    this.log('info', 'Starting the server job which saves the bank documents')
    let job
    try {
      job = await Promise.race([
        this.bridge.call('runServerJob', {}, { timeout: 10 * 60 * 1000 }),
        // The launcher already started a job of its own for this konnector
        // before calling fetch(); if the stack serialises them, waiting for
        // ours could last forever. Do not hang the whole run on it.
        new Promise((resolve, reject) =>
          setTimeout(
            () => reject(new Error('the server job did not finish in 10 min')),
            10 * 60 * 1000
          )
        )
      ])
    } catch (err) {
      // runServerJob is a fairly recent addition to the flagship app: on an
      // older one the bridge simply has no such method.
      this.log(
        'error',
        `The server job could not be run: ${err.message}. If this says the ` +
          'method is unknown, the Twake/Cozy app is too old for this ' +
          'konnector: update it and run again. The collected data has been ' +
          'saved and will be imported by the next run.'
      )
      throw err
    }
    // runServerJob resolves when the job is done, whether it worked or not:
    // without this the konnector would report a success on a failed import.
    const state = job && (job.attributes ? job.attributes.state : job.state)
    this.log('info', `Server job finished in state "${state}"`)
    if (state === 'errored') {
      const error =
        (job.attributes ? job.attributes.error : job.error) || 'unknown error'
      throw new Error(`The server part failed to save the data: ${error}`)
    }
  }

  // W
  async fetchBankinData(givenToken, givenDeviceId, givenApiClient, sinceSpec) {
    // First thing, before anything can throw: prove the method really ran.
    // A silent failure here used to surface as an unexplained "false".
    this.log('info', '📍️ fetchBankinData starts (in the worker)')
    // the pilot passes the token it managed to find, so that a HttpOnly
    // cookie invisible from here does not stop the run
    const token = givenToken || this.findAccessToken()
    if (!token) {
      // Most likely cause: the 2h token expired while the konnector was open.
      throw new Error(
        'No access token found in the page. Either the session expired, or ' +
          `Bankin renamed its storage (expected "${ACCESS_TOKEN_COOKIE}" or ` +
          `an ACCESS_TOKEN entry, found cookies: ${
            this.getCookies()
              .map(cookie => cookie.name)
              .join(', ') || 'none'
          })`
      )
    }
    // the pilot passes what it captured during the login: a navigation may
    // have cleared the cookies this page can see
    const deviceId = givenDeviceId || this.findDeviceId()
    if (!deviceId) {
      this.log(
        'warn',
        'No device id cookie found, calling the API without one; ' +
          'Bankin may reject the requests'
      )
    }
    const { clientId, clientSecret } = this.getApiClient(givenApiClient)
    if (!clientId || !clientSecret) {
      // Should not happen, the web app client is used by default; this only
      // triggers if someone empties both the constants and the fields.
      return {
        error:
          'No Bankin API client id/secret available. Fill the "Client ID" ' +
          'and "Client Secret" advanced fields of the account.'
      }
    }

    // Same shape as the web app's own requests: the client goes in headers,
    // not in the query string (read from its bundle).
    const call = async path => {
      const response = await window.fetch(`${apiUrl}${path}`, {
        headers: {
          [OWN_REQUEST_MARK]: '1',
          'Bankin-Version': bankinVersion,
          'Bankin-Device': deviceId,
          'Client-Id': clientId,
          'Client-Secret': clientSecret,
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        // The body carries the real reason (expired_token, invalid_token,
        // challenge_required...); without it a 401 is unactionable.
        let detail = ''
        try {
          detail = ` - ${(await response.text()).slice(0, 200)}`
        } catch (err) {
          detail = ''
        }
        // Log before throwing: this exception crosses the bridge as a bare
        // "false", so the reason would otherwise never reach the logs.
        this.log('warn', `${path} answered ${response.status}${detail}`)
        const error = new Error(`${path} answered ${response.status}${detail}`)
        error.status = response.status
        throw error
      }
      return response.json()
    }

    this.log('info', 'Fetching the banks')
    const banks = (0,_bankin_format__WEBPACK_IMPORTED_MODULE_2__.formatBanks)((await call('/v2/banks?limit=200')).resources)
    this.log('info', `Found ${Object.keys(banks).length} banks`)

    this.log('info', 'Fetching the accounts')
    const accounts = (0,_bankin_format__WEBPACK_IMPORTED_MODULE_2__.formatAccounts)(
      (await call('/v2/accounts?limit=200')).resources,
      banks
    )
    this.log('info', `Found ${accounts.length} accounts`)

    const { fallback = null, byAccount = {} } = sinceSpec || {}

    let allOperations = []
    for (const account of accounts) {
      // Each account has its own starting point: one of them missing a
      // quarter must dig that far back without dragging the other 21 with it.
      const since = Object.prototype.hasOwnProperty.call(
        byAccount,
        account.vendorId
      )
        ? byAccount[account.vendorId]
        : fallback
      let path = `/v2/accounts/${account.vendorId}/transactions?limit=200`
      let pages = 0
      let stoppedEarly = false
      const before = allOperations.length
      // The API paginates, newest first; follow next_uri until it is gone or
      // until we reach operations we already have.
      while (path) {
        const page = await call(path)
        const operations = (0,_bankin_format__WEBPACK_IMPORTED_MODULE_2__.formatOperations)(page.resources)
        allOperations = allOperations.concat(operations)
        pages++

        if (since && operations.length) {
          // resources are ordered newest first: once the last one of the page
          // is older than what we need, the following pages are older still
          const oldest = operations[operations.length - 1].date.slice(0, 10)
          if (oldest < since) {
            stoppedEarly = true
            break
          }
        }
        path = page.pagination && page.pagination.next_uri
      }
      this.log(
        'info',
        `Account ${account.vendorId}: ${allOperations.length - before} ` +
          `operations in ${pages} page(s)` +
          (since ? ` since ${since}` : ' (whole history)') +
          (stoppedEarly ? ', stopped there' : '')
      )
    }

    return { accounts, allOperations }
  }

  // W
  getCookie(name) {
    const found = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(`${name}=`))
    return found ? decodeURIComponent(found.slice(name.length + 1)) : null
  }

  // W
  getCookies() {
    return document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .filter(Boolean)
      .map(cookie => {
        const index = cookie.indexOf('=')
        return {
          name: cookie.slice(0, index),
          value: decodeURIComponent(cookie.slice(index + 1))
        }
      })
  }

  /**
   * Depending on a runtime check, the web app stores its token either in a
   * cookie or in sessionStorage under the literal key 'ACCESS_TOKEN'
   * (see the bundle: `isXxx() ? sessionStorage.setItem('ACCESS_TOKEN', …)
   * : cookies.set(ACCESS_TOKEN, …)`). Look in every place rather than
   * betting on one.
   */
  // W
  readStorage(key) {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      try {
        const value = storage && storage.getItem(key)
        if (value) return value
      } catch (err) {
        // storage can throw when it is disabled, just skip it
      }
    }
    return null
  }

  // W
  storageEntries() {
    const entries = []
    for (const storage of [window.sessionStorage, window.localStorage]) {
      try {
        if (!storage) continue
        for (let i = 0; i < storage.length; i++) {
          const name = storage.key(i)
          entries.push({ name, value: storage.getItem(name) || '' })
        }
      } catch (err) {
        // ignore an unavailable storage
      }
    }
    return entries
  }

  /**
   * The device id is a uuid, which makes it recognisable even if the cookie
   * gets renamed.
   */
  // W
  findDeviceId() {
    // A token is issued for one device; take the one the app pairs with the
    // token we captured rather than risk mixing the two.
    if (captured.deviceId) return captured.deviceId
    const known =
      this.getCookie(DEVICE_ID_COOKIE) || this.readStorage('DEVICE_ID')
    if (known) return known
    const guessed = [...this.getCookies(), ...this.storageEntries()].find(
      entry => UUID_RE.test(entry.value)
    )
    return guessed ? guessed.value : ''
  }

  /**
   * What was seen on the app's own API traffic. Never returns the token
   * itself, only what can be said about it without writing it down.
   */
  // W
  readCapturedAuth() {
    return {
      hasToken: Boolean(captured.accessToken),
      tokenLength: captured.accessToken ? captured.accessToken.length : 0,
      from: captured.from,
      authenticateSeen: captured.authenticateSeen
    }
  }

  /**
   * The access token is the only long opaque value left once the known short
   * ones (lang, analytics, device) are ruled out.
   */
  // W
  findAccessToken() {
    // What the app is actually using beats anything found lying around: a
    // stored value can be a leftover of a previous session, the header of a
    // live request cannot.
    if (captured.accessToken) return captured.accessToken
    const known =
      this.getCookie(ACCESS_TOKEN_COOKIE) || this.readStorage('ACCESS_TOKEN')
    if (known) return known
    // Guessing by shape was meant to survive a rename, but it happily picks
    // up any leftover long value — an analytics id, a Bankin session id —
    // and calls it a token. That made "logged out" look like "logged in",
    // so the login form returned at once and the run failed later. Only
    // consider entries whose name looks like the app's own (bw + 2 letters),
    // which is what a rename would still produce.
    const guessed = [...this.getCookies(), ...this.storageEntries()].find(
      entry =>
        /^bw[A-Za-z]{2}$/.test(entry.name) &&
        !/^(bwLg|bwAm|bwCk|bwPs|bwDi)$/.test(entry.name) &&
        entry.value.length >= 20 &&
        !UUID_RE.test(entry.value)
    )
    return guessed ? guessed.value : null
  }

  /**
   * The API client credentials. They are baked in at build time, but a build
   * made without them still works if the pilot found them in the keychain
   * (see fetch), which keeps them out of a public bundle.
   */
  // W
  getApiClient(given) {
    return {
      clientId: (given && given.clientId) || DEFAULT_CLIENT_ID,
      clientSecret: (given && given.clientSecret) || DEFAULT_CLIENT_SECRET
    }
  }
}

// The interceptor must be handed over, not just created: that is what gives it
// a logger, without which it throws while reporting an interception.
const connector = new BankinContentScript({ requestInterceptor })
connector
  .init({
    additionalExposedMethodsNames: [
      'checkAuthenticated',
      'getUserEmail',
      'fetchBankinData',
      'findAccessToken',
      'readCapturedAuth',
      'fillLoginForm',
      'readWebAppApiClient',
      'checkToken',
      'readSessionCookies',
      'writeSessionCookies',
      'wipeSessionCookies'
    ]
  })
  .catch(err => {
    log.warn(err)
  })

})();

/******/ })()
;