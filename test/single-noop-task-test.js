'use strict';

const { assert } = require('kixx-assert');

const { TaskRunner } = require('../index');


module.exports = function (test) {
	function nothing(callback) {
		return function () {
			return callback();
		};
	}

	test.describe('with default logger', (t) => {
		let treadwell;

		t.before((done) => {
			treadwell = TaskRunner.create();

			treadwell.task('foo:noop');

			treadwell.run('foo:noop').then(nothing(done)).catch(done);
		});

		t.after((done) => {
			if (treadwell) {
				treadwell.removeAllListeners();
			}
			process.nextTick(done);
		});

		t.it('is not smoking', () => {
			assert.isOk(true, 'is not smoking');
		});
	});
};
