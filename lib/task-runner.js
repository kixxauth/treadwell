'use strict';

var Logger = require('./logger');

function TaskRunner(options) {
	var self = this;
	options = options || {};

	var _tasks = Object.create(null);

	function taskRunner_defineTasks(taskDefinitions) {
		Object.keys(taskDefinitions).forEach(function (key) {
			var definition = taskDefinitions[key];

			var dependencies = definition.dependencies;
			var task = definition.task;
			var parallelize = definition.parallelize;

			taskRunner_task({
				name: key,
				dependencies: dependencies,
				task: task,
				parallelize: parallelize
			});
		});
	}

	// Public
	// Create a task function.
	function taskRunner_task(spec) {
		var name = spec.name;
		var dependencies = spec.dependencies;
		var task = spec.task;
		var parallelize = Boolean(spec.parallelize);

		_tasks[name] = function (results) {
			var promise;

			// Execute prerequisite tasks first.

			if (dependencies && dependencies.length > 0 && parallelize) {
				// Execute dependencies in parallel.
				promise = Promise.all(dependencies.map(function (dep) {
					var execTask = _tasks[dep];
					return execTask(results);
				}));
			} else if (dependencies && dependencies.length > 0) {
				// Execute dependencies in serial.
				promise = dependencies.reduce(function (promise, dep) {
					return promise.then(function () {
						var execTask = _tasks[dep];
						return execTask(results);
					});
				}, Promise.resolve(null));
			} else {
				// No dependencies.
				promise = Promise.resolve(null);
			}

			// Execute this task and then always return a promise.
			return promise.then(function () {
				return new Promise(function (resolve, reject) {

					function resolver(thisResult) {
						results.set(name, thisResult);
						resolve(results);
					}

					function callback(err, result) {
						if (err) {
							return reject(err);
						}
						resolver(result);
					}

					var res;

					try {
						res = task.call(self, callback);
					} catch (err) {
						return reject(err);
					}

					if (res && typeof res.then === 'function') {
						return res.then(resolver, reject);
					}

					// If the task function has an arity (length) of 0, we know it is
					// not using the callback and we interpret the returned value as
					// the result.
					if (task.length === 0) {
						return resolver(res);
					}
				});
			});
		};
	}

	// Public
	// Run a root task and its dependencies.
	function taskRunner_run(rootTaskName, args) {
		args = args || {};

		var fullArgs;

		// Convert args into a Map

		if (Array.isArray(args)) {
			fullArgs = args;
		} else if (args && !Array.isArray(args)) {
			fullArgs = Object.keys(args).map(function (key) {
				var val = args[key];
				return [key, val];
			});
		} else {
			fullArgs = [];
		}

		var argsMap = new Map(fullArgs);

		var rootTask = _tasks[rootTaskName];

		return rootTask(argsMap);
	}

	Object.defineProperties(self, {
		defineTasks: {
			enumerable: true,
			value: taskRunner_defineTasks
		},
		task: {
			enumerable: true,
			value: taskRunner_task
		},
		run: {
			enumerable: true,
			value: taskRunner_run
		},
		logger: {
			enumerable: true,
			value: Logger.create({level: options.level})
		}
	});
}

TaskRunner.create = function (options) {
	return new TaskRunner(options);
};

module.exports = TaskRunner;
