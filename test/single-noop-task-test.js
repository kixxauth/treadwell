'use strict';

const { assert } = require('kixx-assert');
const sinon = require('sinon');

const { TaskRunner } = require('../index');


module.exports = function (test) {
	function nothing(callback) {
		return function () {
			return callback();
		};
	}

	test.describe('with default logger', (t) => {
		let treadwell;

		const taskStartListener = sinon.spy();
		const taskEndListener = sinon.spy();
		const logSpy = sinon.spy();

		t.before((done) => {
			treadwell = TaskRunner.create();

			treadwell.on('task:start', taskStartListener);
			treadwell.on('task:end', taskEndListener);

			sinon.stub(treadwell.logger, 'log').callsFake(logSpy);

			treadwell.task('foo:noop');

			treadwell.run('foo:noop').then(nothing(done)).catch(done);
		});

		t.after((done) => {
			if (treadwell) {
				treadwell.removeAllListeners();
			}
			process.nextTick(done);
		});

		t.it('fires task:start event', () => {
			assert.isEqual(1, taskStartListener.callCount);
			const { args } = taskStartListener.firstCall;
			assert.isEqual('foo:noop', args[0].key);
		});

		t.it('fires task:end event', () => {
			assert.isEqual(1, taskEndListener.callCount);
			const { args } = taskEndListener.firstCall;
			assert.isEqual('foo:noop', args[0].key);
		});

		t.it('logs a message on task start', () => {
			assert.isGreaterThan(0, logSpy.callCount);
			const { args } = logSpy.firstCall;
			assert.isEqual('starting task "foo:noop"', args[0]);
		});

		t.it('logs a message on task end', () => {
			assert.isGreaterThan(1, logSpy.callCount);
			const { args } = logSpy.secondCall;
			assert.isEqual('task "foo:noop" complete', args[0]);
		});
	});
};
