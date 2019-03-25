'use strict';

const { Writable } = require('stream');
const { EOL } = require('os');
const { jsonStringify } = require('./utils');

class DefaultLogStream extends Writable {
	// options.outputStream (default = process.stdout)
	constructor(options = {}) {
		super({ objectMode: true });

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

	_write(rec, encoding, callback) {
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
		const miliseconds = time % 1000;

		const logString = `[${seconds}.${miliseconds}] - ${rec.level} - [${rec.name}] - ${rec.msg}`;

		let hasUserProps = false;

		const userProps = Object.keys(rec).reduce((obj, key) => {
			if (!DefaultLogStream.EXPECTED_PROPS.includes(key)) {
				obj[key] = rec.key;
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
	'msg'
];

module.exports = DefaultLogStream;
