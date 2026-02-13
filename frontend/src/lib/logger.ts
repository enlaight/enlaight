// Simple logger utility for frontend
// Usage: import logger from './logger'; logger.info('message');

const levels = ['debug', 'info', 'warn', 'error'] as const;

type LogLevel = typeof levels[number];

const getLogLevel = (): LogLevel => {
	const env = import.meta.env.VITE_LOG_LEVEL || 'info';
	if (levels.includes(env)) return env as LogLevel;
	return 'info';
};

const shouldLog = (level: LogLevel) => {
	const current = levels.indexOf(getLogLevel());
	return levels.indexOf(level) >= current;
};


const serviceName = 'enlaight-frontend';
const getTimestamp = () => new Date().toISOString();

function ecsLog(level: LogLevel, ...args: any[]) {
	if (!shouldLog(level)) return;
	const ecsObj = {
		'@timestamp': getTimestamp(),
		'log.level': level,
		message: args.map(String).join(' '),
		'service.name': serviceName,
	};
	// Output as JSON for ECS compatibility
	// Use console method matching level
	const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;
	fn(JSON.stringify(ecsObj));
}

const logger = {
	debug: (...args: any[]) => ecsLog('debug', ...args),
	info: (...args: any[]) => ecsLog('info', ...args),
	warn: (...args: any[]) => ecsLog('warn', ...args),
	error: (...args: any[]) => ecsLog('error', ...args),
};

export default logger;
