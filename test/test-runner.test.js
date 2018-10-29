'use strict';

var assert = require('kixx-assert').assert;
var TaskRunner = require('../lib/task-runner');

module.exports = function (t) {

	function delay(ms) {
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(null);
			}, ms);
		});
	}

	t.describe('TestRunner#run()', function (t) {
		t.describe('primary logic path with promise tasks', function (t) {
			var runner;
			var result;

			var dependencyCount = 0;
			var dependencyCountWhenRoot;

			var parallelTimestamps = [];
			var serialTimestamps = [];

			var leafCount = 0;
			var leafCountWhenBranch;
			var leafCountWhenRoot;

			var leafThis;
			var branchThis;
			var rootThis;

			t.before(function (done) {
				var definitions = Object.freeze({
					'parallel-1': {
						task: function () {
							leafThis = this;
							parallelTimestamps.push(Date.now());

							return delay(10).then(function () {
								dependencyCount += 1;
								leafCount += 1;
								return 'parallel-1-result';
							});
						}
					},
					'parallel-2': {
						task: function () {
							leafThis = this;
							parallelTimestamps.push(Date.now());

							return delay(10).then(function () {
								dependencyCount += 1;
								leafCount += 1;
								return 'parallel-2-result';
							});
						}
					},
					'parallel-3': {
						task: function () {
							leafThis = this;
							parallelTimestamps.push(Date.now());

							return delay(10).then(function () {
								dependencyCount += 1;
								leafCount += 1;
								return 'parallel-3-result';
							});
						}
					},
					'serial-1': {
						task: function () {
							leafThis = this;

							serialTimestamps.push({
								index: 0,
								timestamp: Date.now()
							});

							return delay(10).then(function () {
								dependencyCount += 1;
								leafCount += 1;
								return 'serial-1-result';
							});
						}
					},
					'serial-2': {
						task: function () {
							leafThis = this;

							serialTimestamps.push({
								index: 1,
								timestamp: Date.now()
							});

							return delay(10).then(function () {
								dependencyCount += 1;
								leafCount += 1;
								return 'serial-2-result';
							});
						}
					},
					'serial-3': {
						task: function () {
							leafThis = this;

							serialTimestamps.push({
								index: 2,
								timestamp: Date.now()
							});

							return delay(10).then(function () {
								dependencyCount += 1;
								leafCount += 1;
								return 'serial-3-result';
							});
						}
					},
					'group-parallel': {
						dependencies: ['parallel-1', 'parallel-2', 'parallel-3'],
						parallelize: true,
						task: function () {
							branchThis = this;

							return Promise.resolve(null).then(function () {
								dependencyCount += 1;
								leafCountWhenBranch = leafCount;
								leafCount += 1;
								return 'group-parallel-result';
							});
						}
					},
					'group-serial': {
						dependencies: ['serial-1', 'serial-2', 'serial-3'],
						parallelize: false,
						task: function () {
							branchThis = this;

							return Promise.resolve(null).then(function () {
								dependencyCount += 1;
								leafCountWhenBranch = leafCount;
								leafCount += 1;
								return 'group-serial-result';
							});
						}
					},
					'root': {
						dependencies: ['group-serial', 'group-parallel'],
						parallelize: true,
						task: function () {
							rootThis = this;

							return Promise.resolve(null).then(function () {
								dependencyCountWhenRoot = dependencyCount;
								leafCountWhenRoot = leafCount;
								return 'root-result';
							});
						}
					}
				});

				runner = TaskRunner.create();
				runner.defineTasks(definitions);

				return runner.run('root').then(function (res) {
					result = res;
					done();
				}, done);
			});

			t.it('should run all dependencies and then the root task last', function () {
				assert.isEqual(8, dependencyCount);
				assert.isEqual(8, dependencyCountWhenRoot);
			});

			t.it('should run parallel dependencies in parallel', function () {
				var first = parallelTimestamps[0];
				var second = parallelTimestamps[1];
				var third = parallelTimestamps[2];

				assert.isGreaterThan(1540730000000, first);

				var delta1 = third - second;
				var delta2 = second - first;

				assert.isLessThan(2, delta1);
				assert.isGreaterThan(-1, delta1);

				assert.isLessThan(2, delta2);
				assert.isGreaterThan(-1, delta2);
			});

			t.it('should run serial dependencies in serial', function () {
				var first = serialTimestamps[0];
				var second = serialTimestamps[1];
				var third = serialTimestamps[2];

				assert.isEqual(0, first.index);
				assert.isEqual(1, second.index);
				assert.isEqual(2, third.index);

				var delta = third.timestamp - first.timestamp;

				assert.isGreaterThan(19, delta);
				assert.isLessThan(30, delta);
			});

			t.it('should run leaf dependencies first', function () {
				assert.isEqual(8, leafCount);
				assert.isEqual(7, leafCountWhenBranch);
				assert.isEqual(8, leafCountWhenRoot);
			});

			t.it('should run leaf tasks with this set to runner instance', function () {
				assert.isEqual(runner, leafThis);
			});

			t.it('should run branch tasks with this set to runner instance', function () {
				assert.isEqual(runner, branchThis);
			});

			t.it('should run root task with this set to runner instance', function () {
				assert.isEqual(runner, rootThis);
			});

			t.it('should append results to the result Map', function () {
				assert.isEqual('parallel-1-result', result.get('parallel-1'));
				assert.isEqual('parallel-2-result', result.get('parallel-2'));
				assert.isEqual('parallel-3-result', result.get('parallel-3'));
				assert.isEqual('serial-1-result', result.get('serial-1'));
				assert.isEqual('serial-2-result', result.get('serial-2'));
				assert.isEqual('serial-3-result', result.get('serial-3'));
				assert.isEqual('group-parallel-result', result.get('group-parallel'));
				assert.isEqual('group-serial-result', result.get('group-serial'));
				assert.isEqual('root-result', result.get('root'));
			});
		});

		t.describe('with synchronous tasks', function (t) {
			var dependencyCount = 0;
			var dependencyCountWhenRoot;

			var parallelTimestamps = [];
			var serialTimestamps = [];

			var leafCount = 0;
			var leafCountWhenBranch;
			var leafCountWhenRoot;

			t.before(function (done) {
				var definitions = Object.freeze({
					'parallel-1': {
						task: function () {
							parallelTimestamps.push(Date.now());
							dependencyCount += 1;
							leafCount += 1;
							return null;
						}
					},
					'parallel-2': {
						task: function () {
							parallelTimestamps.push(Date.now());
							dependencyCount += 1;
							leafCount += 1;
							return null;
						}
					},
					'serial-1': {
						task: function () {
							serialTimestamps.push({
								index: 0,
								timestamp: Date.now()
							});

							dependencyCount += 1;
							leafCount += 1;
							return null;
						}
					},
					'serial-2': {
						task: function () {
							serialTimestamps.push({
								index: 1,
								timestamp: Date.now()
							});

							dependencyCount += 1;
							leafCount += 1;
							return null;
						}
					},
					'group-parallel': {
						dependencies: ['parallel-1', 'parallel-2'],
						parallelize: true,
						task: function () {
							dependencyCount += 1;
							leafCountWhenBranch = leafCount;
							leafCount += 1;
							return null;
						}
					},
					'group-serial': {
						dependencies: ['serial-1', 'serial-2'],
						parallelize: false,
						task: function () {
							dependencyCount += 1;
							leafCountWhenBranch = leafCount;
							leafCount += 1;
							return null;
						}
					},
					'root': {
						dependencies: ['group-serial', 'group-parallel'],
						parallelize: true,
						task: function () {
							dependencyCountWhenRoot = dependencyCount;
							leafCountWhenRoot = leafCount;
							return null;
						}
					}
				});

				var runner = TaskRunner.create();

				runner.defineTasks(definitions);

				return runner.run('root').then(function () {
					done();
				}, done);
			});

			t.it('should run all dependencies and then the root task last', function () {
				assert.isEqual(6, dependencyCount);
				assert.isEqual(6, dependencyCountWhenRoot);
			});

			t.it('should run parallel dependencies in parallel', function () {
				var first = parallelTimestamps[0];
				var second = parallelTimestamps[1];

				assert.isGreaterThan(1540730000000, first);

				var delta = second - first;

				assert.isLessThan(2, delta);
				assert.isGreaterThan(-1, delta);
			});

			t.it('should run serial dependencies in serial', function () {
				var first = serialTimestamps[0];
				var second = serialTimestamps[1];

				assert.isEqual(0, first.index);
				assert.isEqual(1, second.index);

				var delta = second.timestamp - first.timestamp;

				assert.isGreaterThan(-1, delta);
				assert.isLessThan(3, delta);
			});

			t.it('should run leaf dependencies first', function () {
				assert.isEqual(6, leafCount);
				assert.isEqual(5, leafCountWhenBranch);
				assert.isEqual(6, leafCountWhenRoot);
			});
		});

		t.describe('with callback tasks', function (t) {
			var dependencyCount = 0;
			var dependencyCountWhenRoot;

			var parallelTimestamps = [];
			var serialTimestamps = [];

			var leafCount = 0;
			var leafCountWhenBranch;
			var leafCountWhenRoot;

			t.before(function (done) {
				var definitions = Object.freeze({
					'parallel-1': {
						task: function (callback) {
							parallelTimestamps.push(Date.now());

							setTimeout(function () {
								dependencyCount += 1;
								leafCount += 1;

								callback();
							}, 10);
						}
					},
					'parallel-2': {
						task: function (callback) {
							parallelTimestamps.push(Date.now());

							setTimeout(function () {
								dependencyCount += 1;
								leafCount += 1;

								callback();
							}, 10);
						}
					},
					'serial-1': {
						task: function (callback) {
							serialTimestamps.push({
								index: 0,
								timestamp: Date.now()
							});

							setTimeout(function () {
								dependencyCount += 1;
								leafCount += 1;

								callback();
							}, 10);
						}
					},
					'serial-2': {
						task: function (callback) {
							serialTimestamps.push({
								index: 1,
								timestamp: Date.now()
							});

							setTimeout(function () {
								dependencyCount += 1;
								leafCount += 1;

								callback();
							}, 10);
						}
					},
					'group-parallel': {
						dependencies: ['parallel-1', 'parallel-2'],
						parallelize: true,
						task: function (callback) {
							leafCountWhenBranch = leafCount;

							setTimeout(function () {
								dependencyCount += 1;
								leafCount += 1;
								callback();
							}, 10);
						}
					},
					'group-serial': {
						dependencies: ['serial-1', 'serial-2'],
						parallelize: false,
						task: function (callback) {
							leafCountWhenBranch = leafCount;

							setTimeout(function () {
								dependencyCount += 1;
								leafCount += 1;
								callback();
							}, 10);
						}
					},
					'root': {
						dependencies: ['group-serial', 'group-parallel'],
						parallelize: true,
						task: function (callback) {
							dependencyCountWhenRoot = dependencyCount;
							leafCountWhenRoot = leafCount;
							setTimeout(callback);
						}
					}
				});

				var runner = TaskRunner.create();

				runner.defineTasks(definitions);

				return runner.run('root').then(function () {
					done();
				}, done);
			});

			t.it('should run all dependencies and then the root task last', function () {
				assert.isEqual(6, dependencyCount);
				assert.isEqual(6, dependencyCountWhenRoot);
			});

			t.it('should run parallel dependencies in parallel', function () {
				var first = parallelTimestamps[0];
				var second = parallelTimestamps[1];

				assert.isGreaterThan(1540730000000, first);

				var delta = second - first;

				assert.isLessThan(2, delta);
				assert.isGreaterThan(-1, delta);
			});

			t.it('should run serial dependencies in serial', function () {
				var first = serialTimestamps[0];
				var second = serialTimestamps[1];

				assert.isEqual(0, first.index);
				assert.isEqual(1, second.index);

				var delta = second.timestamp - first.timestamp;

				assert.isGreaterThan(10, delta);
				assert.isLessThan(20, delta);
			});

			t.it('should run leaf dependencies first', function () {
				assert.isEqual(6, leafCount);
				assert.isEqual(5, leafCountWhenBranch);
				assert.isEqual(6, leafCountWhenRoot);
			});
		});
	});
};
