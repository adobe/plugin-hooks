/**
 * Stub replacement for newrelic.startSegment used by `plugin-hooks`. Does NOT report telemetry back to newrelic.
 * @param {string} name The name to give the new segment. This will also be the name of the metric.
 * @param {boolean} record Indicates if the segment should be recorded as a metric. Metrics will show up on the transaction breakdown table and server breakdown graph. Segments just show up in transaction traces.
 * @param {() => Promise<void>}handler The function to track as a segment.
 * @param {Function?} _callback An optional callback for the handler. This will indicate the end of the timing if provided.
 */
const startSegment = async (name, record, handler, _callback) => {
	console.log(name);
	await handler();
}

module.exports = {
	startSegment,
}
