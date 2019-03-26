'use strict';

const { getFullStack } = require('./utils');


function serializeError(x) {
	if (x) {
		return {
			name: x.name,
			message: x.message,
			code: x.code,
			stack: getFullStack(x)
		};
	}
	return x;
}


exports.err = serializeError;
exports.error = serializeError;
