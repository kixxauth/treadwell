'use strict';

const { Logger, createLogger } = require('kixx-logger');
const Args = require('./args');
const StackedError = require('./stacked-error');
const DefaultLogStream = require('./default-log-stream');
const logSerializers = require('./log-serializers');

const {
	isNonEmptyString,
	mergeObject
} = require('./utils');


class TaskRunner {
	constructor(options) {
		Object.defineProperties(this, {
			TaskRunner: {
				enumerable: true,
				writable: true,
				value: TaskRunner
			},
			Args: {
				enumerable: true,
				writable: true,
				value: Args
			},
			logger: {
				enumerable: true,
				writable: true,
				value: createLogger({
					name: 'treadwell',
					level: Logger.DEBUG,
					stream: new DefaultLogStream(),
					serializers: logSerializers
				})
			},
			options: {
				value: options || {}
			},
			taskRegistry: {
				value: new Map()
			},
			result: {
				writable: true,
				value: null
			}
		});
	}

	task(name, dependencies, fn) {
		const C = this.constructor;

		switch (arguments.length) {
			case 1:
				name = C.validateTaskName(name, this.task);
				dependencies = [];
				fn = C.identity;
				break;
			case 2:
				name = C.validateTaskName(name, this.task);
				if (typeof dependencies === 'function') {
					fn = C.validateTaskFunction(dependencies, this.task);
					dependencies = [];
				} else {
					dependencies = C.validateTaskDependencies(dependencies, this.task);
					fn = C.identity;
				}
				break;
			default:
				name = C.validateTaskName(name, this.task);
				dependencies = C.validateTaskDependencies(dependencies, this.task);
				fn = C.validateTaskFunction(fn, this.task);
		}

		const task = C.createTask(this.taskRegistry, name, dependencies, fn);

		this.taskRegistry.set(name, task);

		return this;
	}

	run(taskKey, options) {
		if (this.result) {
			return this.result;
		}

		if (!isNonEmptyString(taskKey)) {
			throw new StackedError('run() taskKey must be a non empty String', null, this.run);
		}

		console.log(this.taskRegistry);
		const task = this.taskRegistry.get(taskKey);

		if (typeof task !== 'function') {
			throw new StackedError(`run() task "${taskKey}" does not exist`, null, this.run);
		}

		options = mergeObject(mergeObject({}, this.options), options || {});

		const logger = new this.Logger();
		this.logger = logger;

		const args = new this.Args({ logger });

		this.result = task(args);

		return this.result;
	}

	identity(x) {
		return x;
	}

	create(options) {
		return this.constructor.create(options);
	}

	static validateTaskName(name, callee) {
		if (isNonEmptyString(name)) {
			return name;
		}
		throw new StackedError('A task name must be a non empty String', null, callee);
	}

	static validateTaskDependencies(dependencies, callee) {
		if (isNonEmptyString(dependencies)) return dependencies;

		const { validateTaskDependencies } = this.constructor;

		if (Array.isArray(dependencies)) {
			for (let i = 0; i < dependencies.length; i++) {
				validateTaskDependencies(dependencies[i], callee);
			}
			return dependencies;
		}

		if (dependencies instanceof Set) {
			const list = dependencies.values();
			for (let i = 0; i < list.length; i++) {
				validateTaskDependencies(list[i], callee);
			}
			return dependencies;
		}

		throw new StackedError('Task dependencies must be an Array, Set, or String', null, callee);
	}

	static validateTaskFunction(fn, callee) {
		if (typeof fn === 'function') {
			return fn;
		}
		throw new StackedError('A task function must be a Function', null, callee);
	}

	static identity(x) {
		return x;
	}

	static createTask(registry, name, dependencies, taskFunction) {

		function getTask(key) {
			if (typeof key !== 'string') {
				return composeDependencies(key);
			}

			const task = registry.get(key);

			if (typeof task !== 'function') {
				throw new StackedError(
					`Dependency "${key}" for task "${name}" has not been defined`,
					null,
					wrappedTask
				);
			}

			return task;
		}

		function composeDependencies(deps) {
			if (deps instanceof Set) {
				const tasks = deps.values().map(getTask);

				// If `deps` is a Set, order of execution does not matter so we execute in parallel.
				return function (args) {
					const promise = Promise.all(tasks.map((fn) => {
						return fn(args);
					}));

					return promise.then((argsList) => {
						const seed = argsList.shift();

						return argsList.reduce((acc, args) => {
							return acc.merge(args);
						}, seed);
					});
				};
			}

			// If not a Set, `deps` must be an Array.
			const tasks = deps.map(getTask);

			return function (args) {
				return tasks.reduce((promise, fn) => {
					return promise.then((args) => {
						return fn(args);
					});
				}, Promise.resolve(args));
			};
		}

		function wrappedTask(args) {
			const executeDependencies = composeDependencies(dependencies);

			return executeDependencies(args).then((args) => {
				let res;
				try {
					res = taskFunction(args);
				} catch (err) {
					return Promise.reject(new StackedError(
						`Synchronous error in task "${name}"`,
						err
					));
				}

				if (res && typeof res.then === 'function' && typeof res.catch === 'function') {
					return res.catch((err) => {
						return Promise.reject(new StackedError(
							`Asynchronous error in task "${name}"`,
							err
						));
					});
				}

				return Promise.reject(new Error(`Task "${name}" did not return a Promise instance`));
			});
		}

		wrappedTask.key = name;
		return wrappedTask;
	}

	static create(options) {
		return new TaskRunner(options || {});
	}
}

module.exports = TaskRunner;
