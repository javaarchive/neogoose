import winston, { Logger } from "winston";

let logger = null;

export function createDefaultLogger(){
    return winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        defaultMeta: { service: 'bot' },
        transports: [
          //
          // - Write all logs with importance level of `error` or less to `error.log`
          // - Write all logs with importance level of `info` or less to `combined.log`
          //
          new winston.transports.File({ filename: 'bot.error.log', level: 'error' }),
          new winston.transports.File({ filename: 'bot.log' }),
          new winston.transports.Console({
            format: winston.format.simple(),
          })
        ],
    });
}

/**
 * 
 *
 * @export
 * @return {winston.Logger} 
 */
export function getDefaultLogger(){
    if(!logger){
        logger = createDefaultLogger();
    }
    return logger;
}