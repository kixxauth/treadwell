'use strict';

const { mergeObject } = require('./utils');


class Args {
	constructor(props) {
		Object.assign(this, props);
	}

	get(path, defaultValue) {
		if (typeof path === 'string') {
			path = path.split('.');
		}

		let val = this;

		try {
			for (let i = 0; i < path.length; i++) {
				val = val[path[i]];
			}
		} catch (err) {
			return defaultValue;
		}

		if (typeof val === 'undefined') {
			return defaultValue;
		}
		return val;
	}

	merge(source) {
		return mergeObject(this, source);
	}
}

module.exports = Args;
