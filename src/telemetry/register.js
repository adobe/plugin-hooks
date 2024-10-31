let agent;

// Attempt to register newrelic agent
try {
	agent = require("newrelic");
} catch (err) {
	console.warn('newrelic agent not installed...');
}

// No other telemetry agents were registered so fall back on logging
if (!agent) {
	console.log('Falling back on log agent...');
	agent = require('./agents/log');
}

module.exports = agent;