'use strict';

const { assert } = require('kixx-assert');

const { Writable } = require('stream');
const StackedError = require('../lib/stacked-error');
const { createLogger } = require('kixx-logger');
const logSerializers = require('../lib/log-serializers');
const DefaultLogStream = require('../lib/default-log-stream');
const { getFullStack } = require('../lib/utils');


function endsWith(str, subStr) {
	return str.slice(0 - subStr.length) === subStr;
}

function toJsonString(obj) {
	return JSON.stringify(obj, null, 2);
}


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

			// Delay to give the stream a chance to write in the next
			// turn of the event loop.
			return delay(10).then(done);
		});

		t.it('pipes to the output stream with formatted string', () => {
			assert.isEqual(1, outputStream.buffer.length);
			const { chunk, encoding } = outputStream.buffer[0];
			assert.isEqual('buffer', encoding);
			assert.isMatch(/^0\.[\d]{1}00s test INFO "#log 1"$/, chunk.toString());
		});
	});

	test.describe('with user defined props', (t) => {
		let outputStream;

		t.before((done) => {
			outputStream = new BufferStream();

			const logger = createLogger({
				name: 'test',
				stream: new DefaultLogStream({ outputStream }),
				serializers: logSerializers
			});

			logger.debug('#log 2', { foo: 'bar' });

			// Delay to give the stream a chance to write in the next
			// turn of the event loop.
			return delay(10).then(done);
		});

		t.it('pipes to the output stream with formatted string', () => {
			assert.isEqual(1, outputStream.buffer.length);
			const { chunk, encoding } = outputStream.buffer[0];
			assert.isEqual('buffer', encoding);
			const str = chunk.toString();
			assert.isMatch(/^0\.[\d]{1}00s test DEBUG "#log 2"/, str);
			assert.isOk(endsWith(str, toJsonString({ foo: 'bar' })));
		});
	});

	test.describe('with native Error as err', (t) => {
		let outputStream;
		const error = new Error('TEST');

		t.before((done) => {
			outputStream = new BufferStream();

			const logger = createLogger({
				name: 'test',
				stream: new DefaultLogStream({ outputStream }),
				serializers: logSerializers
			});

			logger.error('error', { err: error });

			// Delay to give the stream a chance to write in the next
			// turn of the event loop.
			return delay(10).then(done);
		});

		t.it('pipes to the output stream with formatted string', () => {
			assert.isEqual(1, outputStream.buffer.length);
			const { chunk, encoding } = outputStream.buffer[0];
			assert.isEqual('buffer', encoding);

			const str = chunk.toString();

			assert.isMatch(/^0\.[\d]{1}00s test ERROR "error"/, str);

			assert.isOk(endsWith(str, toJsonString({
				err: {
					name: 'Error',
					message: 'TEST',
					stack: error.stack
				}
			})));
		});
	});

	test.describe('with native Error as error', (t) => {
		let outputStream;
		const error = new Error('TEST');

		t.before((done) => {
			outputStream = new BufferStream();

			const logger = createLogger({
				name: 'test',
				stream: new DefaultLogStream({ outputStream }),
				serializers: logSerializers
			});

			logger.error('error', { error });

			// Delay to give the stream a chance to write in the next
			// turn of the event loop.
			return delay(10).then(done);
		});

		t.it('pipes to the output stream with formatted string', () => {
			assert.isEqual(1, outputStream.buffer.length);
			const { chunk, encoding } = outputStream.buffer[0];
			assert.isEqual('buffer', encoding);

			const str = chunk.toString();

			assert.isMatch(/^0\.[\d]{1}00s test ERROR "error"/, str);

			assert.isOk(endsWith(str, toJsonString({
				error: {
					name: 'Error',
					message: 'TEST',
					stack: error.stack
				}
			})));
		});
	});

	test.describe('with StackedError as err', (t) => {
		let outputStream;
		const error = new StackedError('TOP', new Error('TEST'));

		t.before((done) => {
			outputStream = new BufferStream();

			const logger = createLogger({
				name: 'test',
				stream: new DefaultLogStream({ outputStream }),
				serializers: logSerializers
			});

			logger.error('error', { err: error });

			// Delay to give the stream a chance to write in the next
			// turn of the event loop.
			return delay(10).then(done);
		});

		t.it('pipes to the output stream with formatted string', () => {
			assert.isEqual(1, outputStream.buffer.length);
			const { chunk, encoding } = outputStream.buffer[0];
			assert.isEqual('buffer', encoding);

			const str = chunk.toString();

			assert.isMatch(/^0\.[\d]{1}00s test ERROR "error"/, str);

			assert.isOk(endsWith(str, toJsonString({
				err: {
					name: 'StackedError',
					message: 'TOP: TEST',
					stack: getFullStack(error)
				}
			})));
		});
	});

	test.describe('with StackedError as error', (t) => {
		let outputStream;
		const error = new StackedError('TOP', new Error('TEST'));

		t.before((done) => {
			outputStream = new BufferStream();

			const logger = createLogger({
				name: 'test',
				stream: new DefaultLogStream({ outputStream }),
				serializers: logSerializers
			});

			logger.error('error', { error });

			// Delay to give the stream a chance to write in the next
			// turn of the event loop.
			return delay(10).then(done);
		});

		t.it('pipes to the output stream with formatted string', () => {
			assert.isEqual(1, outputStream.buffer.length);
			const { chunk, encoding } = outputStream.buffer[0];
			assert.isEqual('buffer', encoding);

			const str = chunk.toString();

			assert.isMatch(/^0\.[\d]{1}00s test ERROR "error"/, str);

			assert.isOk(endsWith(str, toJsonString({
				error: {
					name: 'StackedError',
					message: 'TOP: TEST',
					stack: getFullStack(error)
				}
			})));
		});
	});
};

