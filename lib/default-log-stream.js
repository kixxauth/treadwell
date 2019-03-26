'use strict';

const { Transform } = require('stream');
const { Logger } = require('kixx-logger');
const { EOL } = require('os');
const { padEnd, jsonStringify } = require('./utils');


class DefaultLogStream extends Transform {
	// options.outputStream (default = process.stdout)
	constructor(options = {}) {
		super({ writableObjectMode: true });

		Object.defineProperties(this, {
			outputStream: {
				value: options.outputStream || process.stdout
			},
			startTime: {
				value: Date.now()
			}
		});
	}

	init() {
		this.pipe(this.outputStream);
	}

	_transform(rec, encoding, callback) {
		process.nextTick(() => {
			try {
				callback(null, this.recordToString(rec));
			} catch (err) {
				callback(err);
			}
		});
	}

	recordToString(rec) {
		const time = rec.time.getTime() - this.startTime;

		const seconds = Math.floor(time / 1000);
		const miliseconds = padEnd((time % 1000).toString(), 3, '0');
		const level = Logger.levelIntegerToString(rec.level).toUpperCase();
		const msg = JSON.stringify(rec.msg);

		const logString = `${seconds}.${miliseconds}s ${rec.name} ${level} ${msg}`;

		let hasUserProps = false;

		const userProps = Object.keys(rec).reduce((obj, key) => {
			if (!DefaultLogStream.EXPECTED_PROPS.includes(key)) {
				obj[key] = rec[key];
				hasUserProps = true;
			}
			return obj;
		}, Object.create(null));

		if (hasUserProps) {
			const json = jsonStringify(userProps, 2);
			return `${logString}${EOL}${json}`;
		}

		return logString;
	}
}

DefaultLogStream.EXPECTED_PROPS = [
	'time',
	'level',
	'name',
	'hostname',
	'pid',
	'msg'
];

module.exports = DefaultLogStream;
