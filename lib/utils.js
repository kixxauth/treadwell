'use strict';

const protoToString = Object.prototype.toString;

function mergeObject(target, source) {
	const keys = Object.keys(source);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const v = source[key];
		const t = target[key];

		if (typeof v !== 'object' || v === null) {
			target[key] = v;
			continue;
		}
		if (Array.isArray(v)) {
			target[key] = v.map(clone);
			continue;
		}
		if (protoToString.call(v) === '[object Date]') {
			target[key] = new Date(v.toString());
			continue;
		}
		if (typeof t !== 'object' || t === null) {
			target[key] = clone(v);
			continue;
		}

		target[key] = mergeObject(t, v);
	}

	return target;
}
exports.mergeObject = mergeObject;


function clone(obj) {
	const type = typeof obj;

	if (obj === null || type !== 'object') return obj;

	if (Array.isArray(obj)) return obj.map(clone);

	if (protoToString.call(obj) === '[object Date]') {
		return new Date(obj.toString());
	}

	const keys = Object.keys(obj);
	const newObj = {};

	for (let i = 0; i < keys.length; i++) {
		const k = keys[i];
		newObj[k] = clone(obj[k]);
	}

	return newObj;
}
exports.clone = clone;

