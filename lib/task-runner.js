'use strict';

const { EventEmitter } = require('events');
const { Logger, createLogger } = require('kixx-logger');
const Args = require('./args');
const StackedError = require('./stacked-error');
const DefaultLogStream = require('./default-log-stream');
const logSerializers = require('./log-serializers');

const {
	isNonEmptyString,
	mergeObject
} = require('./utils');


Logger.prototype.log = Logger.prototype.info;


class TaskRunner extends EventEmitter {

	static get Events() {
		return Object.freeze({
			TASK_START: 'task:start',
			TASK_END: 'task:end'
		});
	}

	constructor(options) {
		super();

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
				fn = C.identityPromise;
				break;
			case 2:
				name = C.validateTaskName(name, this.task);
				if (typeof dependencies === 'function') {
					fn = C.validateTaskFunction(dependencies, this.task);
					dependencies = [];
				} else {
					dependencies = C.validateTaskDependencies(dependencies, this.task);
					fn = C.identityPromise;
				}
				break;
			default:
				name = C.validateTaskName(name, this.task);
				dependencies = C.validateTaskDependencies(dependencies, this.task);
				fn = C.validateTaskFunction(fn, this.task);
		}

		const task = this.createTask(name, dependencies, fn);

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

		const task = this.taskRegistry.get(taskKey);

		if (typeof task !== 'function') {
			throw new StackedError(`run() task "${taskKey}" does not exist`, null, this.run);
		}

		options = mergeObject(mergeObject({}, this.options), options || {});

		const logger = options.logger || this.logger;
		this.logger = logger;
		this.bindLogger(logger);

		const args = new this.Args({ logger });

		this.result = task(args);

		return this.result;
	}

	create(options) {
		return this.constructor.create(options);
	}

	bindLogger(logger) {
		const { TASK_START, TASK_END } = TaskRunner.Events;

		this.on(TASK_START, ({ key }) => {
			logger.log(`starting task "${key}"`);
		});

		this.on(TASK_END, ({ key }) => {
			logger.log(`task "${key}" complete`);
		});
	}

	createTask(name, dependencies, taskFunction) {

		const getTask = (key) => {
			if (typeof key !== 'string') {
				return composeDependencies(key); // eslint-disable-line no-use-before-define
			}

			const task = this.taskRegistry.get(key);

			if (typeof task !== 'function') {
				throw new StackedError(
					`Dependency "${key}" for task "${name}" has not been defined`,
					null,
					wrappedTask
				);
			}

			return task;
		};

		const composeDependencies = (deps) => {
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
		};

		function wrappedTask(args) {
			const { TASK_START, TASK_END } = TaskRunner.Events;

			this.emit(TASK_START, { key: name });

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
					return res.then((args) => {
						this.emit(TASK_END, { key: name });
						return args;
					}).catch((err) => {
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
		return wrappedTask.bind(this);
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

	static identityPromise(x) {
		return Promise.resolve(x);
	}

	static create(options) {
		return new TaskRunner(options || {});
	}
}

module.exports = TaskRunner;
