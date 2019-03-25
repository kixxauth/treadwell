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

		t.before((done) => {
			treadwell = TaskRunner.create();

			treadwell.on('task:start', taskStartListener);
			treadwell.on('task:end', taskEndListener);

			treadwell.task('foo:noop');

			treadwell.run('foo:noop').then(nothing(done)).catch(done);
		});

		t.after((done) => {
			if (treadwell) {
				treadwell.removeAllListeners();
			}
			process.nextTick(done);
		});

		t.it('fires task:start listener', () => {
			assert.isEqual(1, taskStartListener.callCount);
		});

		t.it('fires task:end listener', () => {
			assert.isEqual(1, taskEndListener.callCount);
		});
	});
};
