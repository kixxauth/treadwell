'use strict';

const { getFullStack } = require('./utils');


function serializeError(x) {
	if (x) {
		x.stack = getFullStack(x);
	}
	return x;
}


exports.err = serializeError;
exports.error = serializeError;
