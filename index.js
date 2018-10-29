'use strict';

var TaskRunner = require('./lib/task-runner');

var _currentTaskRunner;

exports.TaskRunner = TaskRunner;

exports.getCurrentTaskRunner = function getCurrentTaskRunner() {
	if (_currentTaskRunner) {
		return _currentTaskRunner;
	}

	_currentTaskRunner = TaskRunner.create();
	return _currentTaskRunner;
};

