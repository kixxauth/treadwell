'use strict';

var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;

var arrayProtoSlice = Array.prototype.slice;

var LEVEL_NUMBERS = new Map([
	['DEBUG', DEBUG],
	['INFO', INFO],
	['WARN', WARN],
	['ERROR', ERROR]
]);

var LEVEL_STRINGS = new Map([
	[DEBUG, 'DEBUG'],
	[INFO, 'INFO'],
	[WARN, 'WARN'],
	[ERROR, 'ERROR']
]);

function Logger(options) {
	var self = this;

	options = options || {};

	var _level;

	logger_changeLevel(options.level);

	function appendMessage(level, message) {
		var now = new Date();
		var levelString = LEVEL_STRINGS.get(level);

		return '[treadwell] '+ now.toISOString() +' - '+ levelString.toLowerCase() +' - '+ message;
	}

	function logger_debug(message) {
		if (_level < DEBUG) {
			return self;
		}

		message = appendMessage(DEBUG, message);

		var args = arrayProtoSlice.call(arguments, 1);
		args.unshift(message);

		console.debug.apply(console, args); // eslint-disable-line no-console
	}

	function logger_info(message) {
		if (_level < INFO) {
			return self;
		}

		message = appendMessage(INFO, message);

		var args = arrayProtoSlice.call(arguments, 1);
		args.unshift(message);

		console.info.apply(console, args); // eslint-disable-line no-console
	}

	function logger_warn(message) {
		if (_level < WARN) {
			return self;
		}

		message = appendMessage(WARN, message);

		var args = arrayProtoSlice.call(arguments, 1);
		args.unshift(message);

		console.warn.apply(console, args); // eslint-disable-line no-console
	}

	function logger_error(message) {
		if (_level < ERROR) {
			return self;
		}

		message = appendMessage(ERROR, message);

		var args = arrayProtoSlice.call(arguments, 1);
		args.unshift(message);

		console.error.apply(console, args); // eslint-disable-line no-console
	}

	function logger_changeLevel(newLevel) {
		if (Number.isInteger(newLevel)) {
			_level = newLevel;
		} else if (typeof newLevel === 'string') {
			_level = LEVEL_NUMBERS.get(newLevel.toUpperCase()) || 50;
		} else {
			_level = 50;
		}
	}

	Object.defineProperties(self, {
		debug: {
			enumerable: true,
			value: logger_debug
		},
		info: {
			enumerable: true,
			value: logger_info
		},
		warn: {
			enumerable: true,
			value: logger_warn
		},
		error: {
			enumerable: true,
			value: logger_error
		}
	});
}

Logger.create = function (options) {
	return new Logger(options);
};

module.exports = Logger;
