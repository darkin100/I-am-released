// Logging utility for Vercel Functions
// Provides structured logging that works well with Vercel's log aggregation

const crypto = require('crypto');

// Generate a unique request ID for tracking
function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

// Log levels
const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor(functionName, requestId = null) {
    this.functionName = functionName;
    this.requestId = requestId || generateRequestId();
    this.startTime = Date.now();
  }

  // Create structured log entry
  _createLogEntry(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      functionName: this.functionName,
      requestId: this.requestId,
      message,
      duration: Date.now() - this.startTime,
      ...data
    };

    // Remove sensitive data
    if (logEntry.headers) {
      logEntry.headers = this._sanitizeHeaders(logEntry.headers);
    }
    if (logEntry.error) {
      logEntry.error = this._sanitizeError(logEntry.error);
    }

    return logEntry;
  }

  // Sanitize headers to remove sensitive information
  _sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // Sanitize error objects
  _sanitizeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
    return error;
  }

  // Log methods
  info(message, data = {}) {
    const logEntry = this._createLogEntry(LogLevel.INFO, message, data);
    console.log(JSON.stringify(logEntry));
  }

  warn(message, data = {}) {
    const logEntry = this._createLogEntry(LogLevel.WARN, message, data);
    console.warn(JSON.stringify(logEntry));
  }

  error(message, error = null, data = {}) {
    const logEntry = this._createLogEntry(LogLevel.ERROR, message, {
      ...data,
      error: error ? this._sanitizeError(error) : undefined
    });
    console.error(JSON.stringify(logEntry));
  }

  debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const logEntry = this._createLogEntry(LogLevel.DEBUG, message, data);
      console.log(JSON.stringify(logEntry));
    }
  }

  // Log API request
  logRequest(req) {
    this.info('API request received', {
      method: req.method,
      url: req.url,
      headers: this._sanitizeHeaders(req.headers),
      query: req.query,
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    });
  }

  // Log API response
  logResponse(statusCode, data = null) {
    this.info('API response sent', {
      statusCode,
      responseSize: data ? JSON.stringify(data).length : 0,
      duration: Date.now() - this.startTime
    });
  }

  // Log rate limit events
  logRateLimit(userId, allowed, limit, count) {
    if (!allowed) {
      this.warn('Rate limit exceeded', {
        userId,
        limit,
        count,
        allowed
      });
    } else {
      this.debug('Rate limit check', {
        userId,
        limit,
        count,
        allowed
      });
    }
  }

  // Log authentication events
  logAuth(success, userId = null, error = null) {
    if (success) {
      this.info('Authentication successful', { userId });
    } else {
      this.warn('Authentication failed', { 
        userId, 
        error: error ? error.message : 'Unknown error' 
      });
    }
  }

  // Log external API calls
  logExternalAPI(service, endpoint, success, duration, error = null) {
    const message = `External API call to ${service}`;
    const data = {
      service,
      endpoint,
      success,
      duration
    };

    if (success) {
      this.info(message, data);
    } else {
      this.error(message, error, data);
    }
  }
}

// Middleware to add logging to Vercel functions
function withLogging(functionName, handler) {
  return async (req, res) => {
    const logger = new Logger(functionName);
    
    // Add logger to request for use in handler
    req.logger = logger;
    
    // Log incoming request
    logger.logRequest(req);
    
    // Wrap res.json to log responses
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      logger.logResponse(res.statusCode, data);
      return originalJson(data);
    };
    
    // Wrap res.status to track status codes
    const originalStatus = res.status.bind(res);
    res.status = function(code) {
      res.statusCode = code;
      return originalStatus(code);
    };
    
    try {
      // Call the actual handler
      await handler(req, res);
    } catch (error) {
      // Log unhandled errors
      logger.error('Unhandled error in function', error);
      
      // Send error response if not already sent
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal server error',
          requestId: logger.requestId 
        });
      }
    }
  };
}

module.exports = {
  Logger,
  withLogging,
  generateRequestId
};