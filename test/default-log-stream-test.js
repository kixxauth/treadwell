'use strict';

const { assert } = require('kixx-assert');

const { Writable } = require('stream');
const { createLogger } = require('kixx-logger');
const logSerializers = require('../lib/log-serializers');
const DefaultLogStream = require('../lib/default-log-stream');


module.exports = function (test) {
	class BufferStream extends Writable {
		constructor() {
			super();

			this.buffer = [];
		}

		_write(chunk, encoding, callback) {
			this.buffer.push({ chunk, encoding });
			process.nextTick(callback);
		}
	}

	function delay(ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	test.describe('with only string message', (t) => {
		let outputStream;

		t.before((done) => {
			outputStream = new BufferStream();

			const logger = createLogger({
				name: 'test',
				stream: new DefaultLogStream({ outputStream }),
				serializers: logSerializers
			});

			logger.log('#log 1');

			return delay(10).then(done);
		});

		t.it('pipes to the output stream with formatted string', () => {
			assert.isEqual(1, outputStream.buffer.length);
			const { chunk, encoding } = outputStream.buffer[0];
			assert.isEqual('buffer', encoding);
			assert.isEqual('foo', chunk.toString());
		});
	});
};

