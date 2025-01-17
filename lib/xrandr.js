"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.parser = xrandrParser;

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var CONNECTED_REGEX = /^(\S+) connected (primary )?(?:(\d+)x(\d+))?/;
var POSITION_REGEX = /\s+(\d+)x([0-9i]+)\+(\d+)\+(\d+)\s+/;
var DISCONNECTED_REGEX = /^(\S+) disconnected/;
var MODE_REGEX = /^\s+(\d+)x([0-9i]+)\s+((?:\d+\.)?\d+)([*+ ]?)([+* ]?)/;
var ROTATION_LEFT = /^([^(]+) left \((?:(\d+)x(\d+))?/;
var ROTATION_RIGHT = /^([^(]+) right \((?:(\d+)x(\d+))?/;
var ROTATION_INVERTED = /^([^(]+) inverted \((?:(\d+)x(\d+))?/; // eslint-disable-next-line max-len

var VERBOSE_MODE_REGEX = /^\s*(\d+)x([0-9i]+)(?:_.+)?\s+(?:\(0x[0-9a-f]+\)\.)?\s*([0-9.]+MHz)?\s*((\+|-)HSync)?\s*((\+|-)VSync)?\s*(\*current)?\s*(\+preferred)?/; // eslint-disable-next-line max-len

var VERBOSE_MODE_REGEX_CUSTOM = /^\s*([^\s]+)\s+(?:\(0x[0-9a-f]+\)\.)?\s*([0-9.]+MHz)?\s*((\+|-)HSync)?\s*((\+|-)VSync)?\s*(\*current)?\s*(\+preferred)?/;
var VERBOSE_HOR_MODE_REGEX = /^\s*h:\s+width\s+([0-9]+).+/;
var VERBOSE_VERT_MODE_REGEX = /^\s*v:\s+height\s+([0-9]+).+clock\s+([0-9.]+)Hz/;
var VERBOSE_ANY_LINE_REGEX = /^\s+[^\n]*/;
var VERBOSE_EDID_START_LINE = /^\s+EDID:/;
var VERBOSE_EDID_NEXT_LINE = /^\s+([0-f]{32})/;
var VERBOSE_ROTATION_LEFT = /^[^(]+\([^(]+\) left \(/;
var VERBOSE_ROTATION_RIGHT = /^[^(]+\([^(]+\) right \(/;
var VERBOSE_ROTATION_INVERTED = /^[^(]+\([^(]+\) inverted \(/;
var VERBOSE_BRIGHTNESS = /^\s+Brightness: ([0-9.]+)/;

function xrandrParser(input) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var strInput = input;

  var parseOptions = _objectSpread({
    verbosedInput: false,
    debug: false
  }, options);

  if (Buffer.isBuffer(input)) {
    strInput = input.toString();
  }

  var lines = strInput.split('\n');
  var result = {};
  var mode = {};
  var lastInterface;
  var startParseEdid;
  lines.forEach(function (line) {
    var parts;

    if (CONNECTED_REGEX.test(line)) {
      if (parseOptions.debug) {
        console.log('CONNECTED_REGEX', line);
      }

      parts = CONNECTED_REGEX.exec(line);
      result[parts[1]] = {
        connected: true,
        primary: !!parts[2],
        modes: [],
        rotation: 'normal'
      };

      if (parts[3] && parts[4]) {
        result[parts[1]].width = parseInt(parts[3], 10);
        result[parts[1]].height = parseInt(parts[4], 10);
      }

      if (!parseOptions.verbosedInput) {
        if (ROTATION_LEFT.test(line)) {
          result[parts[1]].rotation = 'left';
        } else if (ROTATION_RIGHT.test(line)) {
          result[parts[1]].rotation = 'right';
        } else if (ROTATION_INVERTED.test(line)) {
          result[parts[1]].rotation = 'inverted';
        }
      } else {
        if (VERBOSE_ROTATION_LEFT.test(line)) {
          result[parts[1]].rotation = 'left';
        } else if (VERBOSE_ROTATION_RIGHT.test(line)) {
          result[parts[1]].rotation = 'right';
        } else if (VERBOSE_ROTATION_INVERTED.test(line)) {
          result[parts[1]].rotation = 'inverted';
        }
      }

      var position = POSITION_REGEX.exec(line);

      if (position) {
        result[parts[1]].position = {
          x: parseInt(position[3], 10),
          y: parseInt(position[4], 10)
        };
      }

      lastInterface = parts[1];
    } else if (DISCONNECTED_REGEX.test(line)) {
      if (parseOptions.debug) {
        console.log('DISCONNECTED_REGEX', line);
      }

      parts = DISCONNECTED_REGEX.exec(line);
      result[parts[1]] = {
        connected: false,
        modes: []
      };
      lastInterface = parts[1];
    } else if (!parseOptions.verbosedInput && lastInterface && MODE_REGEX.test(line)) {
      if (parseOptions.debug) {
        console.log('MODE_REGEX', line);
      }

      parts = MODE_REGEX.exec(line);
      mode = {
        width: parseInt(parts[1], 10),
        height: parseInt(parts[2], 10),
        rate: parseFloat(parts[3])
      };
      if (/^[0-9]+i$/.test(parts[2])) mode.interlaced = true;
      if (parts[4] === '+' || parts[5] === '+') mode["native"] = true;
      if (parts[4] === '*' || parts[5] === '*') mode.current = true;
      result[lastInterface].modes.push(mode);
    } else if (parseOptions.verbosedInput && lastInterface && VERBOSE_BRIGHTNESS.test(line)) {
      if (parseOptions.debug) {
        console.log('VERBOSE_BRIGHTNESS', line);
      }

      parts = VERBOSE_BRIGHTNESS.exec(line);
      result[lastInterface].brightness = parseFloat(parts[1]);
    } else if (parseOptions.verbosedInput && lastInterface && mode && VERBOSE_HOR_MODE_REGEX.test(line)) {
      if (parseOptions.debug) {
        console.log('VERBOSE_HOR_MODE_REGEX', line);
      }

      parts = VERBOSE_HOR_MODE_REGEX.exec(line);
      mode.width = parseInt(parts[1], 10);
    } else if (parseOptions.verbosedInput && lastInterface && mode && VERBOSE_VERT_MODE_REGEX.test(line)) {
      if (parseOptions.debug) {
        console.log('VERBOSE_VERT_MODE_REGEX', line);
      }

      parts = VERBOSE_VERT_MODE_REGEX.exec(line);
      mode.height = parseInt(parts[1], 10);
      mode.rate = parseFloat(parts[2]);
      result[lastInterface].modes.push(mode);
      mode = null;
    } else if (parseOptions.verbosedInput && lastInterface && (VERBOSE_MODE_REGEX.test(line) || VERBOSE_MODE_REGEX_CUSTOM.test(line)) && !VERBOSE_EDID_START_LINE.test(line)) {
      if (parseOptions.debug) {
        console.log('VERBOSE_MODE_REGEX || VERBOSE_MODE_REGEX_CUSTOM', line);
      }

      parts = VERBOSE_MODE_REGEX.exec(line);

      if (!parts) {
        parts = VERBOSE_MODE_REGEX_CUSTOM.exec(line);
      }

      mode = {};
      /*  width: parseInt(parts[1], 10),
        height: parseInt(parts[2], 10)
      }; */

      if (/^[0-9]+i$/.test(parts[2])) mode.interlaced = true;
      if (line.includes('+preferred')) mode["native"] = true;
      if (line.includes('*current')) mode.current = true;
    } else if (parseOptions.verbosedInput && lastInterface && VERBOSE_EDID_START_LINE.test(line)) {
      if (parseOptions.debug) {
        console.log('VERBOSE_EDID_START_LINE', line);
      }

      startParseEdid = true;
      result[lastInterface].edid = '';
    } else if (startParseEdid && parseOptions.verbosedInput && lastInterface && VERBOSE_EDID_NEXT_LINE.test(line)) {
      if (parseOptions.debug) {
        console.log('VERBOSE_EDID_NEXT_LINE', line);
      }

      parts = VERBOSE_EDID_NEXT_LINE.exec(line);
      result[lastInterface].edid += parts[1];
    } else if (parseOptions.verbosedInput && lastInterface && VERBOSE_ANY_LINE_REGEX.test(line)) {
      if (parseOptions.debug) {
        console.log('VERBOSE_ANY_LINE_REGEX', line);
      }

      if (startParseEdid) {
        startParseEdid = false;
      }
    } else {
      lastInterface = null;
    }
  });
  return result;
}
//# sourceMappingURL=xrandr.js.map
